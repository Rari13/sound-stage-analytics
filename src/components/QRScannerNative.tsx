import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle, Smartphone, Globe, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-community/barcode-scanner";

interface QRScannerNativeProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

const isSecureContext = (): boolean => {
  if (typeof window === "undefined") return true;
  return (
    window.isSecureContext ||
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  );
};

export const QRScannerNative = ({ onScanSuccess, onClose }: QRScannerNativeProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>("web");
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentPlatform = Capacitor.getPlatform();
    setPlatform(currentPlatform);
    
    return () => {
      if (isNativePlatform()) {
        stopNativeScan();
      }
    };
  }, []);

  const checkPermissions = async (): Promise<boolean> => {
    if (!isNativePlatform()) return true;

    try {
      const status = await BarcodeScanner.checkPermission({ force: true });
      
      if (status.granted) {
        setPermissionGranted(true);
        return true;
      }
      
      if (status.denied) {
        setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra.");
        setPermissionGranted(false);
        return false;
      }

      // Request permission
      const requestStatus = await BarcodeScanner.checkPermission({ force: true });
      if (requestStatus.granted) {
        setPermissionGranted(true);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error("Permission error:", err);
      setError("Erreur lors de la vérification des permissions");
      return false;
    }
  };

  const startNativeScan = async () => {
    setError(null);
    setIsLoading(true);
    
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      setIsLoading(false);
      return;
    }

    try {
      setIsScanning(true);
      
      // Make background transparent for camera view
      document.body.classList.add("scanner-active");
      await BarcodeScanner.hideBackground();
      document.body.style.background = "transparent";

      const result = await BarcodeScanner.startScan();

      if (result.hasContent && result.content) {
        stopNativeScan();
        onScanSuccess(result.content);
      }
    } catch (err: any) {
      console.error("Native scan error:", err);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer le scanner'}`);
      stopNativeScan();
    } finally {
      setIsLoading(false);
    }
  };

  const stopNativeScan = async () => {
    try {
      await BarcodeScanner.showBackground();
      await BarcodeScanner.stopScan();
      document.body.classList.remove("scanner-active");
      document.body.style.background = "";
    } catch (err) {
      console.error("Error stopping scan:", err);
    }
    setIsScanning(false);
  };

  const handleStartScan = async () => {
    if (isNativePlatform()) {
      await startNativeScan();
    } else {
      // On web, show message to use native app
      if (!isSecureContext()) {
        setError("⚠️ HTTPS requis pour le scanner web. Utilisez l'application native sur iPhone.");
      } else {
        setError("⚠️ Pour une meilleure expérience sur iPhone, utilisez l'application native.");
      }
    }
  };

  const handleStop = async () => {
    if (isNativePlatform()) {
      await stopNativeScan();
    }
    onClose();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          <span className="font-semibold">Scanner Mobile</span>
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
            onClick={handleStartScan}
            className="w-full h-14 text-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-6 w-6 mr-2 animate-spin" />
            ) : (
              <Camera className="h-6 w-6 mr-2" />
            )}
            Lancer le Scanner
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isNativePlatform() ? (
              <>
                <Smartphone className="h-4 w-4" />
                Mode App Native détecté ✅
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Mode Web détecté 🌐
              </>
            )}
          </div>
          
          <p className="text-xs text-center text-muted-foreground">
            Plateforme: {platform}
          </p>
        </div>
      ) : (
        <div className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
          <p className="text-lg font-medium">Scan en cours...</p>
          <p className="text-sm text-muted-foreground">
            Pointez la caméra vers le QR code
          </p>
          <Button variant="outline" onClick={handleStop}>
            Arrêter
          </Button>
        </div>
      )}
    </Card>
  );
};
