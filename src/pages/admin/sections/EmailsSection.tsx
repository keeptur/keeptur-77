
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmailAutomationManager } from "@/components/emails/EmailAutomationManager";
import { VisualEmailEditor } from "@/components/emails/VisualEmailEditor";
import { EmailQueueManager } from "@/components/emails/EmailQueueManager";

export const EmailsSection = () => {
  const [activeTab, setActiveTab] = useState("templates");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gerenciamento de Emails</h2>
        <p className="text-muted-foreground mb-6">
          Configure templates, automações e monitore a fila de envios
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
          <TabsTrigger value="queue">Fila</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Editor de Templates</CardTitle>
              <CardDescription>
                Configure os templates de email do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VisualEmailEditor />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Regras de Automação</CardTitle>
              <CardDescription>
                Configure quando e quais emails devem ser enviados automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EmailAutomationManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="space-y-6">
          <EmailQueueManager />
        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Logs de Email</CardTitle>
              <CardDescription>
                Visualize o histórico de envios e erros
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Logs de email serão implementados aqui
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
