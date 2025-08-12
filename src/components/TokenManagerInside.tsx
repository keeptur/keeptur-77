import { useTokenManager } from "@/hooks/useTokenManager";
import { ReloginModal } from "@/components/modals/ReloginModal";

// Token manager component que só pode ser usado dentro do Router
export function TokenManagerInside() {
  const { showReloginModal, handleRelogin, handleCancelRelogin } = useTokenManager();
  
  return (
    <ReloginModal 
      isOpen={showReloginModal}
      onRelogin={handleRelogin}
      onCancel={handleCancelRelogin}
    />
  );
}