// frontend/src/components/gerencial/WelcomePage.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Building, 
  Clock, 
  Calendar,
  DollarSign,
  ShoppingBag,
  ChefHat,
  Users,
  Settings,
  BarChart3,
  UtensilsCrossed,
  QrCode
} from 'lucide-react';

const WelcomePage = () => {
  const { user } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();

  if (!user || !empresa) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-700">Carregando...</p>
      </div>
    );
  }

  // Função para obter o ícone baseado no cargo do usuário
  const getUserIcon = (role) => {
    switch (role) {
      case 'Proprietario':
        return <User className="h-8 w-8 text-blue-600" />;
      case 'Gerente':
        return <Users className="h-8 w-8 text-green-600" />;
      case 'Funcionario':
        return <ChefHat className="h-8 w-8 text-orange-600" />;
      case 'Caixa':
        return <DollarSign className="h-8 w-8 text-purple-600" />;
      default:
        return <User className="h-8 w-8 text-gray-600" />;
    }
  };

  // Função para obter a cor baseada no cargo
  const getRoleColor = (role) => {
    switch (role) {
      case 'Proprietario':
        return 'text-blue-600';
      case 'Gerente':
        return 'text-green-600';
      case 'Funcionario':
        return 'text-orange-600';
      case 'Caixa':
        return 'text-purple-600';
      default:
        return 'text-gray-600';
    }
  };

  // Função para obter a descrição do cargo
  const getRoleDescription = (role) => {
    switch (role) {
      case 'Proprietario':
        return 'Acesso completo ao sistema';
      case 'Gerente':
        return 'Gerencia operações e relatórios';
      case 'Funcionario':
        return 'Atende pedidos e cozinha';
      case 'Caixa':
        return 'Gerencia pagamentos e caixa';
      default:
        return 'Usuário do sistema';
    }
  };

  // Menu items baseados na permissão do usuário
  const getMenuItems = () => {
    const items = [];
    const slug = empresa.slug;

    // Itens básicos para todos os usuários
    items.push(
      { name: 'Caixa', icon: DollarSign, path: `/gerencial/${slug}/caixa`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
      { name: 'Mesas', icon: ShoppingBag, path: `/gerencial/${slug}/mesas`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
      { name: 'Delivery', icon: ShoppingBag, path: `/gerencial/${slug}/pedidos`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
      { name: 'Cozinha', icon: ChefHat, path: `/gerencial/${slug}/cozinha`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] }
    );

    // Itens para proprietários e gerentes
    if (['Proprietario', 'Gerente'].includes(user.role)) {
      items.push(
        { name: 'Dashboard', icon: BarChart3, path: `/gerencial/${slug}/dashboard`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Relatórios', icon: BarChart3, path: `/gerencial/${slug}/relatorios`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Configurações', icon: Settings, path: `/gerencial/${slug}/configuracoes`, roles: ['Proprietario', 'Gerente'] }
      );
    }

    // Itens para proprietários
    if (user.role === 'Proprietario') {
      items.push(
        { name: 'Funcionários', icon: Users, path: `/gerencial/${slug}/cadastros/funcionarios`, roles: ['Proprietario'] }
      );
    }

    return items.filter(item => item.roles.includes(user.role));
  };

  const menuItems = getMenuItems();

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header com informações do usuário e empresa */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-4 mb-4 md:mb-0">
              {empresa.logo_full_url && (
                <img 
                  src={empresa.logo_full_url} 
                  alt="Logo" 
                  className="h-16 w-16 rounded-lg object-cover shadow-md" 
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{empresa.nome_fantasia}</h1>
                <p className="text-gray-600">Bem-vindo ao sistema gerencial</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Logado como</p>
                <p className="font-semibold text-gray-900">{user.nome}</p>
                <p className={`text-sm font-medium ${getRoleColor(user.role)}`}>
                  {user.role}
                </p>
              </div>
              {getUserIcon(user.role)}
            </div>
          </div>
        </div>

        {/* Mensagem de boas-vindas */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-title mb-2">
              Bem-vindo, {user.nome}! 👋
            </h2>
            <p className="text-lg text-gray-600 mb-4">
              {getRoleDescription(user.role)}
            </p>
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>{new Date().toLocaleTimeString('pt-BR')}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4" />
                <span>{new Date().toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cards de acesso rápido */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Card 
                key={item.name}
                className="hover:shadow-lg transition-all duration-200 cursor-pointer bg-white"
                onClick={() => navigate(item.path)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Icon className="h-6 w-6 text-blue-600" />
                    </div>
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Acesse o módulo de {item.name.toLowerCase()}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Informações da empresa */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Informações da Empresa</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Building className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Nome Fantasia</p>
                <p className="font-medium">{empresa.nome_fantasia}</p>
              </div>
            </div>
            
            {empresa.razao_social && (
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">Razão Social</p>
                  <p className="font-medium">{empresa.razao_social}</p>
                </div>
              </div>
            )}
            
            {empresa.cnpj && (
              <div className="flex items-center space-x-3">
                <Building className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-600">CNPJ</p>
                  <p className="font-medium">{empresa.cnpj}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className={`font-medium ${empresa.status === 'Ativa' ? 'text-green-600' : 'text-red-600'}`}>
                  {empresa.status}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage; 