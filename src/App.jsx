import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';

// Páginas do Cardápio Digital
import CardapioPage from './components/cardapio/CardapioPage';
import PublicCardapioPage from './components/cardapio/PublicCardapiopage';
import FinalizarPedido from './components/cardapio/FinalizarPedido';

// Páginas Gerenciais
import LoginGerencial from './components/gerencial/LoginGerencial';
import Dashboard from './components/gerencial/Dashboard';
import PedidosPage from './components/gerencial/PedidosPage';
import CaixaPage from './components/gerencial/CaixaPage';
import RelatoriosPage from './components/gerencial/RelatoriosPage';
import OrderStatusPage from './components/cardapio/OrderStatusPage';

// Componentes de Layout
import LayoutGerencial from './components/layout/LayoutGerencial';
import LayoutCardapio from './components/layout/LayoutCardapio';
import LayoutAdmin from './components/layout/LayoutAdmin';

import './App.css';

// IMPORTAR AS PÁGINAS DE CADASTRO
import CadastrosCategoriasPage from './components/gerencial/CadastrosPage';
import CadastrosProdutosPage from './components/gerencial/ProdutosPage';
import CadastrosFormasPagamentoPage from './components/gerencial/FormasPagamentoPage';
import CadastrosFuncionariosPage from './components/gerencial/FuncionariosPage';
import CadastrosMesasPage from './components/gerencial/MesasPage';
import ConfiguracoesPage from './components/gerencial/ConfiguracoesPage';

// IMPORTAR A PÁGINA DO ADMIN MASTER
import AdminDashboardPage from './components/admin/AdminDashboardPage';


function App() {
  return (
    <AuthProvider>
      <EmpresaProvider>
        <CarrinhoProvider>
          <Router>
            <Routes>
              {/* Rota inicial - redireciona para uma empresa de exemplo */}
              <Route path="/" element={<Navigate to="/demo-restaurante" replace />} />
              
              {/* Rotas do Cardápio Digital (PÚBLICAS) */}
              {/* Cada rota define seu layout e página */}
              <Route path="/:slug" element={
                <LayoutCardapio>
                  <PublicCardapioPage />
                </LayoutCardapio>
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
              {/* Dashboard */}
              <Route path="/gerencial/:slug/dashboard" element={
                <LayoutGerencial>
                  <Dashboard />
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
              
              {/* Relatórios */}
              <Route path="/gerencial/:slug/relatorios" element={
                <LayoutGerencial>
                  <RelatoriosPage />
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
              <Route path="/gerencial/:slug/cadastros/formas-pagamento" element={
                <LayoutGerencial>
                  <CadastrosFormasPagamentoPage />
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

              {/* Rota para 404 global (captura qualquer outra rota não correspondida) */}
              <Route path="*" element={<div className="text-center p-8 text-red-500">Página Não Encontrada (404 Global)</div>} />

            </Routes>
          </Router>
        </CarrinhoProvider>
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;