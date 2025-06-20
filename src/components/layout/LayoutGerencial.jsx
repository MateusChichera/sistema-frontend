// frontend/src/components/layout/LayoutGerencial.jsx
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
  ChefHat
} from 'lucide-react';
import { Button } from '../ui/button';

const LayoutGerencial = ({ children }) => {
  const { user, logout } = useAuth();
  const { empresa, loading: empresaLoading, isReady } = useEmpresa(); 
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlugFromParams } = useParams();

  const [isCadastrosOpen, setIsCadastrosOpen] = useState(false);

  const [currentResolvedSlug, setCurrentResolvedSlug] = useState(null);

  useEffect(() => {
    console.log("LayoutGerencial useEffect: Início da execução para definir currentResolvedSlug.");
    console.log("  Estado Contexto: isReady:", isReady, "empresaLoading:", empresaLoading);
    console.log("  Objeto 'empresa':", empresa);
    console.log("  Slug da URL:", urlSlugFromParams);

    if (
      isReady &&                       
      !empresaLoading &&               
      empresa &&                       
      empresa.status === 'Ativa' &&    
      empresa.slug === urlSlugFromParams 
    ) {
      setCurrentResolvedSlug(empresa.slug);
      console.log("LayoutGerencial useEffect: currentResolvedSlug DEFINIDO como:", empresa.slug);
    } else {
      setCurrentResolvedSlug(null); 
      console.log("LayoutGerencial useEffect: currentResolvedSlug RESETADO (condição falhou).");
    }
  }, [empresa, empresaLoading, isReady, urlSlugFromParams]);

  if (!isReady || empresaLoading || !currentResolvedSlug) {
    console.log("LayoutGerencial: Mostrando 'Carregando painel gerencial...'");
    console.log("  Estado de Renderização: isReady:", isReady, "empresaLoading:", empresaLoading, "currentResolvedSlug:", currentResolvedSlug);
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <p className="text-gray-700">Carregando painel gerencial...</p>
      </div>
    );
  }

  const currentSlug = currentResolvedSlug; 

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: `/gerencial/${currentSlug}/dashboard`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Delivery', icon: UtensilsCrossed, path: `/gerencial/${currentSlug}/pedidos`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Caixa', icon: CreditCard, path: `/gerencial/${currentSlug}/caixa`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
    { name: 'Comanda', icon: Utensils, path: `/gerencial/${currentSlug}/comanda`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Pedidos', icon: ChefHat , path: `/gerencial/${currentSlug}/cozinha`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] }, 
    { 
        name: 'Cadastros', 
        icon: Users, 
        isParent: true, 
        roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'], 
        subMenu: [
            { name: 'Categorias', icon: Tag, path: `/gerencial/${currentSlug}/cadastros/categorias`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
            { name: 'Produtos', icon: Package, path: `/gerencial/${currentSlug}/cadastros/produtos`, roles: ['Proprietario', 'Gerente'] },
            { name: 'Formas de Pagamento', icon: Wallet, path: `/gerencial/${currentSlug}/cadastros/formas-pagamento`, roles: ['Proprietario', 'Gerente'] },
            { name: 'Funcionários', icon: UserCog, path: `/gerencial/${currentSlug}/cadastros/funcionarios`, roles: ['Proprietario'] },
            { name: 'Mesas', icon: Table, path: `/gerencial/${currentSlug}/cadastros/mesas`, roles: ['Proprietario', 'Gerente'] },
        ]
    },
    { name: 'Relatórios', icon: BarChart3, path: `/gerencial/${currentSlug}/relatorios`, roles: ['Proprietario', 'Gerente'] },
    { name: 'Configurações', icon: Settings, path: `/gerencial/${currentSlug}/configuracoes`, roles: ['Proprietario', 'Gerente'] }
  ];

  const handleLogout = () => {
    logout();
    navigate(`/gerencial/${currentSlug}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
                if (!item.roles.includes(user?.role)) {
                  return null;
                }

                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                
                if (item.isParent) {
                    return (
                        <div key={item.name}>
                            <button
                                onClick={() => setIsCadastrosOpen(!isCadastrosOpen)}
                                className={`w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                  isActive || (item.subMenu && item.subMenu.some(sub => location.pathname.startsWith(sub.path)))
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            >
                                <Icon className="mr-3 h-5 w-5" />
                                {item.name}
                                {isCadastrosOpen ? <ChevronUp className="ml-auto h-4 w-4" /> : <ChevronDown className="ml-auto h-4 w-4" />}
                            </button>
                            {isCadastrosOpen && (
                                <div className="ml-6 mt-1 space-y-1">
                                    {item.subMenu.map(subItem => {
                                        if (!subItem.roles.includes(user?.role)) {
                                            return null;
                                        }
                                        const SubIcon = subItem.icon;
                                        const isSubActive = location.pathname.startsWith(subItem.path);
                                        return (
                                            <NavLink
                                                key={subItem.name}
                                                to={subItem.path}
                                                className={({ isActive: navIsActive }) =>
                                                    `w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors ${
                                                        isSubActive
                                                            ? 'bg-secondary text-secondary-foreground'
                                                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                                                    }`
                                                }
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
                }
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

      <div className="flex flex-col flex-1">
        <div className="md:hidden bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-gray-900">{empresa.nome_fantasia}</h1>
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

export default LayoutGerencial;