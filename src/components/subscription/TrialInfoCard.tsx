import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Gift } from 'lucide-react';
import { usePlanSettings } from '@/hooks/usePlanSettings';

interface TrialInfoCardProps {
  trialActive: boolean;
  trialEnd?: string;
  daysRemaining: number;
}

export function TrialInfoCard({ trialActive, trialEnd, daysRemaining }: TrialInfoCardProps) {
  const { settings } = usePlanSettings();

  if (!trialActive && !settings) return null;

  const configuredTrialDays = settings?.trial_days || 14;
  const trialEndDate = trialEnd ? new Date(trialEnd).toLocaleDateString('pt-BR') : 'N/A';

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Gift className="h-5 w-5" />
          Período de Trial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-blue-600 font-medium">Duração Configurada</p>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-semibold text-blue-700">{configuredTrialDays} dias</span>
            </div>
          </div>
          
          {trialActive && (
            <div className="space-y-1">
              <p className="text-xs text-blue-600 font-medium">Dias Restantes</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-semibold text-blue-700">{daysRemaining} dias</span>
              </div>
            </div>
          )}
        </div>

        {trialActive && (
          <div className="pt-2 border-t border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-blue-600">Trial expira em:</span>
              <Badge variant="outline" className="border-blue-300 text-blue-700 bg-white">
                {trialEndDate}
              </Badge>
            </div>
          </div>
        )}

        {!trialActive && settings && (
          <div className="pt-2 border-t border-blue-200">
            <p className="text-xs text-blue-600">
              ✨ Novos usuários recebem {configuredTrialDays} dias de trial gratuito
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}