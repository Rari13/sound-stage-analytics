import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      try {
        scannerRef.current = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
          },
          false
        );

        scannerRef.current.render(
          (decodedText) => {
            onScanSuccess(decodedText);
            handleStop();
          },
          (error) => {
            // Ignore "No QR code found" errors
            if (!error.includes("NotFoundException")) {
              console.error("QR Scanner error:", error);
            }
          }
        );
        setError(null);
      } catch (err: any) {
        console.error("Failed to start scanner:", err);
        setError(err.message || "Impossible de démarrer la caméra");
        setIsScanning(false);
      }
    }

    return () => {
      handleStop();
    };
  }, [isScanning]);

  const handleStop = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch((err) => console.error(err));
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleStartScan = async () => {
    setError(null);
    
    // Check for HTTPS on mobile (required for camera access)
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setError("La caméra nécessite une connexion HTTPS sécurisée");
      return;
    }

    // Request camera permission explicitly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop the test stream
      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera permission error:", err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError("Accès à la caméra refusé. Autorisez l'accès dans les paramètres de votre navigateur.");
      } else if (err.name === 'NotFoundError') {
        setError("Aucune caméra trouvée sur cet appareil.");
      } else {
        setError("Impossible d'accéder à la caméra. Vérifiez les permissions.");
      }
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
            Démarrer la caméra
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Autorisez l'accès à la caméra lorsque demandé par votre navigateur
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
          <Button onClick={handleStop} variant="outline" className="w-full">
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
