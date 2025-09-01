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
  if (!trialActive && !settings) return null;
  const configuredTrialDays = settings?.trial_days || 14;
  const trialEndDate = trialEnd ? new Date(trialEnd).toLocaleDateString('pt-BR') : 'N/A';
  return;
}