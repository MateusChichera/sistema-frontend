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
  DollarSign,
  QrCode,
  Box,
  Home,
  MapPin,
  Bell,
  Navigation
} from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import QRCodeGerador from '../gerencial/QRCodeGerador';
import AvisosModal from '../gerencial/AvisosModal';
import AvisosToast from '../gerencial/AvisosToast';
import WhatsAppModal from '../gerencial/WhatsAppModal';


const LayoutGerencial = ({ children }) => {
  const { user, logout } = useAuth();
  const { empresa, loading: empresaLoading, isReady, loadEmpresa } = useEmpresa();
  const navigate = useNavigate();
  const location = useLocation();
  const { slug: urlSlugFromParams } = useParams();

  // Controla qual menu pai está atualmente expandido (null = nenhum)
  const [openParentMenu, setOpenParentMenu] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentResolvedSlug, setCurrentResolvedSlug] = useState(null);
  const [showQrModal, setShowQrModal] = useState(false);



  // Estado local para switches
  const [deliveryAtivo, setDeliveryAtivo] = useState(!empresa?.desativar_entrega);
  const [retiradaAtiva, setRetiradaAtiva] = useState(!empresa?.desativar_retirada);

  useEffect(() => {
    if (
      isReady &&
      !empresaLoading &&
      empresa &&
      empresa.status === 'Ativa' &&
      empresa.slug === urlSlugFromParams
    ) {
      setCurrentResolvedSlug(empresa.slug);
      setDeliveryAtivo(!empresa?.desativar_entrega);
      setRetiradaAtiva(!empresa?.desativar_retirada);
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
    { name: 'Início', icon: Home, path: `/gerencial/${currentSlug}/inicio`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Caixa', icon: DollarSign, path: `/gerencial/${currentSlug}/caixa`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
    { name: 'Recebimento de Contas', icon: CreditCard, path: `/gerencial/${currentSlug}/recebimento-contas`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
    { name: 'Mesas', icon: NotebookPen, path: `/gerencial/${currentSlug}/mesas`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Delivery', icon: Bike, path: `/gerencial/${currentSlug}/pedidos`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Cozinha', icon: ChefHat, path: `/gerencial/${currentSlug}/cozinha`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    { name: 'Motoboy', icon: Navigation, path: `/gerencial/${currentSlug}/motoboy/pedidos`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
    {
      name: 'Cardápio Digital',
      icon: UtensilsCrossed,
      isParent: true,
      roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'],
      subMenu: [
        { name: 'Acessar Cardápio', icon: Utensils, path: `/${currentSlug}`, roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
        { name: 'QRCode', icon: QrCode, action: () => setShowQrModal(true), roles: ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'] },
      ]
    },
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
        { name: 'Clientes', icon: Users, path: `/gerencial/${currentSlug}/cadastros/clientes`, roles: ['Proprietario', 'Gerente', 'Caixa'] },
        { name: 'Endereços', icon: MapPin, path: `/gerencial/${currentSlug}/cadastros/enderecos`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Avisos', icon: Bell, path: `/gerencial/${currentSlug}/cadastros/avisos`, roles: ['Proprietario', 'Gerente'] },
        { name: 'Funcionários', icon: UserCog, path: `/gerencial/${currentSlug}/cadastros/funcionarios`, roles: ['Proprietario'] },
        { name: 'Mesas', icon: Table, path: `/gerencial/${currentSlug}/cadastros/mesas`, roles: ['Proprietario', 'Gerente'] },
      ]
    },
    { name: 'Dashboard', icon: LayoutDashboard, path: `/gerencial/${currentSlug}/dashboard`, roles: ['Proprietario', 'Gerente'] },
    { name: 'Relatórios', icon: BarChart3, path: `/gerencial/${currentSlug}/relatorios`, roles: ['Proprietario', 'Gerente'] },
    { name: 'Configurações', icon: Settings, path: `/gerencial/${currentSlug}/configuracoes`, roles: ['Proprietario', 'Gerente'] },
  ];

  const handleLogout = () => {
    logout();
    navigate(`/gerencial/${currentSlug}`);
  };

  // Função para atualizar config de entrega/retirada
  const handleToggleConfig = async (field, value) => {
    if (!empresa || !empresa.slug) return;
    if (field === 'desativar_entrega') setDeliveryAtivo(!value);
    if (field === 'desativar_retirada') setRetiradaAtiva(!value);
    try {
      const headers = {};
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;
      // Monta objeto completo de config, alterando só o campo desejado
      const configToSend = {
        horario_funcionamento: empresa.horario_funcionamento || '',
        numero_mesas: empresa.numero_mesas || 0,
        taxa_entrega: empresa.taxa_entrega || 0.00,
        tempo_medio_preparo: empresa.tempo_medio_preparo || '',
        config_impressora: empresa.config_impressora || '',
        permitir_pedido_online: empresa.permitir_pedido_online ? 1 : 0,
        pedido_minimo_delivery: empresa.pedido_minimo_delivery || 0.00,
        desativar_entrega: field === 'desativar_entrega' ? (value ? 1 : 0) : (empresa.desativar_entrega ? 1 : 0),
        desativar_retirada: field === 'desativar_retirada' ? (value ? 1 : 0) : (empresa.desativar_retirada ? 1 : 0),
        tempo_corte_pedido_online: empresa.tempo_corte_pedido_online || '',
        mensagem_confirmacao_pedido: empresa.mensagem_confirmacao_pedido || '',
        auto_aprovar_pedidos: empresa.auto_aprovar_pedidos ? 1 : 0,
        cor_primaria_cardapio: empresa.cor_primaria_cardapio || '',
        mostrar_promocoes_na_home: empresa.mostrar_promocoes_na_home ? 1 : 0,
        layout_cardapio: empresa.layout_cardapio || 'grid',
        alerta_estoque_baixo_ativo: empresa.alerta_estoque_baixo_ativo ? 1 : 0,
        limite_estoque_baixo: empresa.limite_estoque_baixo || 0,
        enviar_email_confirmacao: empresa.enviar_email_confirmacao ? 1 : 0,
        som_notificacao_cozinha: empresa.som_notificacao_cozinha ? 1 : 0,
        som_notificacao_delivery: empresa.som_notificacao_delivery ? 1 : 0,
        valor_inicial_caixa_padrao: empresa.valor_inicial_caixa_padrao || 0.00,
        exibir_valores_fechamento_caixa: empresa.exibir_valores_fechamento_caixa ? 1 : 0,
        usa_controle_caixa: empresa.usa_controle_caixa ? 1 : 0,
        porcentagem_garcom: empresa.porcentagem_garcom ? 1 : 0,
        permitir_acompanhar_status: empresa.permitir_acompanhar_status ? 1 : 0,
      };
      await api.put(`/gerencial/${empresa.slug}/config`, configToSend, { headers });
      toast.success(`Configuração atualizada!`);
      await loadEmpresa(empresa.slug); // Atualiza contexto sem reload
    } catch (err) {
      toast.error('Erro ao atualizar configuração.');
    }
  };

  const renderMenuItems = () => {
    const menuElements = menuItems.map((item) => {
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
                  if (subItem.action) {
                    return (
                      <button
                        key={subItem.name}
                        onClick={() => { subItem.action(); setIsMobileMenuOpen(false); }}
                        className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      >
                        <SubIcon className="mr-3 h-4 w-4" />
                        {subItem.name}
                      </button>
                    );
                  } else {
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
                  }
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

    // Adiciona os switches e informações do usuário para todos os usuários
    // Filtra os elementos que não são null (usuários com permissão)
    const validMenuElements = menuElements.filter(element => element !== null);
    
    // Adiciona os switches e informações do usuário no final do menu
    validMenuElements.push(
      <div key="switches-and-user" className="px-2 py-2">
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2">
            <Switch
              id="switch-delivery"
              checked={deliveryAtivo}
              onCheckedChange={checked => handleToggleConfig('desativar_entrega', !checked)}
            />
            <span className={`text-sm font-semibold ${deliveryAtivo ? 'text-green-700' : 'text-red-600'}`}>{deliveryAtivo ? 'Delivery aberto' : 'Delivery fechado'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="switch-retirada"
              checked={retiradaAtiva}
              onCheckedChange={checked => handleToggleConfig('desativar_retirada', !checked)}
            />
            <span className={`text-sm font-semibold ${retiradaAtiva ? 'text-green-700' : 'text-red-600'}`}>{retiradaAtiva ? 'Retirada aberta' : 'Retirada fechada'}</span>
          </div>
        </div>
        
        <div className="flex-shrink-0 pt-4 border-t">
          <div className="flex items-center justify-between">
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
            <div className="flex items-center gap-2">
              <AvisosModal />
              <WhatsAppModal />
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    );

    return validMenuElements;
  };

  return (
    <div className="min-h-screen bg-blue-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop - Fixa */}
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
              {/* Logo e nome da empresa */}
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
          </div>

          <div className="mt-8 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">{renderMenuItems()}</nav>
          </div>
        </div>
      </div>

      {/* Mobile Header */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 shadow">
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
            <button
              className="text-lg font-semibold text-gray-900 focus:outline-none focus:underline"
              style={{ WebkitTapHighlightColor: 'transparent' }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              title="Ir para o topo"
            >
              {empresa.nome_fantasia}
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        {/* Menu mobile */}
        {isMobileMenuOpen && (
          <div className="mt-2">{renderMenuItems()}</div>
        )}
      </div>

      {/* Main - Com margem para compensar a sidebar fixa */}
      <main className="flex-1 p-6 md:ml-64">
        {children}
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" tabIndex={-1} onClick={e => { if (e.target === e.currentTarget) setShowQrModal(false); }} onKeyDown={e => { if (e.key === 'Escape') setShowQrModal(false); }}>
            <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 relative w-full max-w-md animate-fade-in-up border flex flex-col">
              <button onClick={() => setShowQrModal(false)} className="absolute top-2 right-2 text-gray-500 hover:text-red-500 text-xl font-bold">×</button>
              <h2 className="text-xl font-bold mb-4 text-center">QR Code do Cardápio Digital</h2>
              <QRCodeGerador slug={currentSlug} />
            </div>
          </div>
        )}

        {/* Modal de Relatórios */}

      </main>
      
      {/* Toast de Avisos */}
      <AvisosToast />
    </div>
  );
};

export default LayoutGerencial;
