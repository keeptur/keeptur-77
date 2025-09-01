import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Shield, AlertTriangle } from 'lucide-react';

export function SecurityFixHelper() {
  const { toast } = useToast();
  const [isEnabling, setIsEnabling] = useState(false);

  const enablePasswordProtection = async () => {
    setIsEnabling(true);
    try {
      const { data, error } = await supabase.functions.invoke('enable-password-protection');

      if (error) {
        console.error('Error enabling password protection:', error);
        toast({
          title: "Error",
          description: `Failed to enable password protection: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Success",
          description: "Leaked password protection enabled successfully",
          variant: "default",
        });
      } else {
        toast({
          title: "Error", 
          description: data?.error || "Failed to enable password protection",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="h-5 w-5 text-amber-600" />
        <h3 className="font-medium text-amber-800">Security Enhancement Required</h3>
      </div>
      <p className="text-sm text-amber-700 mb-4">
        Leaked password protection is currently disabled. Enable it to prevent users from using compromised passwords.
      </p>
      <Button 
        onClick={enablePasswordProtection}
        disabled={isEnabling}
        size="sm"
        className="bg-amber-600 hover:bg-amber-700"
      >
        <Shield className="h-4 w-4 mr-2" />
        {isEnabling ? "Enabling..." : "Enable Password Protection"}
      </Button>
    </div>
  );
}