
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Play, RefreshCw, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface EmailJob {
  id: string;
  to_email: string;
  template_type: string;
  status: string;
  scheduled_for: string;
  attempts: number;
  last_error?: string;
  created_at: string;
}

export const EmailQueueManager = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  // Buscar jobs na fila
  const { data: jobs, isLoading, refetch } = useQuery({
    queryKey: ['email-jobs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as EmailJob[];
    },
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const processQueue = async () => {
    setIsProcessing(true);
    try {
      console.log('Iniciando processamento de emails...');
      
      // Chamar a função de processamento de emails diretamente
      const { data, error } = await supabase.functions.invoke('process-email-jobs');
      
      if (error) {
        console.error('Erro na edge function:', error);
        throw error;
      }
      
      console.log('Resultado do processamento:', data);
      
      toast({
        title: "Processamento concluído",
        description: data?.message || `${data?.processed || 0} emails processados`,
      });
      
      // Refetch imediatamente para ver os resultados
      refetch();
      
    } catch (error: any) {
      console.error('Erro ao processar fila:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar fila de emails",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'pending': 'outline',
      'processing': 'secondary',
      'sent': 'default',
      'failed': 'destructive'
    };
    
    return <Badge variant={variants[status] || 'outline'}>{status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const pendingCount = jobs?.filter(job => job.status === 'pending').length || 0;
  const processingCount = jobs?.filter(job => job.status === 'processing').length || 0;
  const readyToProcess = jobs?.filter(job => 
    job.status === 'pending' && new Date(job.scheduled_for) <= new Date()
  ).length || 0;

  return (
    <div className="space-y-6">
      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Prontos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{readyToProcess}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Processando</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{processingCount}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobs?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Fila de Emails Automáticos
          </CardTitle>
          <CardDescription>
            Gerencie e processe a fila de emails automáticos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button 
              onClick={processQueue} 
              disabled={isProcessing || readyToProcess === 0}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Processar Fila ({readyToProcess} prontos)
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          
          {readyToProcess === 0 && pendingCount > 0 && (
            <p className="text-sm text-muted-foreground">
              Há {pendingCount} emails pendentes, mas nenhum está pronto para envio ainda.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lista de Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Jobs Recentes</CardTitle>
          <CardDescription>
            Últimos 20 jobs de email na fila
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : jobs && jobs.length > 0 ? (
            <div className="space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{job.to_email}</span>
                      {getStatusBadge(job.status)}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Template: <span className="font-medium">{job.template_type}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Enviar em: {formatDate(job.scheduled_for)}
                    </span>
                  </div>
                  
                  {job.attempts > 0 && (
                    <div className="text-sm text-muted-foreground">
                      Tentativas: {job.attempts}
                    </div>
                  )}
                  
                  {job.last_error && (
                    <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                      Erro: {job.last_error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum job na fila
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
