import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QRScanner } from "@/components/QRScanner";
import { Camera, CheckCircle2, XCircle, AlertCircle, Clock, Scan, Shield } from "lucide-react";

export default function PublicScan() {
  const { token } = useParams<{ token: string }>();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [linkData, setLinkData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [scannedCount, setScannedCount] = useState(0);

  useEffect(() => {
    if (token) {
      validateLink();
    }
  }, [token]);

  const validateLink = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('scan_links')
      .select(`
        *,
        events:event_id (id, title, starts_at, venue, city),
        scan_devices:device_id (id, device_key, name)
      `)
      .eq('token', token)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (fetchError || !data) {
      setError("Lien invalide ou expiré");
      setLoading(false);
      return;
    }

    setLinkData(data);
    setLoading(false);
  };

  const validateTicket = async (qrToken: string) => {
    if (!linkData) return;

    setScanResult(null);
    setValidating(true);

    const { data, error } = await supabase.rpc('validate_ticket', {
      p_qr_token: qrToken,
      p_event_id: linkData.event_id,
      p_device_key: linkData.scan_devices.device_key,
    });

    if (error) {
      setScanResult({ result: 'ERROR', message: error.message });
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const result = data as any;
      setScanResult(result);
      
      if (result?.result === 'OK') {
        setScannedCount(prev => prev + 1);
        toast({
          title: "✅ Billet valide",
          description: "Accès autorisé",
        });
      } else {
        toast({
          title: "❌ Billet refusé",
          description: getErrorMessage(result?.result || 'ERROR'),
          variant: "destructive",
        });
      }
    }
    setValidating(false);
    setManualCode("");
  };

  const getErrorMessage = (result: string) => {
    const messages: Record<string, string> = {
      'ALREADY_USED': 'Ce billet a déjà été scanné',
      'NOT_FOUND': 'Billet introuvable',
      'WRONG_EVENT': 'Ce billet n\'est pas pour cet événement',
      'REVOKED': 'Billet révoqué',
      'EXPIRED': 'Billet expiré',
      'ERROR': 'Erreur de validation',
    };
    return messages[result] || result;
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await validateTicket(manualCode.trim());
  };

  const getTimeRemaining = () => {
    if (!linkData) return "";
    const expires = new Date(linkData.expires_at);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}min`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
        <Card className="p-8 text-center">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Vérification du lien...</p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
        <Card className="p-8 text-center max-w-md">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Lien invalide</h1>
          <p className="text-muted-foreground">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-4">
      <div className="container mx-auto max-w-lg space-y-4">
        {/* Header */}
        <Card className="p-4 bg-primary text-primary-foreground">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-6 w-6" />
            <div className="flex-1">
              <h1 className="font-bold text-lg leading-tight">{linkData.events.title}</h1>
              <p className="text-sm opacity-90">
                {linkData.events.venue} • {linkData.events.city}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>Expire dans {getTimeRemaining()}</span>
            </div>
            <div className="bg-white/20 px-2 py-1 rounded">
              {scannedCount} scannés
            </div>
          </div>
        </Card>

        {/* Scanner */}
        <Card className="p-6 space-y-4">
          {!showScanner ? (
            <>
              <Button
                onClick={() => setShowScanner(true)}
                variant="accent"
                size="lg"
                className="w-full h-16 text-lg"
              >
                <Camera className="h-6 w-6 mr-3" />
                Scanner un billet
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou</span>
                </div>
              </div>

              <form onSubmit={handleManualScan} className="space-y-3">
                <div className="space-y-2">
                  <Label>Code manuel</Label>
                  <Input
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="Entrer le code du billet"
                    className="h-12 text-center text-lg"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg" 
                  disabled={validating || !manualCode.trim()}
                >
                  {validating ? "Validation..." : "Valider"}
                </Button>
              </form>
            </>
          ) : (
            <QRScanner
              onScanSuccess={(code) => {
                setShowScanner(false);
                validateTicket(code);
              }}
              onClose={() => setShowScanner(false)}
            />
          )}
        </Card>

        {/* Result */}
        {scanResult && (
          <Card className={`p-6 ${
            scanResult.result === 'OK' 
              ? 'bg-green-500/10 border-green-500' 
              : 'bg-red-500/10 border-red-500'
          }`}>
            <div className="flex items-center gap-4">
              {scanResult.result === 'OK' ? (
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              ) : scanResult.result === 'ALREADY_USED' ? (
                <AlertCircle className="h-12 w-12 text-orange-500" />
              ) : (
                <XCircle className="h-12 w-12 text-red-500" />
              )}
              <div>
                <p className="font-bold text-xl">
                  {scanResult.result === 'OK' ? 'Billet valide ✓' : getErrorMessage(scanResult.result)}
                </p>
                {scanResult.used_at && (
                  <p className="text-sm text-muted-foreground">
                    Utilisé le {new Date(scanResult.used_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
