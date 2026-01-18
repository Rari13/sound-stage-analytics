import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, X, AlertCircle, Shield } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

// Check if we're in a secure context (HTTPS or localhost)
const isSecureContext = (): boolean => {
  return window.isSecureContext || 
         window.location.protocol === 'https:' || 
         window.location.hostname === 'localhost' ||
         window.location.hostname === '127.0.0.1';
};

// Check if MediaDevices API is available
const isMediaDevicesSupported = (): boolean => {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
};

export const QRScanner = ({ onScanSuccess, onClose }: QRScannerProps) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsHttpsRedirect, setNeedsHttpsRedirect] = useState(false);

  useEffect(() => {
    // Check secure context on mount
    if (!isSecureContext()) {
      setNeedsHttpsRedirect(true);
    }
    
    return () => {
      handleStop();
    };
  }, []);

  const handleHttpsRedirect = () => {
    const httpsUrl = window.location.href.replace('http:', 'https:');
    window.location.href = httpsUrl;
  };

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

    // Check secure context (critical for iOS Safari)
    if (!isSecureContext()) {
      setNeedsHttpsRedirect(true);
      setError("⚠️ Safari iOS nécessite HTTPS. Cliquez sur 'Passer en HTTPS' ci-dessous.");
      return;
    }

    // Check MediaDevices API availability
    if (!isMediaDevicesSupported()) {
      setError("❌ L'API caméra n'est pas disponible sur ce navigateur. Utilisez Safari ou Chrome.");
      return;
    }

    try {
      // Initialize scanner
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode("qr-reader");
      }

      // Start scanning with back camera (environment) - iOS compatible config
      await scannerRef.current.start(
        { facingMode: "environment" }, // Back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
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
        setError("❌ Accès caméra refusé. Sur iOS: Réglages > Safari > Caméra > Autoriser");
      } else if (err.name === 'NotFoundError') {
        setError("❌ Aucune caméra détectée sur cet appareil.");
      } else if (err.name === 'NotReadableError') {
        setError("❌ Caméra déjà utilisée. Fermez les autres apps et réessayez.");
      } else if (err.name === 'OverconstrainedError') {
        setError("❌ La caméra ne supporte pas les paramètres demandés.");
      } else if (err.name === 'SecurityError') {
        setError("❌ Erreur de sécurité. Assurez-vous d'utiliser HTTPS.");
        setNeedsHttpsRedirect(true);
      } else {
        setError(`❌ Erreur: ${err.message || "Vérifiez que vous êtes en HTTPS"}`);
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

      {/* HTTPS Redirect Alert */}
      {needsHttpsRedirect && (
        <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="font-medium mb-2">🔒 Connexion sécurisée requise</p>
            <p className="text-sm mb-3">Safari iOS exige HTTPS pour accéder à la caméra.</p>
            <Button 
              onClick={handleHttpsRedirect} 
              size="sm" 
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              <Shield className="h-4 w-4 mr-2" />
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

      {!isScanning ? (
        <div className="space-y-4">
          <Button
            onClick={handleStartScan}
            className="w-full"
            size="lg"
            variant="accent"
            disabled={needsHttpsRedirect}
          >
            <Camera className="h-5 w-5 mr-2" />
            📸 Ouvrir la caméra
          </Button>
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="text-center">💡 Sur Safari iOS:</p>
            <p className="text-center">1. Utilisez le lien HTTPS publié</p>
            <p className="text-center">2. Autorisez la caméra quand demandé</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            id="qr-reader" 
            className="w-full rounded-lg overflow-hidden bg-black"
            style={{ minHeight: "350px" }}
          />
          <p className="text-sm text-center text-muted-foreground">
            🎯 Placez le QR code dans le cadre
          </p>
          <Button onClick={handleStop} variant="outline" className="w-full">
            ⏹️ Arrêter le scan
          </Button>
        </div>
      )}
    </Card>
  );
};
