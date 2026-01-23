import { useEffect, useState, useRef } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle, Smartphone, Globe, Loader2, Settings } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { BarcodeScanner } from "@capacitor-community/barcode-scanner";
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
  const [useWebFallback, setUseWebFallback] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const currentPlatform = Capacitor.getPlatform();
    setPlatform(currentPlatform);
    
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = async () => {
    // Cleanup native scanner
    if (isNativePlatform()) {
      try {
        document.body.classList.remove("scanner-active");
        document.body.style.background = "";
        await BarcodeScanner.showBackground();
        await BarcodeScanner.stopScan();
      } catch (err) {
        console.error("Error cleaning up native scanner:", err);
      }
    }
    
    // Cleanup web scanner
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch (err) {
        console.error("Error cleaning up web scanner:", err);
      }
    }
    setIsScanning(false);
  };

  const checkPermissions = async (): Promise<boolean> => {
    if (!isNativePlatform()) return true;

    try {
      const status = await BarcodeScanner.checkPermission({ force: false });
      
      if (status.granted) {
        setPermissionGranted(true);
        return true;
      }
      
      if (status.denied) {
        setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra pour autoriser l'accès.");
        setPermissionGranted(false);
        return false;
      }

      if (status.neverAsked || status.unknown) {
        const requestStatus = await BarcodeScanner.checkPermission({ force: true });
        if (requestStatus.granted) {
          setPermissionGranted(true);
          return true;
        }
        if (requestStatus.denied) {
          setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra.");
          setPermissionGranted(false);
          return false;
        }
      }

      if (status.restricted) {
        setError("⚠️ L'accès à la caméra est restreint sur cet appareil.");
        return false;
      }
      
      return false;
    } catch (err: any) {
      console.error("Permission error:", err);
      setError(`Erreur de permission: ${err.message || 'Vérifiez les réglages'}`);
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
      
      // Prepare UI for camera view
      document.body.classList.add("scanner-active");
      
      // Sur iOS natif, le scanner s'affiche DERRIÈRE la WebView.
      // On doit cacher l'interface web (via CSS .scanner-active) pour voir la caméra.
      await BarcodeScanner.hideBackground();
      
      // Start scanning
      const result = await BarcodeScanner.startScan();

      if (result.hasContent && result.content) {
        await cleanup();
        onScanSuccess(result.content);
      } else {
        await cleanup();
      }
    } catch (err: any) {
      console.error("Native scan error:", err);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer le scanner'}`);
      await cleanup();
    } finally {
      setIsLoading(false);
    }
  };

  const startWebScan = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const element = document.getElementById("qr-reader-native");
      if (!element) {
        throw new Error("Élément de scan introuvable");
      }

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-native");
      }

      setIsScanning(true);

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          cleanup();
          onScanSuccess(decodedText);
        },
        () => { /* ignore errors during scanning */ }
      );
    } catch (err: any) {
      console.error("Web scan error:", err);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer la caméra'}`);
      setIsScanning(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartScan = async () => {
    if (isNativePlatform() && !useWebFallback) {
      await startNativeScan();
    } else {
      if (!isSecureContext()) {
        setError("⚠️ HTTPS requis pour le scanner. Utilisez l'application native ou accédez via HTTPS.");
        return;
      }
      await startWebScan();
    }
  };

  const handleStop = async () => {
    await cleanup();
    onClose();
  };

  const openSettings = () => {
    setError("📱 Pour autoriser la caméra : Ouvrez Réglages > Spark Events > Caméra > Activer");
  };

  const toggleWebFallback = () => {
    setUseWebFallback(!useWebFallback);
    setError(null);
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
          <AlertDescription className="flex flex-col gap-2">
            <span>{error}</span>
            {permissionGranted === false && isIOSNative() && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={openSettings}
                className="w-full mt-2"
              >
                <Settings className="h-4 w-4 mr-2" />
                Comment autoriser la caméra
              </Button>
            )}
          </AlertDescription>
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
            {isLoading ? "Initialisation..." : "Lancer le Scanner"}
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            {isNativePlatform() ? (
              <>
                <Smartphone className="h-4 w-4" />
                {isIOSNative() ? "iOS" : "Android"} - Mode {useWebFallback ? "Web" : "Natif"} ✅
              </>
            ) : (
              <>
                <Globe className="h-4 w-4" />
                Mode Web 🌐
              </>
            )}
          </div>
          
          {isNativePlatform() && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleWebFallback}
              className="w-full text-xs text-muted-foreground"
            >
              {useWebFallback ? "Utiliser le scanner natif" : "Problème ? Essayer le mode web"}
            </Button>
          )}

          <div 
            id="qr-reader-native" 
            className={`w-full rounded-lg overflow-hidden bg-black ${useWebFallback ? '' : 'hidden'}`}
            style={{ minHeight: useWebFallback ? "300px" : "0" }}
          />
        </div>
      ) : (
        <div className="text-center space-y-4 py-8">
          {useWebFallback ? (
            <div 
              id="qr-reader-native" 
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: "300px" }}
            />
          ) : (
            <>
              <div className="flex items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <p className="text-lg font-medium">Scan en cours...</p>
              <p className="text-sm text-muted-foreground">
                Pointez la caméra vers le QR code
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                (L'interface va devenir invisible pour laisser voir la caméra)
              </p>
            </>
          )}
          <Button variant="outline" onClick={handleStop} className="mt-4">
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
