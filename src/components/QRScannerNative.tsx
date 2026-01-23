import { useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera as CameraIcon, X, AlertCircle, Smartphone, Globe, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
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

  const requestCameraPermissions = async (): Promise<boolean> => {
    if (!isNativePlatform()) return true;
    
    try {
      const status = await Camera.checkPermissions();
      if (status.camera === 'granted') return true;
      
      const requestStatus = await Camera.requestPermissions({ permissions: ['camera'] });
      return requestStatus.camera === 'granted';
    } catch (err) {
      console.error("Error requesting camera permissions:", err);
      return false;
    }
  };

  const startScan = async () => {
    setError(null);
    setIsLoading(true);

    // 1. Demander les permissions via le plugin Camera (plus fiable sur iOS)
    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra.");
      setIsLoading(false);
      return;
    }

    try {
      // Attendre que le DOM soit prêt
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const element = document.getElementById(scannerContainerId);
      if (!element) {
        throw new Error("Élément de scan introuvable");
      }

      // Créer une nouvelle instance
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);
      }

      setIsScanning(true);

      // Configuration spécifique pour iOS natif
      const config = {
        fps: 15,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        videoConstraints: {
          facingMode: "environment",
          // Forcer playsinline via les contraintes si possible
        }
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          cleanup();
          onScanSuccess(decodedText);
        },
        () => { /* ignore scan errors */ }
      );

      // 2. CRUCIAL POUR IOS : Forcer les attributs sur l'élément vidéo créé par html5-qrcode
      setTimeout(() => {
        const videoElement = element.querySelector('video');
        if (videoElement) {
          videoElement.setAttribute('playsinline', 'true');
          videoElement.setAttribute('webkit-playsinline', 'true');
          videoElement.setAttribute('muted', 'true');
          videoElement.play().catch(e => console.error("Auto-play failed:", e));
        }
      }, 500);

      setIsLoading(false);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setIsLoading(false);
      setIsScanning(false);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer la caméra'}`);
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
          <CameraIcon className="h-5 w-5 text-primary" />
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
              <CameraIcon className="h-6 w-6 mr-2" />
            )}
            {isLoading ? "Initialisation..." : "Lancer le Scanner"}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isNativePlatform() ? (
              <>
                <Smartphone className="h-4 w-4" />
                {isIOSNative() ? "iOS Natif" : "Android Natif"} ✅
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Mode Web 🌐
              </>
            )}
          </div>

          <div id={scannerContainerId} className="hidden" />
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id={scannerContainerId}
            className="w-full rounded-xl overflow-hidden bg-black"
            style={{ minHeight: "300px" }}
          />
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Démarrage...</span>
            </div>
          )}

          <Button variant="outline" onClick={handleStop} className="w-full">
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
