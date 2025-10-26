import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';
import socket from './services/socket';
// Páginas do Cardápio Digital
import CardapioPage from './components/cardapio/CardapioPage';
import PublicCardapioPage from './components/cardapio/PublicCardapiopage';
import FinalizarPedido from './components/cardapio/FinalizarPedido';

// Páginas Gerenciais
import LoginGerencial from './components/gerencial/LoginGerencial';
import WelcomePage from './components/gerencial/WelcomePage';
import Dashboard from './components/gerencial/Dashboard';
import PedidosPage from './components/gerencial/PedidosPage';
import CaixaPage from './components/gerencial/CaixaPage';
import RecebimentoContasPage from './components/gerencial/RecebimentoContasPage';
import RelatorioContasPrazoPage from './components/gerencial/RelatorioContasPrazoPage';
import CadastrosClientesPage from './components/gerencial/CadastrosClientesPage';
import FormasPagamentoPage from './components/gerencial/FormasPagamentoPage';
import EnderecosPage from './components/gerencial/EnderecosPage';
import AvisosPageGerencial from './components/gerencial/AvisosPage';
import OrderStatusPage from './components/cardapio/OrderStatusPage';
import OrderStatusPagePublic from './components/cardapio/OrderStatusPagePublic';

// Componentes de Layout
import LayoutGerencial from './components/layout/LayoutGerencial';
import LayoutCardapio from './components/layout/LayoutCardapio';
import LayoutAdmin from './components/layout/LayoutAdmin';

// Páginas de Comercial
import LandingPage from './components/Comercial/LandingPage';
import VitrineEmpresas from './components/Comercial/VitrineEmpresas';

//Relatorios
import RelCaixa from './components/relatorios/RelCaixa';
import RelPedidos from './components/relatorios/RelPedidos';
import RelEstoque from './components/relatorios/RelEstoque';
import RelatoriosPage from './components/relatorios/RelatoriosPage';

import './App.css';

// IMPORTAR AS PÁGINAS DE CADASTRO
import CadastrosCategoriasPage from './components/gerencial/CadastrosPage';
import CadastrosProdutosPage from './components/gerencial/ProdutosPage';
import CadastrosFuncionariosPage from './components/gerencial/FuncionariosPage';
import CadastrosMesasPage from './components/gerencial/MesasPage';
import CadastrosAdicionaisPage from './components/gerencial/AdicionaisPage';
import ConfiguracoesPage from './components/gerencial/ConfiguracoesPage';

// IMPORTAR A PÁGINA DO ADMIN MASTER
import AdminDashboardPage from './components/admin/AdminDashboardPage';
import AvisosPage from './components/admin/AvisosPage';
import SessionExpiredHandler from './components/SessionExpiredHandler';


