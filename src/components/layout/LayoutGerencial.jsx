import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useNavigate, useLocation, NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  Users,
  Settings,
  BarChart3,
  LogOut,
  Menu,
  Tag,
  Package,
  Wallet,
  UserCog,
  Table,
  ChevronDown,
  ChevronUp,
  Utensils,
  UtensilsCrossed,
  ChefHat,
  NotebookPen,
  Bike,
  DollarSign
} from 'lucide-react';
import { Button } from '../ui/button';

const LayoutGerencial = ({ children }) => {
  const { user, logout } = useAuth();
  const { empresa, loading: empresaLoading, isReady } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlugFromParams } = useParams();

  // Controla qual menu pai está atualmente expandido (null = nenhum)
  const [openParentMenu, setOpenParentMenu] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentResolvedSlug, setCurrentResolvedSlug] = useState(null);

  useEffect(() => {
    if (
      isReady &&
      !empresaLoading &&
      empresa &&
      empresa.status === 'Ativa' &&
      empresa.slug === urlSlugFromParams
    ) {
      setCurrentResolvedSlug(empresa.slug);
    } else {
      setCurrentResolvedSlug(null);
    }
  }, [empresa, empresaLoading, isReady, urlSlugFromParams]);

  if (!isReady || empresaLoading || !currentResolvedSlug) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-700">Carregando painel gerencial...</p>
      </div>
    );
  }

  //CAIXA,MESAS,DELIVERY,COZINHA

  const currentSlug = currentResolvedSlug;

  const menuItems = [
    { name: 'Caixa', icon: DollarSign, path: `/gerencial/${currentSlug}/caixa`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
    { name: 'Mesas', icon: NotebookPen, path: `/gerencial/${currentSlug}/mesas`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Delivery', icon: Bike, path: `/gerencial/${currentSlug}/pedidos`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Cozinha', icon: ChefHat, path: `/gerencial/${currentSlug}/cozinha`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    {
      name: 'Cadastros',
      icon: Users,
      isParent: true,
      roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'],
      subMenu: [
        { name: 'Categorias', icon: Tag, path: `/gerencial/${currentSlug}/cadastros/categorias`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
        { name: 'Produtos', icon: Package, path: `/gerencial/${currentSlug}/cadastros/produtos`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Adicionais', icon: Utensils, path: `/gerencial/${currentSlug}/cadastros/adicionais`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Formas de Pagamento', icon: Wallet, path: `/gerencial/${currentSlug}/cadastros/formas-pagamento`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Funcionários', icon: UserCog, path: `/gerencial/${currentSlug}/cadastros/funcionarios`, roles: ['Proprietario'] },
        { name: 'Mesas', icon: Table, path: `/gerencial/${currentSlug}/cadastros/mesas`, roles: ['Proprietario', 'Gerente'] },
      ]
    },
    
    { name: 'Relatórios', icon: BarChart3, isParent: true, path: `/gerencial/${currentSlug}/relatorios`, roles: ['Proprietario', 'Gerente'],
      subMenu: [{ name: 'Dashboard', icon: LayoutDashboard, path: `/gerencial/${currentSlug}/dashboard`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] }],},
    { name: 'Configurações', icon: Settings, path: `/gerencial/${currentSlug}/configuracoes`, roles: ['Proprietario', 'Gerente'] }
  ];

  const handleLogout = () => {
    logout();
    navigate(`/gerencial/${currentSlug}`);
  };

  const renderMenuItems = () =>
    menuItems.map((item) => {
      if (!item.roles.includes(user?.role)) return null;
      const Icon = item.icon;
      const isActive = location.pathname.startsWith(item.path);

      if (item.isParent) {
        return (
          <div key={item.name}>
            <button
              onClick={() => setOpenParentMenu(prev => (prev === item.name ? null : item.name))}
              className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive || (item.subMenu && item.subMenu.some(sub => location.pathname.startsWith(sub.path)))
                  ? 'bg-primary text-primary-foreground'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
              {openParentMenu === item.name ? (
                <ChevronUp className="ml-auto h-4 w-4" />
              ) : (
                <ChevronDown className="ml-auto h-4 w-4" />
              )}
            </button>
            {openParentMenu === item.name && (
              <div className="ml-6 mt-1 space-y-1">
                {item.subMenu.map((subItem) => {
                  if (!subItem.roles.includes(user?.role)) return null;
                  const SubIcon = subItem.icon;
                  return (
                    <NavLink
                      key={subItem.name}
                      to={subItem.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    >
                      <SubIcon className="mr-3 h-4 w-4" />
                      {subItem.name}
                    </NavLink>
                  );
                })}
              </div>
            )}
          </div>
        );
      } else {
        return (
          <NavLink
            key={item.name}
            to={item.path}
            onClick={() => setIsMobileMenuOpen(false)}
            className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Icon className="mr-3 h-5 w-5" />
            {item.name}
          </NavLink>
        );
      }
    });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow pt-5 bg-white overflow-y-auto border-r">
          <div className="flex items-center flex-shrink-0 px-4">
            <div className="flex items-center space-x-3">
              {empresa.logo_full_url && (
                <img src={empresa.logo_full_url} alt="Logo" className="h-8 w-8 rounded-full object-cover" />
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{empresa.nome_fantasia}</h2>
                <p className="text-sm text-gray-600">Gerencial</p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">{renderMenuItems()}</nav>
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{empresa.nome_fantasia}</h1>
          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {isMobileMenuOpen && (
          <div className="mt-2">{renderMenuItems()}</div>
        )}
      </div>

      {/* Main */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
};

export default LayoutGerencial;
