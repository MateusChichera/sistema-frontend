import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useEmpresa } from '../contexts/EmpresaContext';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';

const SessionExpiredHandler = () => {
  const { sessionExpired, handleSessionExpiredClose, logout } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionExpired) {
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
  }, [sessionExpired, empresa, navigate, handleSessionExpiredClose]);

  if (!sessionExpired) return null;

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