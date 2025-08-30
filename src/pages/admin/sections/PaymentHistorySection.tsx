import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Eye, Search } from "lucide-react";

interface PaymentHistoryItem {
  id: string;
  user_email: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  description: string;
  invoice_url?: string;
  invoice_pdf?: string;
  subscription_tier?: string;
}

export default function PaymentHistorySection() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<PaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  const loadPaymentHistory = async () => {
    setLoading(true);
    try {
      // Buscar apenas subscribers que têm stripe_customer_id e são únicos por customer_id
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('email, subscription_tier, stripe_customer_id')
        .not('stripe_customer_id', 'is', null);

      if (!subscribers || subscribers.length === 0) {
        setPayments([]);
        return;
      }

      const allPayments: PaymentHistoryItem[] = [];
      const processedCustomers = new Set<string>();

      // Para cada subscriber único por stripe_customer_id, buscar histórico de pagamentos
      for (const subscriber of subscribers) {
        // Evitar duplicatas por stripe_customer_id
        if (processedCustomers.has(subscriber.stripe_customer_id)) {
          continue;
        }
        processedCustomers.add(subscriber.stripe_customer_id);

        try {
          const { data, error } = await supabase.functions.invoke('get-payment-history', {
            body: { customer_email: subscriber.email }
          });

          if (error) {
            console.error(`Error fetching payments for ${subscriber.email}:`, error);
            continue;
          }

          if (data?.payment_history) {
            const userPayments = data.payment_history.map((payment: any) => ({
              ...payment,
              user_email: subscriber.email,
              subscription_tier: subscriber.subscription_tier
            }));
            allPayments.push(...userPayments);
          }
        } catch (error) {
          console.error(`Error processing payments for ${subscriber.email}:`, error);
        }
      }

      // Remover duplicatas por ID de pagamento e ordenar por data mais recente
      const uniquePayments = allPayments.filter((payment, index, array) => 
        array.findIndex(p => p.id === payment.id) === index
      );
      uniquePayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setPayments(uniquePayments);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast({
        title: "Erro ao carregar histórico",
        description: "Não foi possível carregar o histórico de pagamentos.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentHistory();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'pending':
        return 'Pendente';
      case 'failed':
        return 'Falhou';
      default:
        return status;
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Histórico de Pagamentos</h2>
          <p className="text-muted-foreground">
            Total de receita: {formatCurrency(totalRevenue, 'BRL')}
          </p>
        </div>
        <Button onClick={loadPaymentHistory} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 rounded-md border bg-background text-foreground"
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago</option>
              <option value="pending">Pendente</option>
              <option value="failed">Falhou</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Pagamentos ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico de pagamentos...
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum pagamento encontrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium text-sm">Data</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Usuário</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Descrição</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Plano</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Valor</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-sm">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment, index) => (
                    <tr key={`${payment.id}-${index}`} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 text-sm">
                        {formatDate(payment.date)}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium">
                        {payment.user_email}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {payment.description}
                      </td>
                      <td className="py-3 px-2 text-sm">
                        {payment.subscription_tier && (
                          <Badge variant="outline">
                            {payment.subscription_tier}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm font-medium">
                        {formatCurrency(payment.amount, payment.currency)}
                      </td>
                      <td className="py-3 px-2">
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusText(payment.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex gap-2">
                          {payment.invoice_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(payment.invoice_url, '_blank')}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          {payment.invoice_pdf && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(payment.invoice_pdf, '_blank')}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}