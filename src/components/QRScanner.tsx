import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X } from "lucide-react";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          handleStop();
        },
        (error) => {
          // Ignore errors, they're mostly "no QR code found"
          console.debug(error);
        }
      );
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

      {!isScanning ? (
        <Button
          onClick={() => setIsScanning(true)}
          className="w-full"
          size="lg"
          variant="hero"
        >
          <Camera className="h-5 w-5 mr-2" />
          Démarrer la caméra
        </Button>
      ) : (
        <div className="space-y-4">
          <div id="qr-reader" className="w-full"></div>
          <Button onClick={handleStop} variant="outline" className="w-full">
            Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
