import { useEffect, useState, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera as CameraIcon, X, AlertCircle, Smartphone, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { CameraView } from 'capacitor-camera-view';

interface QRScannerNativeProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const isIOSNative = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const QRScannerNative = ({ onScanSuccess, onClose }: QRScannerNativeProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanup = useCallback(async () => {
    try {
      // Retirer la classe de transparence
      document.body.classList.remove('camera-running');
      
      // Arrêter le plugin de caméra
      await CameraView.stop();
      
      // Supprimer tous les écouteurs d'événements
      await CameraView.removeAllListeners();
      
      setIsScanning(false);
    } catch (err) {
      console.error("Error during cleanup:", err);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const startScan = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // 1. Ajouter l'écouteur pour la détection de code-barres
      await CameraView.addListener('barcodeDetected', (data: any) => {
        if (data && data.value) {
          console.log('Barcode detected:', data.value);
          cleanup();
          onScanSuccess(data.value);
        }
      });

      // 2. Démarrer la caméra avec détection de code-barres
      await CameraView.start({ 
        enableBarcodeDetection: true,
        position: 'rear' // Utiliser la caméra arrière par défaut
      });

      // 3. Rendre la WebView transparente pour voir la caméra en dessous
      document.body.classList.add('camera-running');
      
      setIsScanning(true);
      setIsLoading(false);
    } catch (err: any) {
      console.error("Scanner error:", err);
      cleanup();
      setIsLoading(false);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer la caméra native'}`);
    }
  };

  const handleStop = async () => {
    await cleanup();
    onClose();
  };

  return (
    <Card className="p-4 space-y-4 bg-background/80 backdrop-blur-sm relative z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CameraIcon className="h-5 w-5 text-primary" />
          <span className="font-semibold">Scanner QR Code (Natif)</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleStop}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isScanning ? (
        <div className="space-y-4">
          <Button
            onClick={startScan}
            className="w-full h-14 text-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 mr-2 animate-spin" />
            ) : (
              <CameraIcon className="h-6 w-6 mr-2" />
            )}
            {isLoading ? "Initialisation..." : "Lancer le Scanner"}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            {isIOSNative() ? "iOS Natif" : "Android Natif"} ✅
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* 
            Note: Avec capacitor-camera-view, la vidéo est affichée SOUS la WebView.
            On affiche ici un overlay de visée transparent.
          */}
          <div className="relative w-full rounded-xl overflow-hidden border-2 border-primary/50" style={{ minHeight: "300px", backgroundColor: "transparent" }}>
            {/* Overlay de visée */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            </div>
            
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-sm font-medium drop-shadow-md bg-black/20 py-1 px-2 inline-block rounded">
                Placez le QR code dans le cadre
              </p>
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Démarrage de la caméra...</span>
            </div>
          )}

          <Button variant="outline" onClick={handleStop} className="w-full bg-background/50 backdrop-blur-sm">
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
