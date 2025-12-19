import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, Tag, Loader2, X, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CartItem {
  tierId: string;
  tierName: string;
  priceCents: number;
  quantity: number;
}

interface PromoCodeData {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  event_id: string | null;
}

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventTitle: string;
  items: CartItem[];
  onUpdateQuantity: (tierId: string, quantity: number) => void;
  onCheckout: (promoCode: PromoCodeData | null, finalTotal: number) => void;
  checkoutLoading: boolean;
}

export function CartDrawer({
  open,
  onOpenChange,
  eventId,
  eventTitle,
  items,
  onUpdateQuantity,
  onCheckout,
  checkoutLoading,
}: CartDrawerProps) {
  const [promoCode, setPromoCode] = useState("");
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoCodeData | null>(null);
  const [promoError, setPromoError] = useState("");

  const subtotal = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);
  const totalTickets = items.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate discount
  let discount = 0;
  if (appliedPromo) {
    if (appliedPromo.discount_type === 'percentage') {
      discount = Math.round(subtotal * (appliedPromo.discount_value / 100));
    } else {
      // Fixed amount discount (in cents)
      discount = appliedPromo.discount_value;
    }
    // Ensure discount doesn't exceed subtotal
    discount = Math.min(discount, subtotal);
  }

  const total = subtotal - discount;

  const validatePromoCode = async () => {
    if (!promoCode.trim()) {
      setPromoError("Entrez un code promo");
      return;
    }

    setValidatingPromo(true);
    setPromoError("");

    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('id, code, discount_type, discount_value, event_id, usage_count, usage_limit, starts_at, expires_at')
        .eq('code', promoCode.trim().toUpperCase())
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setPromoError("Code promo invalide");
        return;
      }

      // Check if code applies to this event (null = global, applies to all)
      if (data.event_id && data.event_id !== eventId) {
        setPromoError("Ce code ne s'applique pas à cet événement");
        return;
      }

      // Check usage limit
      if (data.usage_limit && data.usage_count >= data.usage_limit) {
        setPromoError("Ce code a atteint sa limite d'utilisation");
        return;
      }

      // Check dates
      const now = new Date();
      if (data.starts_at && new Date(data.starts_at) > now) {
        setPromoError("Ce code n'est pas encore actif");
        return;
      }
      if (data.expires_at && new Date(data.expires_at) < now) {
        setPromoError("Ce code a expiré");
        return;
      }

      setAppliedPromo({
        id: data.id,
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        event_id: data.event_id,
      });
      setPromoCode("");
      toast.success("Code promo appliqué !");
    } catch (error: any) {
      setPromoError("Erreur lors de la validation");
    } finally {
      setValidatingPromo(false);
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
    setPromoError("");
  };

  const handleCheckout = () => {
    onCheckout(appliedPromo, total);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl px-0">
        <SheetHeader className="px-6 pb-4">
          <SheetTitle className="text-xl">Mon panier</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col h-full">
          {/* Event Title */}
          <div className="px-6 pb-4">
            <p className="text-sm text-muted-foreground">{eventTitle}</p>
          </div>

          <Separator />

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Votre panier est vide
              </div>
            ) : (
              items.map((item) => (
                <div key={item.tierId} className="flex items-center justify-between py-3">
                  <div className="flex-1">
                    <p className="font-medium">{item.tierName}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.priceCents === 0 ? 'Gratuit' : `${(item.priceCents / 100).toFixed(2)} €`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onUpdateQuantity(item.tierId, item.quantity - 1)}
                    >
                      {item.quantity === 1 ? (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      ) : (
                        <Minus className="h-4 w-4" />
                      )}
                    </Button>
                    <span className="w-6 text-center font-bold tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="default"
                      className="h-8 w-8 rounded-full"
                      onClick={() => onUpdateQuantity(item.tierId, item.quantity + 1)}
                      disabled={item.quantity >= 10}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          {items.length > 0 && (
            <>
              <Separator />

              {/* Promo Code Section */}
              <div className="px-6 py-4 space-y-3">
                {appliedPromo ? (
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Code {appliedPromo.code} appliqué
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-500">
                          {appliedPromo.discount_type === 'percentage'
                            ? `-${appliedPromo.discount_value}%`
                            : `-${(appliedPromo.discount_value / 100).toFixed(2)} €`}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={removePromoCode}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Code promo"
                          value={promoCode}
                          onChange={(e) => {
                            setPromoCode(e.target.value.toUpperCase());
                            setPromoError("");
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && validatePromoCode()}
                          className="pl-10 uppercase"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={validatePromoCode}
                        disabled={validatingPromo || !promoCode.trim()}
                      >
                        {validatingPromo ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Appliquer"
                        )}
                      </Button>
                    </div>
                    {promoError && (
                      <p className="text-sm text-destructive">{promoError}</p>
                    )}
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sous-total ({totalTickets} billet{totalTickets > 1 ? 's' : ''})</span>
                  <span>{(subtotal / 100).toFixed(2)} €</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Réduction</span>
                    <span>-{(discount / 100).toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2">
                  <span>Total</span>
                  <span>{(total / 100).toFixed(2)} €</span>
                </div>
              </div>

              {/* Checkout Button - Electric Speed */}
              <div className="px-6 pb-6 pt-2">
                <div className="electric-border rounded-2xl">
                  <Button
                    className="w-full h-14 rounded-2xl font-bold text-lg bg-transparent hover:bg-transparent border-0 relative z-10"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                  >
                    {checkoutLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        <span className="text-white">Traitement...</span>
                      </>
                    ) : (
                      <>
                        <span className="text-neon font-bold">PAYER {(total / 100).toFixed(2)} €</span>
                        <ArrowRight className="ml-2 h-5 w-5 text-cyan-400" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}