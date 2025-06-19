import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { EmpresaProvider } from './contexts/EmpresaContext';
import { CarrinhoProvider } from './contexts/CarrinhoContext';

// Páginas do Cardápio Digital
import CardapioPage from './components/cardapio/CardapioPage';
import FinalizarPedido from './components/cardapio/FinalizarPedido';

// Páginas Gerenciais
import LoginGerencial from './components/gerencial/LoginGerencial';
import Dashboard from './components/gerencial/Dashboard';
import PedidosPage from './components/gerencial/PedidosPage';
import CaixaPage from './components/gerencial/CaixaPage';
import CadastrosPage from './components/gerencial/CadastrosPage';
import RelatoriosPage from './components/gerencial/RelatoriosPage';

// Componentes de Layout
import LayoutGerencial from './components/layout/LayoutGerencial';
import LayoutCardapio from './components/layout/LayoutCardapio';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <EmpresaProvider>
        <CarrinhoProvider>
          <Router>
            <Routes>
              {/* Rota inicial - redireciona para uma empresa de exemplo */}
              <Route path="/" element={<Navigate to="/demo-restaurante" replace />} />
              
              {/* Rotas do Cardápio Digital */}
              <Route path="/:slug" element={
                <LayoutCardapio>
                  <CardapioPage />
                </LayoutCardapio>
              } />
              
              <Route path="/:slug/pedido" element={
                <LayoutCardapio>
                  <FinalizarPedido />
                </LayoutCardapio>
              } />
              
              {/* Rotas Gerenciais */}
              <Route path="/gerencial/:slug" element={<LoginGerencial />} />
              
              <Route path="/gerencial/:slug/dashboard" element={
                <LayoutGerencial>
                  <Dashboard />
                </LayoutGerencial>
              } />
              
              <Route path="/gerencial/:slug/pedidos" element={
                <LayoutGerencial>
                  <PedidosPage />
                </LayoutGerencial>
              } />
              
              <Route path="/gerencial/:slug/caixa" element={
                <LayoutGerencial>
                  <CaixaPage />
                </LayoutGerencial>
              } />
              
              <Route path="/gerencial/:slug/cadastros" element={
                <LayoutGerencial>
                  <CadastrosPage />
                </LayoutGerencial>
              } />
              
              <Route path="/gerencial/:slug/relatorios" element={
                <LayoutGerencial>
                  <RelatoriosPage />
                </LayoutGerencial>
              } />
            </Routes>
          </Router>
        </CarrinhoProvider>
      </EmpresaProvider>
    </AuthProvider>
  );
}

export default App;

