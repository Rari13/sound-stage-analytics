import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle, Shield, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

const isSecureContext = (): boolean => {
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

const isMediaDevicesSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsHttpsRedirect, setNeedsHttpsRedirect] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    if (!isSecureContext()) {
      setNeedsHttpsRedirect(true);
    }
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleHttpsRedirect = () => {
    const httpsUrl = window.location.href.replace('http:', 'https:');
    window.location.href = httpsUrl;
  };

  const startScanner = async () => {
    if (isScanning || isInitializing) return;
    
    setError(null);
    setIsInitializing(true);

    if (!isSecureContext()) {
      setNeedsHttpsRedirect(true);
      setError("⚠️ Safari iOS nécessite HTTPS.");
      setIsInitializing(false);
      return;
    }

    if (!isMediaDevicesSupported()) {
      setError("❌ L'API caméra n'est pas disponible.");
      setIsInitializing(false);
      return;
    }

    try {
      // Ensure element exists
      const element = document.getElementById("qr-reader");
      if (!element) {
        // If element not found, retry once after a short delay
        await new Promise(resolve => setTimeout(resolve, 300));
        if (!document.getElementById("qr-reader")) {
          throw new Error("Élément de scan introuvable dans le DOM");
        }
      }

      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      await scannerRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
          stopScanner();
        },
        () => { /* ignore errors */ }
      );
      
      setIsScanning(true);
    } catch (err: any) {
      console.error("Scanner error:", err);
      setError(`❌ Erreur: ${err.message || "Impossible de démarrer la caméra"}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error("Stop error:", err);
      }
    }
    setIsScanning(false);
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Scanner QR Code
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {needsHttpsRedirect && (
        <Alert className="border-amber-500 bg-amber-50">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription>
            <p className="font-medium mb-2">🔒 HTTPS requis</p>
            <Button onClick={handleHttpsRedirect} size="sm" className="w-full bg-amber-600">
              Passer en HTTPS
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && !needsHttpsRedirect && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative">
        <div 
          id="qr-reader" 
          className={`w-full rounded-lg overflow-hidden bg-black ${!isScanning ? 'hidden' : ''}`}
          style={{ minHeight: "300px" }}
        />
        
        {!isScanning && (
          <div className="py-8 space-y-4">
            <Button
              onClick={startScanner}
              className="w-full h-16 text-lg"
              variant="accent"
              disabled={isInitializing || needsHttpsRedirect}
            >
              {isInitializing ? (
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
              ) : (
                <Camera className="h-6 w-6 mr-2" />
              )}
              {isInitializing ? "Initialisation..." : "Ouvrir la caméra"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              💡 Autorisez l'accès à la caméra quand demandé
            </p>
          </div>
        )}

        {isScanning && (
          <Button onClick={stopScanner} variant="outline" className="w-full mt-4">
            Arrêter le scan
          </Button>
        )}
      </div>
    </Card>
  );
};
