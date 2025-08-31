// frontend/src/components/layout/LayoutAdmin.jsx
import React, { useEffect } from 'react'; // Importe useEffect
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Building, LogOut, UserPlus, Menu, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';

const LayoutAdmin = ({ children }) => {
  const { user, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // NOVO: useEffect para lidar com redirecionamento baseado no estado de autenticação
  useEffect(() => {
    if (!authLoading && (!user || user.email !== 'admin@sistema.com')) {
      // Redireciona APENAS depois que o carregamento de autenticação terminou
      // e o usuário não é o admin master
      navigate('/admin/login', { replace: true });
    }
  }, [user, authLoading, navigate]); // Dependências do useEffect

  // Se o carregamento de autenticação ainda está acontecendo, mostra um loader
  if (authLoading) {
    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <p className="text-gray-700">Verificando autenticação...</p>
        </div>
    );
  }

  // Se o usuário não é o Admin Master (já redirecionado pelo useEffect), não renderiza o layout
  if (!user || user.email !== 'admin@sistema.com') {
    return null; // ou um componente de acesso negado simples
  }

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { name: 'Empresas', icon: Building, path: '/admin/empresas' },
    { name: 'Avisos', icon: MessageSquare, path: '/admin/avisos' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-blue-50 flex">
      {/* Sidebar - Fixa */}
      <div className="hidden md:flex md:w-64 md:flex-col fixed left-0 top-0 h-full z-40">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r w-64 shadow-lg sidebar-scroll">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex flex-col items-center space-y-2 w-full">
              {/* Logo da ATHOS */}
              <div className="mb-2">
                <img 
                  src="/ATHOS.png" 
                  alt="ATHOS Software" 
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-xl font-bold text-gray-900">Admin Master</span>
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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {user?.nome ? user.nome.charAt(0) : 'A'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.nome || 'Admin'}</p>
                  <p className="text-xs text-gray-600">Admin Master</p>
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

      <div className="flex flex-col flex-1 md:ml-64">
        <div className="md:hidden bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-start">
              {/* Logo da ATHOS no mobile */}
              <div className="mb-1">
                <img 
                  src="/ATHOS.png" 
                  alt="ATHOS Software" 
                  className="h-8 w-auto object-contain"
                />
              </div>
              <h1 className="text-lg font-semibold text-gray-900">Admin Master</h1>
            </div>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default LayoutAdmin;