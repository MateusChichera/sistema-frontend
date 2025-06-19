// frontend/src/components/layout/LayoutGerencial.jsx
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useNavigate, useLocation, NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Users,
  BarChart3,
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '../ui/button';

const LayoutGerencial = ({ children }) => {
  const { user, logout } = useAuth();
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlugFromParams } = useParams(); // Pega o slug da URL usando useParams

  // --- Condições de Carregamento e Erro do Layout ---

  // PRIMEIRA VERIFICAÇÃO: Mostra "Carregando" se o EmpresaContext ainda não terminou.
  // Isso é crucial para que os dados 'empresa' e 'isReady' estejam estáveis.
  if (!isReady || empresaLoading) {
    console.log("LayoutGerencial: Mostrando 'Carregando painel gerencial...' (EmpresaContext não pronto).");
    console.log("  Estado: isReady:", isReady, "empresaLoading:", empresaLoading);
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-700">Carregando painel gerencial...</p>
      </div>
    );
  }

  // SE CHEGAMOS AQUI: isReady é TRUE e empresaLoading é FALSE.
  // O EmpresaContext CONCLUIU o carregamento. Agora verificamos a validade da empresa.

  // O slug que usaremos para construir as URLs do menu é o slug que veio da própria URL,
  // pois ele é o que o usuário digitou e é o que esperamos que seja consistente.
  const currentSlugForNavigation = urlSlugFromParams;

  // VERIFICAÇÃO DE VALIDADE DA EMPRESA:
  // Se a empresa não foi encontrada no contexto, ou se o status não é 'Ativa',
  // OU se o slug carregado pelo contexto NÃO corresponde ao slug da URL (segurança extra).
  // A mensagem de erro final só é mostrada se a empresa não for válida.
  if (!empresa || empresa.status !== 'Ativa' || empresa.slug !== urlSlugFromParams) {
    console.log("LayoutGerencial: Empresa inválida/inativa/slug mismatch.");
    console.log("  Empresa do Contexto:", empresa); // Loga o objeto completo
    console.log("  URL Slug (from useParams):", urlSlugFromParams);
    return (
      <div className="flex justify-center items-center h-screen bg-red-100 text-red-700 font-semibold p-4 rounded-lg shadow-lg m-4 text-center">
        <p>Acesso negado. Empresa não encontrada, inativa ou URL inválida para gerenciamento.</p>
        <p className="mt-2 text-sm">Verifique o endereço ou entre em contato com o suporte.</p>
      </div>
    );
  }

  // A PARTIR DAQUI:
  // 1. O EmpresaContext terminou de carregar.
  // 2. A 'empresa' foi carregada, está ativa e seu 'slug' corresponde ao 'urlSlugFromParams'.
  // 3. 'currentSlugForNavigation' (do useParams) é válido e não é undefined.

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: `/gerencial/${currentSlugForNavigation}/dashboard` },
    { name: 'Pedidos', icon: ShoppingBag, path: `/gerencial/${currentSlugForNavigation}/pedidos` },
    { name: 'Caixa', icon: CreditCard, path: `/gerencial/${currentSlugForNavigation}/caixa` },
    { name: 'Cadastros', icon: Users, path: `/gerencial/${currentSlugForNavigation}/cadastros` },
    { name: 'Relatórios', icon: BarChart3, path: `/gerencial/${currentSlugForNavigation}/relatorios` }
  ];

  const handleLogout = () => {
    logout();
    navigate(`/gerencial/${currentSlugForNavigation}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              {empresa.logo_full_url && (
                <img
                  src={empresa.logo_full_url}
                  alt={empresa.nome_fantasia || 'Logo da Empresa'}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{empresa.nome_fantasia}</h2>
                <p className="text-sm text-gray-600">Gerencial</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    className={({ isActive: navIsActive }) =>
                      `w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`
                    }
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          <div className="flex-shrink-0 p-4 border-t">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">
                  {user?.nome ? user.nome.charAt(0) : 'U'}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-gray-600">{user?.role || 'Visitante'}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">{empresa.nome_fantasia}</h1>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutGerencial;