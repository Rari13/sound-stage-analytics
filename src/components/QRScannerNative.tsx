import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera as CameraIcon, X, AlertCircle, Smartphone, Globe, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Capacitor } from "@capacitor/core";
import { Camera } from "@capacitor/camera";
import jsQR from "jsqr";

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
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

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

  const startQRScanning = useCallback(() => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || !streamRef.current) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });
      
      if (code) {
        cleanup();
        onScanSuccess(code.data);
      }
    };
    
    // Scanner à 10 FPS
    scanIntervalRef.current = window.setInterval(scanFrame, 100);
  }, [cleanup, onScanSuccess]);

  const startScan = async () => {
    setError(null);
    setIsLoading(true);
    setIsScanning(true);

    const hasPermission = await requestCameraPermissions();
    if (!hasPermission) {
      setError("❌ Accès caméra refusé. Allez dans Réglages > Spark Events > Caméra.");
      setIsLoading(false);
      setIsScanning(false);
      return;
    }

    try {
      // Attendre que le DOM soit prêt avec l'élément vidéo
      await new Promise(resolve => setTimeout(resolve, 300));

      // Configuration optimisée pour iOS WebView - résolution plus basse pour compatibilité
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { exact: "environment" },
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: false,
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        // Fallback si la caméra arrière n'est pas disponible
        console.log("Fallback to any camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      }
      
      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        throw new Error("Élément vidéo non disponible");
      }

      // CRUCIAL pour iOS: configurer TOUS les attributs AVANT srcObject
      video.setAttribute('autoplay', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('muted', '');
      video.setAttribute('x5-playsinline', '');
      video.setAttribute('x5-video-player-type', 'h5');
      video.setAttribute('x5-video-player-fullscreen', 'true');
      
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      (video as any).webkitPlaysInline = true;
      
      // Assigner le stream
      video.srcObject = stream;
      
      // Forcer le recalcul du layout
      video.style.display = 'none';
      video.offsetHeight; // Force reflow
      video.style.display = 'block';
      
      // Attendre que les métadonnées soient chargées
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.log("Video metadata timeout, trying to play anyway");
          resolve();
        }, 5000);
        
        video.onloadedmetadata = () => {
          console.log("Video metadata loaded:", video.videoWidth, "x", video.videoHeight);
          clearTimeout(timeout);
          resolve();
        };
        
        video.onerror = (e) => {
          console.error("Video error:", e);
          clearTimeout(timeout);
          reject(new Error("Erreur de chargement vidéo"));
        };
      });

      // Jouer la vidéo
      try {
        await video.play();
        console.log("Video playing successfully");
      } catch (playErr) {
        console.error("Play error:", playErr);
        // Sur iOS, on peut parfois ignorer cette erreur car la vidéo joue quand même
      }
      
      setIsLoading(false);
      
      // Démarrer le scan QR avec jsQR après un court délai
      setTimeout(() => {
        startQRScanning();
      }, 500);
      
    } catch (err: any) {
      console.error("Scanner error:", err);
      cleanup();
      setIsLoading(false);
      setError(`❌ Erreur: ${err.message || 'Impossible de démarrer la caméra'}`);
    }
  };

  const handleStop = () => {
    cleanup();
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
        </div>
      ) : (
        <div className="space-y-4">
          <div 
            className="relative w-full rounded-xl overflow-hidden" 
            style={{ 
              minHeight: "350px", 
              height: "350px",
              backgroundColor: "#000" 
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              webkit-playsinline="true"
              x5-playsinline="true"
              x5-video-player-type="h5"
              x5-video-player-fullscreen="true"
              style={{ 
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
                transform: "translateZ(0)", // Force GPU acceleration
                WebkitTransform: "translateZ(0)",
              }}
            />
            {/* Canvas caché pour l'analyse QR */}
            <canvas ref={canvasRef} style={{ display: "none" }} />
            
            {/* Overlay de visée */}
            <div 
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <div className="relative w-48 h-48">
                <div className="absolute inset-0 border-2 border-white/30 rounded-lg" />
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg" />
              </div>
            </div>
          </div>
          
          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Démarrage de la caméra...</span>
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
