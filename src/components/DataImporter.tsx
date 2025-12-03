import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet, CheckCircle } from "lucide-react";
import Papa from "papaparse";
import { toast } from "sonner";

interface DataImporterProps {
  organizerId: string;
}

export function DataImporter({ organizerId }: DataImporterProps) {
  const [importing, setImporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizerId) return;
    
    setImporting(true);
    setSuccess(false);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as Record<string, string>[];
          
          const formattedData = rows
            .map((row) => {
              const dateValue = row["Date"] || row["date"];
              const revenueValue = row["Revenue"] || row["revenue"] || "0";
              
              if (!dateValue) return null;
              
              const parsedDate = new Date(dateValue);
              if (isNaN(parsedDate.getTime())) return null;

              return {
                organizer_id: organizerId,
                title: row["Event Name"] || row["event_name"] || row["Title"] || "Événement importé",
                date: parsedDate.toISOString(),
                tickets_sold: parseInt(row["Tickets"] || row["tickets"] || row["tickets_sold"] || "0", 10),
                revenue_cents: Math.round(parseFloat(revenueValue) * 100),
                city: row["City"] || row["city"] || "Non spécifié",
                genre: row["Genre"] || row["genre"] || "Général",
              };
            })
            .filter(Boolean);

          if (formattedData.length === 0) {
            throw new Error("Aucune donnée valide trouvée. Vérifiez le format CSV.");
          }

          const { error } = await supabase
            .from("historical_events")
            .insert(formattedData as any[]);

          if (error) throw error;

          setSuccess(true);
          toast.success(`${formattedData.length} événements importés !`, {
            description: "L'IA peut maintenant analyser ces données.",
          });
        } catch (err: any) {
          console.error("Import error:", err);
          toast.error("Erreur d'import", {
            description: err.message || "Format de fichier invalide",
          });
        } finally {
          setImporting(false);
        }
      },
      error: (err) => {
        console.error("Parse error:", err);
        toast.error("Erreur de lecture CSV");
        setImporting(false);
      },
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold">Importer un historique</h3>
          <p className="text-sm text-muted-foreground">
            Format: Date, Event Name, Tickets, Revenue, City, Genre
          </p>
        </div>
      </div>

      <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 hover:bg-muted/30 transition-all duration-200 relative">
        <Input
          type="file"
          accept=".csv"
          className="absolute inset-0 opacity-0 cursor-pointer h-full"
          onChange={handleFileUpload}
          disabled={importing}
        />
        <div className="flex flex-col items-center gap-2 pointer-events-none">
          {importing ? (
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          ) : success ? (
            <CheckCircle className="h-8 w-8 text-green-500" />
          ) : (
            <Upload className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="font-medium text-foreground">
            {importing ? "Analyse en cours..." : success ? "Import réussi !" : "Cliquez ou déposez un fichier"}
          </span>
          <span className="text-xs text-muted-foreground">
            Fichiers CSV uniquement
          </span>
        </div>
      </div>
    </Card>
  );
}
