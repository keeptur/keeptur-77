// Utilitário para disparar eventos de atualização global de configurações
export const triggerSettingsUpdate = () => {
  // Dispara eventos para diferentes tipos de configurações
  window.dispatchEvent(new CustomEvent('plan-settings-updated'));
  window.dispatchEvent(new CustomEvent('billing-settings-updated'));
  window.dispatchEvent(new CustomEvent('subscription-updated'));
};

// Hook para ouvir atualizações de configurações
export const useSettingsUpdater = (callback: () => void) => {
  const handleUpdate = () => {
    callback();
  };

  // Configurar listeners
  window.addEventListener('plan-settings-updated', handleUpdate);
  window.addEventListener('billing-settings-updated', handleUpdate);
  window.addEventListener('subscription-updated', handleUpdate);

  // Cleanup
  return () => {
    window.removeEventListener('plan-settings-updated', handleUpdate);
    window.removeEventListener('billing-settings-updated', handleUpdate);
    window.removeEventListener('subscription-updated', handleUpdate);
  };
};