import { useEffect, useState, useRef, useCallback } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Camera as CameraIcon, X, AlertCircle, Loader2, Zap } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import jsQR from "jsqr";

interface QRScannerNativeProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
}

export const QRScannerNative = ({ onScanSuccess, onClose }: QRScannerNativeProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | null>(null);

  // Nettoyer les ressources
  const cleanup = useCallback(() => {
    console.log("[Scanner HTML5] Cleanup...");
    
    // Arrêter l'animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Arrêter le flux vidéo
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("[Scanner HTML5] Track stopped:", track.kind);
      });
      streamRef.current = null;
    }
    
    // Nettoyer la vidéo
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsScanning(false);
    setIsLoading(false);
  }, []);

  // Cleanup au démontage
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Boucle de scan QR
  const scanQRCode = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }
    
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      animationRef.current = requestAnimationFrame(scanQRCode);
      return;
    }
    
    // Adapter le canvas à la taille de la vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Dessiner l'image de la vidéo sur le canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Récupérer les données de l'image
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Décoder le QR code avec jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    });
    
    if (code && code.data) {
      console.log("[Scanner HTML5] QR Code détecté:", code.data);
      
      // Vibration feedback (si supporté)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      // Arrêter le scan et appeler le callback
      cleanup();
      onScanSuccess(code.data);
      return;
    }
    
    // Continuer à scanner
    animationRef.current = requestAnimationFrame(scanQRCode);
  }, [cleanup, onScanSuccess]);

  // Démarrer le scan
  const startScan = async () => {
    console.log("[Scanner HTML5] Starting scan...");
    setError(null);
    setIsLoading(true);

    try {
      // Demander l'accès à la caméra arrière
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" }, // Caméra arrière
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      console.log("[Scanner HTML5] Requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      console.log("[Scanner HTML5] Camera access granted");
      
      // Attacher le flux à la vidéo
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Attendre que la vidéo soit prête
        videoRef.current.onloadedmetadata = () => {
          console.log("[Scanner HTML5] Video metadata loaded");
          videoRef.current?.play().then(() => {
            console.log("[Scanner HTML5] Video playing");
            setIsScanning(true);
            setIsLoading(false);
            
            // Démarrer la boucle de scan
            animationRef.current = requestAnimationFrame(scanQRCode);
          }).catch(err => {
            console.error("[Scanner HTML5] Video play error:", err);
            setError("❌ Impossible de démarrer la vidéo");
            cleanup();
          });
        };
      }
      
    } catch (err: any) {
      console.error("[Scanner HTML5] Camera error:", err);
      cleanup();
      
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setError("❌ Accès caméra refusé. Allez dans Réglages > Safari > Caméra et autorisez l'accès.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setError("❌ Aucune caméra trouvée sur cet appareil.");
      } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        setError("❌ La caméra est utilisée par une autre application.");
      } else {
        setError(`❌ Erreur: ${err.message || "Impossible d'accéder à la caméra"}`);
      }
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
          <div className="bg-primary/10 p-2 rounded-full">
            <CameraIcon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-lg">Scanner de Billets</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={handleStop} 
          className="rounded-full hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isScanning && !isLoading ? (
        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground text-sm">
              Scannez les QR codes des billets
            </p>
          </div>
          <Button
            onClick={startScan}
            className="w-full h-16 text-xl font-bold shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
          >
            <CameraIcon className="h-6 w-6 mr-3" />
            Ouvrir la Caméra
          </Button>
          
          <div className="flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground/60 uppercase tracking-wider">
            <Zap className="h-3 w-3" />
            Détection instantanée
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Zone de prévisualisation de la caméra */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <p className="text-white text-sm">Initialisation de la caméra...</p>
                </div>
              </div>
            )}
            
            {/* Vidéo de la caméra */}
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            
            {/* Canvas caché pour le traitement */}
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Overlay de visée */}
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-64 h-64">
                  {/* Coins animés */}
                  <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl animate-pulse" />
                  <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl animate-pulse" />
                  <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl animate-pulse" />
                  <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl animate-pulse" />
                  
                  {/* Ligne de scan animée */}
                  <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                </div>
              </div>
            )}
            
            {/* Instruction */}
            {isScanning && (
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="bg-black/50 backdrop-blur-sm text-white text-xs font-medium py-2 px-4 rounded-full">
                  Cadrez le QR code dans la zone
                </span>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            onClick={handleStop} 
            className="w-full h-12 font-semibold"
          >
            Arrêter le scan
          </Button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
        .animate-scan-line {
          animation: scan-line 2s ease-in-out infinite;
        }
      `}} />
    </Card>
  );
};
