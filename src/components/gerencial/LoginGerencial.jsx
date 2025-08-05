// frontend/src/components/gerencial/LoginGerencial.jsx
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';

const LoginGerencial = ({ admin = false }) => {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    let loginType;
    let targetSlug = null;

    if (admin) {
      loginType = 'admin';
    } else {
      loginType = 'funcionario';
      targetSlug = slug;
    }

    const result = await login({ email, senha }, loginType, targetSlug);

    if (result.success) {
      if (admin) {
        navigate('/admin/dashboard');
      } else {
        navigate(`/gerencial/${targetSlug}/inicio`);
      }
    } else {
      setError(result.error);
    }
  };

  // Estilo customizado para o botão e input para usar a paleta de cores
  const buttonStyle = {
    backgroundColor: '#1F539C', // Azul Escuro
    color: 'white',
    transition: 'background-color 0.3s ease',
  };

  const buttonHoverStyle = {
    backgroundColor: '#163D78', // Um tom mais escuro para o hover
  };

  const inputFocusStyle = {
    borderColor: '#32A3D4', // Azul Claro para o foco do input
    boxShadow: '0 0 0 1px #32A3D4',
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <Card className="w-full max-w-sm sm:max-w-md md:max-w-lg">
        <CardHeader className="text-center flex flex-col items-center gap-4 py-8">
          {/* Logo da Athos - Caminho Corrigido */}
          <img
            src="/ATHOS.png" // Caminho corrigido para a pasta 'public'
            alt="Logo Athos"
            className="w-48 h-auto mt-8 mb-0" // Use um tamanho menor para o ícone
          />
          <CardTitle className="text-3xl font-bold" style={{ color: '#000000' }}>
            {admin ? 'Login Admin Master' : 'Login Gerencial'}
          </CardTitle>
          <CardDescription className="text-gray-600" style={{ color: '#E4AF24' }}>
            {admin ? 'Acesse o painel de gerenciamento de empresas.' : 'Acesse o painel do seu restaurante.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="email" style={{ color: '#000000' }}>Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ borderColor: '#e2e8f0' }} // Cor da borda padrão
                  onFocus={(e) => { e.target.style.borderColor = inputFocusStyle.borderColor; e.target.style.boxShadow = inputFocusStyle.boxShadow; }}
                  onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                  required
                />
              </div>
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="senha" style={{ color: '#000000' }}>Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="********"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  style={{ borderColor: '#e2e8f0' }} // Cor da borda padrão
                  onFocus={(e) => { e.target.style.borderColor = inputFocusStyle.borderColor; e.target.style.boxShadow = inputFocusStyle.boxShadow; }}
                  onBlur={(e) => { e.target.style.borderColor = ''; e.target.style.boxShadow = ''; }}
                  required
                />
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-3 text-center">{error}</p>}
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-center gap-4 pb-6">
          {/* Botão com a cor personalizada */}
          <Button
            type="submit"
            onClick={handleSubmit}
            className="w-full"
            style={buttonStyle}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = buttonHoverStyle.backgroundColor}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = buttonStyle.backgroundColor}
          >
            Entrar
          </Button>
          {/* Informações da empresa no rodapé */}
          <div className="text-center text-sm text-gray-500 mt-4">
            <p>
              <strong style={{ color: '#000000' }}>Athos Software</strong><br />
              Presidente Prudente, SP
            </p>
            <p className="mt-1" style={{ color: '#1F539C' }}>
              &copy; {new Date().getFullYear()} Athos. Todos os direitos reservados.
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LoginGerencial;