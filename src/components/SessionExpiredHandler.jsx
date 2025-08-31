import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const SessionExpiredHandler = () => {
  const { sessionExpired, handleSessionExpiredClose, logout } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();

  // Função utilitária para verificar se está na página de login
  const isLoginPage = (pathname) => {
    return pathname.includes('/login') || 
           (pathname.includes('/gerencial/') && !pathname.includes('/inicio') && !pathname.includes('/dashboard') && !pathname.includes('/pedidos') && !pathname.includes('/caixa') && !pathname.includes('/cadastros') && !pathname.includes('/configuracoes') && !pathname.includes('/cozinha') && !pathname.includes('/relatorios')) ||
           pathname === '/';
  };

  // Não exibe o diálogo se estiver na tela de login
  const shouldShowDialog = !isLoginPage(location.pathname);

  useEffect(() => {
    if (sessionExpired && shouldShowDialog) {
      // Ao fechar o modal, faz logout e redireciona
      const onClose = () => {
        handleSessionExpiredClose();
        if (empresa && empresa.slug) {
          navigate(`/gerencial/${empresa.slug}`);
        } else {
          navigate('/');
        }
      };
      // Retorna função de cleanup para garantir que não fica preso
      return onClose;
    }
  }, [sessionExpired, empresa, navigate, handleSessionExpiredClose, shouldShowDialog]);

  // Não renderiza nada se estiver na tela de login ou se não houver sessão expirada
  if (!sessionExpired || !shouldShowDialog) return null;

  return (
    <Dialog open={sessionExpired} onOpenChange={handleSessionExpiredClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sessão expirada</DialogTitle>
          <DialogDescription>
            Sua sessão expirou. Faça login novamente para continuar.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={() => {
            handleSessionExpiredClose();
                      if (empresa && empresa.slug) {
            navigate(`/gerencial/${empresa.slug}`);
          } else {
            navigate('/');
          }
          }}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionExpiredHandler; 