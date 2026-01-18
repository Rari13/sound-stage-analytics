import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Scan, Plus, Smartphone, CheckCircle2, XCircle, AlertCircle, Camera, Trash2, Link2, Copy, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { QRScannerNative } from "@/components/QRScannerNative";

export default function OrganizerScan() {
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [scanLinks, setScanLinks] = useState<any[]>([]);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadOrganizerData();
  }, [user]);

  const loadOrganizerData = async () => {
    if (!user) return;

    const { data: orgData } = await supabase
      .from('organizers')
      .select('id')
      .eq('owner_user_id', user.id)
      .single();

    if (!orgData) return;
    setOrganizerId(orgData.id);

    const { data: devicesData } = await supabase
      .from('scan_devices')
      .select('*')
      .eq('organizer_id', orgData.id)
      .order('created_at', { ascending: false });

    setDevices(devicesData || []);

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

    const { data: linksData } = await supabase
      .from('scan_links')
      .select(`*, events:event_id (title)`)
      .eq('organizer_id', orgData.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    setScanLinks(linksData || []);
  };

  const createDevice = async () => {
    if (!organizerId) return;

    const deviceName = prompt("Nom de l'appareil :");
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Appareil créé" });
      await loadOrganizerData();
    }
    setLoading(false);
  };

  const deleteDevice = async (deviceId: string, deviceName: string) => {
    if (!confirm(`Supprimer "${deviceName}" ?`)) return;
    
    const { error } = await supabase.from('scan_devices').delete().eq('id', deviceId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Supprimé" });
      await loadOrganizerData();
    }
  };

  const generateScanLink = async () => {
    if (!selectedEvent || !selectedDevice || !organizerId) {
      toast({ title: "Sélectionnez un événement et un appareil", variant: "destructive" });
      return;
    }

    setGeneratingLink(true);
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { data, error } = await supabase
      .from('scan_links')
      .insert({
        organizer_id: organizerId,
        event_id: selectedEvent,
        device_id: selectedDevice,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      const link = `${window.location.origin}/scan/${data.token}`;
      await navigator.clipboard.writeText(link);
      toast({ title: "Lien copié !", description: "Valide 24h" });
      await loadOrganizerData();
    }
    setGeneratingLink(false);
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/scan/${token}`;
    await navigator.clipboard.writeText(link);
    toast({ title: "Copié !" });
  };

  const deactivateLink = async (linkId: string) => {
    await supabase.from('scan_links').update({ is_active: false }).eq('id', linkId);
    toast({ title: "Lien désactivé" });
    await loadOrganizerData();
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
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setSessionActive(true);
      toast({ title: "Session démarrée" });
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
    } else {
      const result = data as any;
      setScanResult(result);
      
      if (result?.result === 'OK') {
        setScannedCount(prev => prev + 1);
        toast({ title: "✅ Billet valide" });
      } else {
        toast({ title: "❌ Refusé", description: getErrorMessage(result?.result || 'ERROR'), variant: "destructive" });
      }
    }
    setLoading(false);
    setManualCode("");
  };

  const getErrorMessage = (result: string) => {
    const messages: Record<string, string> = {
      'ALREADY_USED': 'Déjà scanné',
      'NOT_FOUND': 'Introuvable',
      'WRONG_EVENT': 'Mauvais événement',
      'REVOKED': 'Révoqué',
      'EXPIRED': 'Expiré',
      'ERROR': 'Erreur',
    };
    return messages[result] || result;
  };

  const handleManualScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await validateTicket(manualCode.trim());
  };

  // Active session view - full screen mobile optimized
  if (sessionActive) {
    return (
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="bg-primary text-primary-foreground p-4 text-center safe-area-top">
          <p className="font-bold text-lg">Session active</p>
          <p className="text-sm opacity-90">{scannedCount} billet{scannedCount !== 1 ? 's' : ''} scanné{scannedCount !== 1 ? 's' : ''}</p>
        </div>

        {/* Result display */}
        {scanResult && (
          <div className={`p-6 text-center ${
            scanResult.result === 'OK' 
              ? 'bg-green-500 text-white' 
              : 'bg-red-500 text-white'
          }`}>
            <div className="flex items-center justify-center gap-3">
              {scanResult.result === 'OK' ? (
                <CheckCircle2 className="h-12 w-12" />
              ) : scanResult.result === 'ALREADY_USED' ? (
                <AlertCircle className="h-12 w-12" />
              ) : (
                <XCircle className="h-12 w-12" />
              )}
              <span className="text-2xl font-bold">
                {scanResult.result === 'OK' ? 'VALIDE ✓' : getErrorMessage(scanResult.result)}
              </span>
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col p-4 gap-4 overflow-auto">
          {showScanner ? (
            <div className="flex-1">
              <QRScannerNative
                onScanSuccess={(code) => {
                  setShowScanner(false);
                  validateTicket(code);
                }}
                onClose={() => setShowScanner(false)}
              />
            </div>
          ) : (
            <>
              {/* Camera button - large and centered */}
              <Button
                onClick={() => setShowScanner(true)}
                size="lg"
                className="h-20 text-xl font-bold"
              >
                <Camera className="h-8 w-8 mr-3" />
                Scanner
              </Button>

              {/* Manual input */}
              <form onSubmit={handleManualScan} className="space-y-3">
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Code manuel..."
                  className="h-14 text-lg text-center"
                />
                <Button 
                  type="submit" 
                  variant="secondary"
                  className="w-full h-12" 
                  disabled={loading || !manualCode.trim()}
                >
                  Valider
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t safe-area-bottom">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setSessionActive(false)}
          >
            Terminer la session
          </Button>
        </div>
      </div>
    );
  }

  // Setup view
  return (
    <div className="space-y-4 pb-24">
      <div>
        <h1 className="text-xl font-bold">Scanner</h1>
        <p className="text-sm text-muted-foreground">Validation des billets</p>
      </div>

      {/* Quick start */}
      <Card className="p-4 space-y-4">
        <h2 className="font-semibold flex items-center gap-2">
          <Scan className="h-4 w-4" />
          Démarrer une session
        </h2>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Événement</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Appareil</Label>
            <Select value={selectedDevice} onValueChange={setSelectedDevice}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Sélectionner..." />
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

          <div className="flex gap-2">
            <Button 
              onClick={startSession} 
              disabled={!selectedEvent || !selectedDevice || loading}
              className="flex-1 h-12"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scanner ici
            </Button>
            <Button 
              onClick={generateScanLink} 
              disabled={!selectedEvent || !selectedDevice || generatingLink}
              variant="outline"
              className="h-12"
            >
              <Link2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Devices - collapsible */}
      <Card className="overflow-hidden">
        <button 
          className="w-full p-4 flex items-center justify-between text-left"
          onClick={() => setShowDevices(!showDevices)}
        >
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="font-semibold">Appareils ({devices.length})</span>
          </div>
          {showDevices ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        
        {showDevices && (
          <div className="px-4 pb-4 space-y-2">
            {devices.map(device => (
              <div key={device.id} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium truncate">{device.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => deleteDevice(device.id, device.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button onClick={createDevice} variant="outline" size="sm" className="w-full mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        )}
      </Card>

      {/* Active links - collapsible */}
      {scanLinks.length > 0 && (
        <Card className="overflow-hidden">
          <button 
            className="w-full p-4 flex items-center justify-between text-left"
            onClick={() => setShowLinks(!showLinks)}
          >
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              <span className="font-semibold">Liens actifs ({scanLinks.length})</span>
            </div>
            {showLinks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          
          {showLinks && (
            <div className="px-4 pb-4 space-y-2">
              {scanLinks.map(link => (
                <div key={link.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{link.events?.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Expire {new Date(link.expires_at).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyLink(link.token)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/scan/${link.token}`, '_blank')}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deactivateLink(link.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