function App() {
  return (
    <Router>
      <AuthProvider>
        <EmpresaProvider>
          <CarrinhoProvider>
            <SessionExpiredHandler />
            <Routes>
              {/* Rota inicial - redireciona para uma empresa de exemplo */}
              <Route path="/" element={<LandingPage />} />
              
              {/* Rotas do Cardápio Digital (PÚBLICAS) */}
              {/* Cada rota define seu layout e página */}
              <Route path="/:slug" element={
                
                  <PublicCardapioPage />
                
              }/>
              <Route path="/:slug/comanda" element={
                <LayoutCardapio>
                  <CardapioPage />
                </LayoutCardapio>
              }/>
              
              {/* Finalizar Pedido é um modal dentro de CardapioPage, não uma rota separada */}
              {/* <Route path="/:slug/pedido" element={
                <LayoutCardapio>
                  <FinalizarPedido />
                </LayoutCardapio>
              } /> */}
              
              {/* Rota de Login Gerencial (para funcionários do restaurante) */}
              <Route path="/gerencial/:slug" element={<LoginGerencial />} />
              
              {/* ROTAS GERENCIAIS - Cada rota define seu layout e página */}
              {/* Página Inicial */}
              <Route path="/gerencial/:slug/inicio" element={
                <LayoutGerencial>
                  <WelcomePage />
                </LayoutGerencial>
              } />
              {/* Dashboard */}
              <Route path="/gerencial/:slug/dashboard" element={
                <LayoutGerencial>
                  <Dashboard />
                </LayoutGerencial>
              } />
               <Route path="/gerencial/:slug/mesas" element={
                <LayoutGerencial>
                  <CardapioPage/>
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/relatorios/caixa" element={
                <LayoutGerencial>
                  <RelCaixa/>
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/relatorios/pedidos" element={
                <LayoutGerencial>
                  <RelPedidos/>
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/relatorios/estoque" element={
                <LayoutGerencial>
                  <RelEstoque/>
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/relatorios" element={
                <LayoutGerencial>
                  <RelatoriosPage/>
                </LayoutGerencial>
              } />
              
              {/* Pedidos */}
              <Route path="/gerencial/:slug/pedidos" element={
                <LayoutGerencial>
                  <PedidosPage />
                </LayoutGerencial>
              } />
                {/* Pedidos */}
              <Route path="/gerencial/:slug/cozinha" element={
                <LayoutGerencial>
                  <OrderStatusPage />
                </LayoutGerencial>
              } />

              {/* Caixa */}
              <Route path="/gerencial/:slug/caixa" element={
                <LayoutGerencial>
                  <CaixaPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/recebimento-contas" element={
                <LayoutGerencial>
                  <RecebimentoContasPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/relatorios/contas-prazo" element={
                <LayoutGerencial>
                  <RelatorioContasPrazoPage />
                </LayoutGerencial>
              } />
              
              {/* ROTAS PARA OS SUB-MENUS DE CADASTROS */}
              <Route path="/gerencial/:slug/cadastros/categorias" element={
                <LayoutGerencial>
                  <CadastrosCategoriasPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/produtos" element={
                <LayoutGerencial>
                  <CadastrosProdutosPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/funcionarios" element={
                <LayoutGerencial>
                  <CadastrosFuncionariosPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/mesas" element={
                <LayoutGerencial>
                  <CadastrosMesasPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/adicionais" element={
                <LayoutGerencial>
                  <CadastrosAdicionaisPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/clientes" element={
                <LayoutGerencial>
                  <CadastrosClientesPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/enderecos" element={
                <LayoutGerencial>
                  <EnderecosPage />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/avisos" element={
                <LayoutGerencial>
                  <AvisosPageGerencial />
                </LayoutGerencial>
              } />
              <Route path="/gerencial/:slug/cadastros/formas-pagamento" element={
                <LayoutGerencial>
                  <FormasPagamentoPage />
                </LayoutGerencial>
              } />
              
              {/* Rota para Configurações (top-level) */}
              <Route path="/gerencial/:slug/configuracoes" element={
                <LayoutGerencial>
                  <ConfiguracoesPage />
                </LayoutGerencial>
              } />

              {/* Rota pai 'cadastros' - redireciona para categorias por padrão */}
              <Route path="/gerencial/:slug/cadastros" element={<Navigate to="categorias" replace />} />


              {/* ROTAS DO ADMIN MASTER */}
              {/* Login Admin Master */}
              <Route path="/admin/login" element={<LoginGerencial admin={true} />} />
              
              {/* Painel Admin Master */}
              {/* O dashboard principal do admin, que lista as empresas */}
              <Route path="/admin/dashboard" element={
                <LayoutAdmin>
                  <AdminDashboardPage />
                </LayoutAdmin>
              } />
              {/* Rota /admin/empresas também vai para o AdminDashboardPage */}
              <Route path="/admin/empresas" element={
                <LayoutAdmin>
                  <AdminDashboardPage />
                </LayoutAdmin>
              } />
              {/* Rota para gerenciar avisos */}
              <Route path="/admin/avisos" element={
                <LayoutAdmin>
                  <AvisosPage />
                </LayoutAdmin>
              } />

              {/* Rota para acompanhar pedido público */}
              <Route path=":slug/acompanhar/:id" element={<OrderStatusPagePublic />} />

              {/* Rota para lojas */}
              <Route path="/lojas" element={<VitrineEmpresas />} />

              {/* Rota para 404 global (captura qualquer outra rota não correspondida) */}
              <Route path="*" element={<div className="text-center p-8 text-red-500">Página Não Encontrada (404 Global)</div>} />

            </Routes>
          </CarrinhoProvider>
        </EmpresaProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;