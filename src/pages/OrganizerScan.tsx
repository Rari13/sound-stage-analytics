import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Scan, Plus, Smartphone, CheckCircle2, XCircle, AlertCircle, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QRScanner } from "@/components/QRScanner";

const OrganizerScan = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [devices, setDevices] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [sessionActive, setSessionActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [scanResult, setScanResult] = useState<any>(null);
  const [organizerId, setOrganizerId] = useState<string>("");
  const [scannedCount, setScannedCount] = useState(0);
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadOrganizerData();
  }, [user]);

  const loadOrganizerData = async () => {
    if (!user) return;

    // Get organizer
    const { data: orgData } = await supabase
      .from('organizers')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (!orgData) return;
    setOrganizerId(orgData.id);

    // Load devices
    const { data: devicesData } = await supabase
      .from('scan_devices')
      .select('*')
      .eq('organizer_id', orgData.id)
      .order('created_at', { ascending: false });

    setDevices(devicesData || []);

    // Load events (today and future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', orgData.id)
      .eq('status', 'published')
      .gte('starts_at', today.toISOString())
      .order('starts_at', { ascending: true });

    setEvents(eventsData || []);
  };

  const createDevice = async () => {
    if (!organizerId) return;

    const deviceName = prompt("Nom de l'appareil de scan :");
    if (!deviceName) return;

    setLoading(true);
    const deviceKey = crypto.randomUUID();

    const { error } = await supabase
      .from('scan_devices')
      .insert({
        organizer_id: organizerId,
        name: deviceName,
        device_key: deviceKey,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Appareil créé",
        description: `Clé: ${deviceKey}`,
      });
      await loadOrganizerData();
    }
    setLoading(false);
  };

  const startSession = async () => {
    if (!selectedEvent || !selectedDevice || !user) return;

    setLoading(true);
    const { error } = await supabase
      .from('scan_sessions')
      .insert({
        organizer_id: organizerId,
        event_id: selectedEvent,
        device_id: selectedDevice,
        created_by: user.id,
        is_active: true,
      });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setSessionActive(true);
      toast({
        title: "Session démarrée",
        description: "Vous pouvez maintenant scanner des billets",
      });
    }
    setLoading(false);
  };

  const validateTicket = async (qrToken: string) => {
    if (!selectedEvent || !selectedDevice) return;

    const device = devices.find(d => d.id === selectedDevice);
    if (!device) return;

    setScanResult(null);
    setLoading(true);

    const { data, error } = await supabase.rpc('validate_ticket', {
      p_qr_token: qrToken,
      p_event_id: selectedEvent,
      p_device_key: device.device_key,
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
    setLoading(false);
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

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="container mx-auto max-w-4xl space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Scanner de billets</h1>
            <p className="text-muted-foreground">Validation en temps réel</p>
          </div>
          <Button variant="ghost" onClick={() => navigate("/orga/home")}>
            ← Retour
          </Button>
        </div>

        {/* Devices Section */}
        <Card className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Appareils de scan
            </h2>
            <Button onClick={createDevice} disabled={loading} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nouvel appareil
            </Button>
          </div>
          
          {devices.length > 0 ? (
            <div className="space-y-2">
              {devices.map(device => (
                <div key={device.id} className="p-3 border rounded-lg flex justify-between items-center">
                  <span className="font-medium">{device.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {device.last_seen ? `Vu le ${new Date(device.last_seen).toLocaleString()}` : 'Jamais utilisé'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">
              Aucun appareil configuré
            </p>
          )}
        </Card>

        {/* Session Section */}
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Scan className="h-5 w-5" />
            Session de scan
          </h2>

          {!sessionActive ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Événement</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title} - {new Date(event.starts_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Appareil</Label>
                <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un appareil" />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.map(device => (
                      <SelectItem key={device.id} value={device.id}>
                        {device.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={startSession} 
                disabled={!selectedEvent || !selectedDevice || loading}
                className="w-full"
                variant="hero"
                size="lg"
              >
                Démarrer la session
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-primary text-primary-foreground p-4 rounded-lg text-center">
                <p className="text-lg font-bold">Session active</p>
                <p className="text-sm">Billets scannés : {scannedCount}</p>
              </div>

              {!showScanner ? (
                <>
                  <Button
                    onClick={() => setShowScanner(true)}
                    variant="hero"
                    size="lg"
                    className="w-full mb-4"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Scanner avec la caméra
                  </Button>

                  <form onSubmit={handleManualScan} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ou saisir manuellement</Label>
                      <Input
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="Code QR du billet"
                        className="h-14 text-lg"
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg" disabled={loading || !manualCode.trim()}>
                      {loading ? "Validation..." : "Valider"}
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

              {scanResult && (
                <Card className={`p-6 ${
                  scanResult.result === 'OK' 
                    ? 'bg-green-500/10 border-green-500' 
                    : 'bg-red-500/10 border-red-500'
                }`}>
                  <div className="flex items-center gap-3">
                    {scanResult.result === 'OK' ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : scanResult.result === 'ALREADY_USED' ? (
                      <AlertCircle className="h-8 w-8 text-orange-500" />
                    ) : (
                      <XCircle className="h-8 w-8 text-red-500" />
                    )}
                    <div>
                      <p className="font-bold text-lg">
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
          )}
        </Card>
      </div>
    </div>
  );
};

export default OrganizerScan;
