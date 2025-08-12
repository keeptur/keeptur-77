import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

export function useTokenManager() {
  const [showReloginModal, setShowReloginModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Verificar token a cada 1 minuto
    const tokenCheckInterval = setInterval(() => {
      if (api.isAuthenticated()) {
        // Se o token está expirando em breve, mostrar modal
        if (api.isTokenExpiringSoon()) {
          setShowReloginModal(true);
        }
        
        // Se o token já expirou, redirecionar para login
        if (api.isTokenExpired()) {
          api.logout();
          navigate('/login');
        }
      }
    }, 60000); // Verificar a cada minuto

    // Escutar evento de token expirado
    const handleTokenExpired = () => {
      setShowReloginModal(true);
    };

    window.addEventListener('token-expired', handleTokenExpired);

    return () => {
      clearInterval(tokenCheckInterval);
      window.removeEventListener('token-expired', handleTokenExpired);
    };
  }, [navigate]);

  const handleRelogin = () => {
    api.logout();
    setShowReloginModal(false);
    navigate('/login');
  };

  const handleCancelRelogin = () => {
    setShowReloginModal(false);
  };

  return {
    showReloginModal,
    handleRelogin,
    handleCancelRelogin
  };
}