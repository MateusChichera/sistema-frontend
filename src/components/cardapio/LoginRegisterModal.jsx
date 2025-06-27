// frontend/src/components/cardapio/LoginRegisterModal.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { IMaskInput } from 'react-imask';
import api from '../../services/api';
import { Loader2 } from 'lucide-react';

const LoginRegisterModal = ({ onClose }) => {
  const { login, user } = useAuth();
  const { empresa } = useEmpresa();
  
  const [activeTab, setActiveTab] = useState('login');
  const [emailLogin, setEmailLogin] = useState('');
  const [passwordLogin, setPasswordLogin] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [nomeRegister, setNomeRegister] = useState('');
  const [emailRegister, setEmailRegister] = useState('');
  const [telefoneRegister, setTelefoneRegister] = useState('');
  const [passwordRegister, setPasswordRegister] = useState('');
  const [errorRegister, setErrorRegister] = useState('');
  
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorLogin('');
    setLoading(true);
    try {
      const result = await login({ email: emailLogin, senha: passwordLogin }, 'cliente', empresa.slug);
      if (result.success) {
        toast.success(`Bem-vindo de volta, ${result.user.nome}!`);
        onClose();
      } else {
        setErrorLogin(result.error);
      }
    } catch (err) {
      setErrorLogin('Erro ao tentar fazer login.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorRegister('');
    setLoading(true);
    try {
      const cleanedTelefone = telefoneRegister.replace(/\D/g, '');
      const response = await api.post(`/${empresa.slug}/cliente/register`, {
        nome: nomeRegister,
        email: emailRegister,
        telefone: cleanedTelefone,
        senha: passwordRegister
      });
      if (response.data.clienteId) {
        toast.success('Cadastro realizado com sucesso! Agora você pode fazer login.');
        setActiveTab('login');
        setEmailLogin(emailRegister);
      }
    } catch (err) {
      setErrorRegister(err.response?.data?.message || 'Erro ao realizar cadastro.');
      console.error('Register error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <DialogHeader>
        <DialogTitle>Acessar Conta</DialogTitle>
        <DialogDescription>Faça login ou crie sua conta para futuros pedidos.</DialogDescription>
      </DialogHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Entrar</TabsTrigger>
          <TabsTrigger value="register">Cadastrar</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="py-4">
          <form onSubmit={handleLoginSubmit} className="grid gap-4">
            <div>
              <Label htmlFor="emailLogin">Email ou Telefone</Label>
              <Input
                id="emailLogin"
                type="text"
                placeholder="seu@email.com ou (00) 00000-0000"
                value={emailLogin}
                onChange={(e) => setEmailLogin(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="passwordLogin">Senha</Label>
              <Input
                id="passwordLogin"
                type="password"
                placeholder="********"
                value={passwordLogin}
                onChange={(e) => setPasswordLogin(e.target.value)}
                required
              />
            </div>
            {errorLogin && <p className="text-red-500 text-sm">{errorLogin}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading} className="flex items-center">
                {loading && <Loader2 className="animate-spin mr-2" />} Entrar
              </Button>
            </DialogFooter>
          </form>
        </TabsContent>

        <TabsContent value="register" className="py-4">
          <form onSubmit={handleRegisterSubmit} className="grid gap-4">
            <div>
              <Label htmlFor="nomeRegister">Nome</Label>
              <Input id="nomeRegister" value={nomeRegister} onChange={(e) => setNomeRegister(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="emailRegister">Email</Label>
              <Input id="emailRegister" type="email" value={emailRegister} onChange={(e) => setEmailRegister(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="telefoneRegister">Telefone</Label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={telefoneRegister}
                onAccept={(value, mask) => setTelefoneRegister(value)}
                placeholder="(00) 00000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                required
              />
            </div>
            <div>
              <Label htmlFor="passwordRegister">Senha</Label>
              <Input id="passwordRegister" type="password" value={passwordRegister} onChange={(e) => setPasswordRegister(e.target.value)} required />
            </div>
            {errorRegister && <p className="text-red-500 text-sm">{errorRegister}</p>}
            <DialogFooter>
              <Button type="submit" disabled={loading} className="flex items-center">
                {loading && <Loader2 className="animate-spin mr-2" />} Cadastrar
              </Button>
            </DialogFooter>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LoginRegisterModal;