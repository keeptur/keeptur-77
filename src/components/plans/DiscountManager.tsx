import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlanSettings } from "@/hooks/usePlanSettings";
import { Percent, Gift, Clock, Check } from "lucide-react";

interface DiscountManagerProps {
  planPrice: number;
  isAnnual?: boolean;
  userEmail?: string;
  onDiscountApplied?: (discount: number, finalPrice: number) => void;
}

export default function DiscountManager({ 
  planPrice, 
  isAnnual = false, 
  userEmail,
  onDiscountApplied 
}: DiscountManagerProps) {
  const { toast } = useToast();
  const { settings } = usePlanSettings();
  const [isFirstPurchase, setIsFirstPurchase] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscounts, setAppliedDiscounts] = useState<{
    annual?: number;
    firstPurchase?: number;
    coupon?: number;
  }>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userEmail) {
      checkFirstPurchase();
    }
  }, [userEmail]);

  useEffect(() => {
    calculateDiscounts();
  }, [settings, isFirstPurchase, isAnnual, planPrice]);

  const checkFirstPurchase = async () => {
    if (!userEmail) return;

    try {
      // Verifica se o usuário já fez alguma compra
      const { data: subscriber } = await supabase
        .from('subscribers')
        .select('id, subscribed')
        .eq('email', userEmail)
        .single();

      // É primeira compra se não existe subscriber ou nunca foi assinante
      setIsFirstPurchase(!subscriber || !subscriber.subscribed);
    } catch (error) {
      // Se não encontrou subscriber, é primeira compra
      setIsFirstPurchase(true);
    }
  };

  const calculateDiscounts = () => {
    if (!settings) return;

    const discounts: typeof appliedDiscounts = {};
    
    // Desconto anual (aplicado automaticamente)
    if (isAnnual && settings.annual_discount > 0) {
      discounts.annual = settings.annual_discount;
    }

    // Desconto primeira compra (aplicado automaticamente se habilitado)
    if (isFirstPurchase && settings.first_purchase_discount > 0 && settings.coupons_enabled) {
      discounts.firstPurchase = settings.first_purchase_discount;
    }

    setAppliedDiscounts(discounts);
    
    // Calcula desconto total e preço final
    const totalDiscount = Object.values(discounts).reduce((sum, discount) => sum + (discount || 0), 0);
    const finalPrice = planPrice * (1 - totalDiscount / 100);
    
    onDiscountApplied?.(totalDiscount, finalPrice);
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;

    setLoading(true);
    try {
      // Aqui você implementaria a lógica de validação de cupom
      // Por simplicidade, vamos simular um cupom "DESCONTO10" que dá 10% de desconto
      
      if (couponCode.toUpperCase() === "DESCONTO10") {
        const newDiscounts = { ...appliedDiscounts, coupon: 10 };
        setAppliedDiscounts(newDiscounts);
        
        const totalDiscount = Object.values(newDiscounts).reduce((sum, discount) => sum + (discount || 0), 0);
        const finalPrice = planPrice * (1 - totalDiscount / 100);
        
        onDiscountApplied?.(totalDiscount, finalPrice);
        
        toast({
          title: "Cupom aplicado!",
          description: "Desconto de 10% aplicado com sucesso",
        });
      } else {
        toast({
          title: "Cupom inválido",
          description: "O cupom informado não é válido ou expirou",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao aplicar cupom",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeCoupon = () => {
    const newDiscounts = { ...appliedDiscounts };
    delete newDiscounts.coupon;
    setAppliedDiscounts(newDiscounts);
    setCouponCode("");
    
    const totalDiscount = Object.values(newDiscounts).reduce((sum, discount) => sum + (discount || 0), 0);
    const finalPrice = planPrice * (1 - totalDiscount / 100);
    
    onDiscountApplied?.(totalDiscount, finalPrice);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price / 100);
  };

  if (!settings) return null;

  const totalDiscount = Object.values(appliedDiscounts).reduce((sum, discount) => sum + (discount || 0), 0);
  const finalPrice = planPrice * (1 - totalDiscount / 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Descontos Aplicáveis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Desconto Anual */}
        {isAnnual && appliedDiscounts.annual && (
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Desconto Anual</span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              -{appliedDiscounts.annual}%
            </Badge>
          </div>
        )}

        {/* Desconto Primeira Compra */}
        {isFirstPurchase && appliedDiscounts.firstPurchase && settings.coupons_enabled && (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Desconto Primeira Compra</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              -{appliedDiscounts.firstPurchase}%
            </Badge>
          </div>
        )}

        {/* Cupom de Desconto */}
        {settings.coupons_enabled && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Cupom de Desconto</label>
            {appliedDiscounts.coupon ? (
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Cupom aplicado: {couponCode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    -{appliedDiscounts.coupon}%
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={removeCoupon}
                    className="text-xs"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Digite seu cupom"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1"
                />
                <Button 
                  onClick={applyCoupon} 
                  disabled={loading || !couponCode.trim()}
                  variant="outline"
                >
                  Aplicar
                </Button>
              </div>
            )}
            {settings.coupons_enabled && (
              <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                💡 Use cupons de desconto para economizar na sua assinatura!
              </p>
            )}
          </div>
        )}

        {/* Resumo dos Descontos */}
        {totalDiscount > 0 && (
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Preço original:</span>
              <span>{formatPrice(planPrice)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600">
              <span>Desconto total ({totalDiscount}%):</span>
              <span>-{formatPrice(planPrice - finalPrice)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Preço final:</span>
              <span className="text-primary">{formatPrice(finalPrice)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}