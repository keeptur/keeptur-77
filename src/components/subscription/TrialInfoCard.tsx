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
export function TrialInfoCard({
  trialActive,
  trialEnd,
  daysRemaining
}: TrialInfoCardProps) {
  const {
    settings
  } = usePlanSettings();
  
  const configuredTrialDays = settings?.trial_days || 5;
  const trialEndDate = trialEnd ? new Date(trialEnd).toLocaleDateString('pt-BR') : 'N/A';
  
  // Check if trial is expired
  const isTrialExpired = !trialActive || daysRemaining <= 0;
  
  if (!trialActive && daysRemaining <= 0) {
    return <Card className="bg-red-50/50 border-red-200 mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Gift className="w-5 h-5" />
            Trial Vencido
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">Status:</span>
            </div>
            <Badge variant="destructive" className="bg-red-600 text-white">
              VENCIDO
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-red-600" />
              <span className="text-sm text-red-700">Venceu em:</span>
            </div>
            <span className="text-sm font-medium text-red-700">{trialEndDate}</span>
          </div>
        </CardContent>
      </Card>;
  }
  
  if (!trialActive) return null;
  
  return <Card className="bg-blue-50/50 border-blue-200 mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-700">
          <Gift className="w-5 h-5" />
          Período de Trial Ativo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Dias restantes:</span>
          </div>
          <Badge variant="default" className="bg-blue-600 text-white">
            {daysRemaining} dias
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Termina em:</span>
          </div>
          <span className="text-sm font-medium text-blue-700">{trialEndDate}</span>
        </div>
      </CardContent>
    </Card>;
}