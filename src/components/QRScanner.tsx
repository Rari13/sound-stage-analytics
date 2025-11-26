import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      handleStop();
    };
  }, []);

  const handleStop = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleStartScan = async () => {
    setError(null);

    try {
      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      // Start scanning with back camera (environment)
      await scannerRef.current.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          handleStop();
        },
        (errorMessage) => {
          // Error callback - ignore "no QR found" errors
          if (!errorMessage.includes("NotFoundException")) {
            console.debug("QR scan error:", errorMessage);
          }
        }
      );
      
      setIsScanning(true);
      setError(null);
    } catch (err: any) {
      console.error("Camera start error:", err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("❌ Accès caméra refusé. Autorisez l'accès et rechargez la page.");
      } else if (err.name === 'NotFoundError') {
        setError("❌ Aucune caméra détectée sur cet appareil.");
      } else if (err.name === 'NotReadableError') {
        setError("❌ Caméra déjà utilisée par une autre app. Fermez les autres apps.");
      } else {
        setError(`❌ Erreur: ${err.message || "Impossible d'accéder à la caméra"}`);
      }
      
      setIsScanning(false);
    }
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
            className="w-full"
            size="lg"
            variant="hero"
          >
            <Camera className="h-5 w-5 mr-2" />
            📸 Ouvrir la caméra
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            💡 Autorisez l'accès à la caméra dans votre navigateur
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            className="w-full rounded-lg overflow-hidden bg-black"
            style={{ minHeight: "300px" }}
          />
          <Button onClick={handleStop} variant="outline" className="w-full">
            ⏹️ Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
