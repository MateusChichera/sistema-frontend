import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  CreditCard, 
  Users, 
  Settings, 
  BarChart3, 
  LogOut,
  Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const LayoutGerencial = ({ children }) => {
  const { user, logout } = useAuth();
  const { empresa } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      name: 'Dashboard',
      icon: LayoutDashboard,
      path: `/gerencial/${empresa?.slug}/dashboard`
    },
    {
      name: 'Pedidos',
      icon: ShoppingBag,
      path: `/gerencial/${empresa?.slug}/pedidos`
    },
    {
      name: 'Caixa',
      icon: CreditCard,
      path: `/gerencial/${empresa?.slug}/caixa`
    },
    {
      name: 'Cadastros',
      icon: Users,
      path: `/gerencial/${empresa?.slug}/cadastros`
    },
    {
      name: 'Relatórios',
      icon: BarChart3,
      path: `/gerencial/${empresa?.slug}/relatorios`
    }
  ];

  const handleLogout = () => {
    logout();
    navigate(`/gerencial/${empresa?.slug}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              {empresa?.logo_url && (
                <img 
                  src={empresa.logo_url} 
                  alt={empresa.nome_fantasia}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{empresa?.nome_fantasia}</h2>
                <p className="text-sm text-gray-600">Gerencial</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.path)}
                    className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 p-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user?.nome?.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                  <p className="text-xs text-gray-600">{user?.role}</p>
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
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1">
        {/* Mobile header */}
        <div className="md:hidden bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">{empresa?.nome_fantasia}</h1>
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

