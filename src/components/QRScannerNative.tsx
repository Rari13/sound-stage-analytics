import { useEffect, useState, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera as CameraIcon, X, AlertCircle, Smartphone, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-community/barcode-scanner";

interface QRScannerNativeProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScannerNative = ({ onScanSuccess, onClose }: QRScannerNativeProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fonction pour activer la transparence de la page web
  const setWebViewTransparency = (active: boolean) => {
    const elements = [
      document.body,
      document.documentElement,
      document.getElementById('root')
    ];

    elements.forEach(el => {
      if (el) {
        if (active) {
          el.classList.add('scanner-active');
        } else {
          el.classList.remove('scanner-active');
        }
      }
    });

    // Ajouter/retirer une classe sur le body pour le CSS global
    if (active) {
      document.body.style.setProperty('--scanner-active', '1');
    } else {
      document.body.style.removeProperty('--scanner-active');
    }
  };

  const cleanup = useCallback(async () => {
    console.log("[Scanner Native] Cleanup...");
    try {
      setWebViewTransparency(false);
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
    } catch (err) {
      console.error("[Scanner Native] Cleanup error:", err);
    }
    setIsScanning(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const checkPermission = async (): Promise<boolean> => {
    try {
      // Vérifier le statut actuel
      const status = await BarcodeScanner.checkPermission({ force: false });
      
      if (status.granted) {
        return true;
      }
      
      if (status.denied) {
        // L'utilisateur a refusé, on lui demande d'aller dans les réglages
        setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra pour l'activer.");
        return false;
      }
      
      if (status.asked) {
        // On a déjà demandé, on redemande
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        return newStatus.granted || false;
      }
      
      if (status.neverAsked) {
        // Première demande
        const newStatus = await BarcodeScanner.checkPermission({ force: true });
        return newStatus.granted || false;
      }
      
      // Cas par défaut : demander la permission
      const requestStatus = await BarcodeScanner.checkPermission({ force: true });
      return requestStatus.granted || false;
      
    } catch (err) {
      console.error("[Scanner Native] Permission error:", err);
      return false;
    }
  };

  const startScan = async () => {
    console.log("[Scanner Native] Starting scan...");
    setError(null);
    setIsLoading(true);

    // Vérifier qu'on est sur une plateforme native
    if (!Capacitor.isNativePlatform()) {
      setError("❌ Le scanner natif nécessite l'application mobile.");
      setIsLoading(false);
      return;
    }

    // Vérifier les permissions
    const hasPermission = await checkPermission();
    if (!hasPermission) {
      setIsLoading(false);
      return;
    }

    try {
      // Activer la transparence AVANT de lancer le scan
      setWebViewTransparency(true);
      
      // Cacher le fond de la WebView pour voir la caméra
      await BarcodeScanner.hideBackground();
      
      setIsScanning(true);
      setIsLoading(false);

      console.log("[Scanner Native] Starting barcode scan...");
      
      // Lancer le scan - cette fonction attend jusqu'à ce qu'un code soit détecté
      const result = await BarcodeScanner.startScan();
      
      console.log("[Scanner Native] Scan result:", result);
      
      if (result.hasContent && result.content) {
        // Code détecté !
        console.log("[Scanner Native] QR Code detected:", result.content);
        await cleanup();
        onScanSuccess(result.content);
      } else {
        // Scan annulé ou pas de contenu
        await cleanup();
      }
      
    } catch (err: any) {
      console.error("[Scanner Native] Scan error:", err);
      await cleanup();
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer le scanner'}`);
    }
  };

  const handleStop = async () => {
    await cleanup();
    onClose();
  };

  return (
    <Card className={`p-4 space-y-4 scanner-card ${isScanning ? 'scanner-card-active' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-full">
            <CameraIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg">Scanner de Billets</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleStop} 
          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isScanning ? (
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm">
              Scanner natif haute performance
            </p>
          </div>
          <Button
            onClick={startScan}
            className="w-full h-16 text-xl font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 mr-3 animate-spin" />
            ) : (
              <CameraIcon className="h-6 w-6 mr-3" />
            )}
            {isLoading ? "Initialisation..." : "Ouvrir la Caméra"}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            <Smartphone className="h-3 w-3" />
            Mode Natif iOS Optimisé
          </div>
        </div>
      ) : (
        <div className="space-y-6 scanner-ui-visible">
          {/* Zone de visée - visible par-dessus la caméra */}
          <div className="relative w-full aspect-square rounded-3xl overflow-hidden border-4 border-primary/30 bg-transparent">
            {/* Overlay de visée */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-64 h-64">
                {/* Coins animés */}
                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-3xl animate-pulse" />
                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-3xl animate-pulse" />
                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-3xl animate-pulse" />
                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-3xl animate-pulse" />
                
                {/* Ligne de scan animée */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.5)] animate-scan" />
              </div>
            </div>
            
            <div className="absolute bottom-6 left-0 right-0 text-center">
              <span className="bg-black/40 backdrop-blur-md text-white text-xs font-bold py-2 px-4 rounded-full border border-white/20">
                CADREZ LE QR CODE
              </span>
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={handleStop} 
            className="w-full h-12 font-semibold bg-background/80 backdrop-blur-md border-2 hover:bg-background scanner-stop-btn"
          >
            Arrêter le scan
          </Button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}} />
    </Card>
  );
};
