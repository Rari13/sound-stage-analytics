import { useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle, Smartphone, Globe, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerNativeProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

const isIOSNative = (): boolean => {
  return Capacitor.getPlatform() === 'ios';
};

export const QRScannerNative = ({ onScanSuccess, onClose }: QRScannerNativeProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("web");
  const [isLoading, setIsLoading] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-container";

  useEffect(() => {
    const currentPlatform = Capacitor.getPlatform();
    setPlatform(currentPlatform);
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error cleaning up scanner:", err);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const startScan = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // Attendre que le DOM soit prêt
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const element = document.getElementById(scannerContainerId);
      if (!element) {
        throw new Error("Élément de scan introuvable");
      }

      // Créer une nouvelle instance si nécessaire
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      setIsScanning(true);

      // Configuration optimisée pour iOS
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        // Désactiver le zoom pour éviter les problèmes sur iOS
        disableFlip: false,
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" }, // Caméra arrière
        config,
        (decodedText) => {
          // QR Code détecté !
          console.log("QR Code scanné:", decodedText);
          cleanup();
          onScanSuccess(decodedText);
        },
        () => {
          // Ignorer les erreurs de scan (pas de QR code détecté)
        }
      );

      setIsLoading(false);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setIsLoading(false);
      setIsScanning(false);
      
      // Messages d'erreur personnalisés
      if (err.message?.includes("Permission") || err.name === "NotAllowedError") {
        if (isIOSNative()) {
          setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra pour autoriser l'accès.");
        } else {
          setError("❌ Accès caméra refusé. Autorisez l'accès dans les paramètres de votre navigateur.");
        }
      } else if (err.message?.includes("NotFoundError") || err.name === "NotFoundError") {
        setError("❌ Aucune caméra détectée sur cet appareil.");
      } else if (err.message?.includes("NotReadableError") || err.name === "NotReadableError") {
        setError("❌ La caméra est utilisée par une autre application. Fermez les autres apps et réessayez.");
      } else {
        setError(`❌ Erreur: ${err.message || 'Impossible de démarrer la caméra'}`);
      }
    }
  };

  const handleStop = async () => {
    await cleanup();
    onClose();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <span className="font-semibold">Scanner QR Code</span>
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
              <Camera className="h-6 w-6 mr-2" />
            )}
            {isLoading ? "Initialisation..." : "Lancer le Scanner"}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isNativePlatform() ? (
              <>
                <Smartphone className="h-4 w-4" />
                {isIOSNative() ? "iOS" : "Android"} ✅
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Mode Web 🌐
              </>
            )}
          </div>

          {/* Container caché pour le scanner */}
          <div 
            id={scannerContainerId}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zone d'affichage de la caméra */}
          <div 
            id={scannerContainerId}
            className="w-full rounded-xl overflow-hidden bg-black"
            style={{ minHeight: "300px" }}
          />
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Démarrage de la caméra...</span>
            </div>
          )}

          <p className="text-sm text-center text-muted-foreground">
            Pointez la caméra vers le QR code du billet
          </p>

          <Button 
            variant="outline" 
            onClick={handleStop} 
            className="w-full"
          >
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
