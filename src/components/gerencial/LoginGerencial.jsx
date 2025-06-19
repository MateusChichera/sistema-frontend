// frontend/src/components/gerencial/LoginGerencial.jsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom'; // Importe useParams

const LoginGerencial = ({ admin = false }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams(); // <--- OBTEM O SLUG DA URL AQUI

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let loginType;
    let targetSlug = null;

    if (admin) {
      loginType = 'admin';
    } else {
      loginType = 'funcionario';
      targetSlug = slug; // Usa o slug da URL para login de funcionário
    }

    const result = await login({ email, senha }, loginType, targetSlug);

    if (result.success) {
      if (admin) {
        navigate('/admin/dashboard'); // Redireciona para o dashboard do admin master
      } else {
        navigate(`/gerencial/${targetSlug}/dashboard`); // Redireciona para o dashboard do funcionário
      }
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-[380px]">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {admin ? 'Login Admin Master' : `Login ${slug ? `(${slug})` : 'Gerencial'}`}
          </CardTitle>
          <CardDescription>
            {admin ? 'Acesse o painel de gerenciamento de empresas.' : 'Acesse o painel do seu restaurante.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="********"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button type="submit" onClick={handleSubmit} className="w-full">Entrar</Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginGerencial;