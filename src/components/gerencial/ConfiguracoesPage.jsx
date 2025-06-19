// frontend/src/components/gerencial/ConfiguracoesPage.jsx
import React, { useState, useEffect } from 'react';
import { useEmpresa } from '../../contexts/EmpresaContext';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { Textarea } from '../ui/textarea';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Mapa de cores Tailwind para seus valores hexadecimais (para exibição)
// Você pode expandir esta lista com mais cores e tons se desejar
const tailwindColorMap = {
  'gray-500': '#6B7280',
  'red-500': '#EF4444',
  'orange-500': '#F97316',
  'yellow-500': '#F59E0B',
  'green-500': '#22C55E',
  'teal-500': '#14B8A6',
  'blue-500': '#3B82F6',
  'indigo-500': '#6366F1',
  'purple-500': '#A855F7',
  'pink-500': '#EC4899',
  'rose-500': '#F43F5E',
  'cyan-500': '#06B6D4',
  'emerald-500': '#10B981',
  'fuchsia-500': '#D946EF',
  'amber-500': '#F59E0B',
};


const ConfiguracoesPage = () => {
  const { empresa, loading: empresaLoading, loadEmpresa } = useEmpresa();
  const { user, token } = useAuth();
  
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    logo_file: null,
    horario_funcionamento: '',
    numero_mesas: '',
    taxa_entrega: '',
    tempo_medio_preparo: '',
    config_impressora: '',
    permitir_pedido_online: true,
    pedido_minimo_delivery: '',
    desativar_entrega: false,
    desativar_retirada: false,
    tempo_corte_pedido_online: '',
    mensagem_confirmacao_pedido: '',
    auto_aprovar_pedidos: false,
    cor_primaria_cardapio: '', // Valor será a classe Tailwind, ex: 'red-500'
    mostrar_promocoes_na_home: false,
    layout_cardapio: 'grid',
    alerta_estoque_baixo_ativo: false,
    limite_estoque_baixo: '',
    enviar_email_confirmacao: false,
  });
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [previewLogoUrl, setPreviewLogoUrl] = useState(null);

  const [activeTab, setActiveTab] = useState('detalhes');


  const fetchConfig = async () => {
    if (empresaLoading || !empresa || !empresa.slug || !user) {
      setLoadingConfig(true);
      return;
    }
    
    const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
    if (!canManage) {
      setError('Você não tem permissão para gerenciar as configurações da empresa.');
      setLoadingConfig(false);
      return;
    }

    setLoadingConfig(true);
    setError(null);
    try {
      if (empresa) {
        setFormData({
          logo_file: null,
          horario_funcionamento: empresa.horario_funcionamento || '',
          numero_mesas: empresa.numero_mesas || '',
          taxa_entrega: empresa.taxa_entrega || '',
          tempo_medio_preparo: empresa.tempo_medio_preparo || '',
          config_impressora: empresa.config_impressora || '',
          permitir_pedido_online: !!empresa.permitir_pedido_online,
          pedido_minimo_delivery: empresa.pedido_minimo_delivery || '',
          desativar_entrega: !!empresa.desativar_entrega,
          desativar_retirada: !!empresa.desativar_retirada,
          tempo_corte_pedido_online: empresa.tempo_corte_pedido_online || '',
          mensagem_confirmacao_pedido: empresa.mensagem_confirmacao_pedido || '',
          auto_aprovar_pedidos: !!empresa.auto_aprovar_pedidos,
          cor_primaria_cardapio: empresa.cor_primaria_cardapio || '', // <--- PREENCHE A CLASSE TAILWIND
          mostrar_promocoes_na_home: !!empresa.mostrar_promocoes_na_home,
          layout_cardapio: empresa.layout_cardapio || 'grid',
          alerta_estoque_baixo_ativo: !!empresa.alerta_estoque_baixo_ativo,
          limite_estoque_baixo: empresa.limite_estoque_baixo || '',
          enviar_email_confirmacao: !!empresa.enviar_email_confirmacao,
        });
        setPreviewLogoUrl(null);
        toast.success("Configurações carregadas com sucesso!");
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar configurações.');
      console.error("Erro ao carregar configurações:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar configurações.');
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (empresa && !empresaLoading) {
      fetchConfig();
    }
  }, [empresa, empresaLoading, user]);

  const handleFormChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [id]: type === 'checkbox' || type === 'switch' ? checked : value 
    }));
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, logo_file: file }));
    if (file) {
      setPreviewLogoUrl(URL.createObjectURL(file));
    } else {
      setPreviewLogoUrl(null);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    if (!empresa || !empresa.slug) { toast.error('Dados da empresa não carregados.'); return; }

    setLoadingConfig(true);
    setError(null);
    try {
      const dataToSend = {
        horario_funcionamento: formData.horario_funcionamento,
        numero_mesas: parseInt(formData.numero_mesas) || 0,
        taxa_entrega: parseFloat(formData.taxa_entrega) || 0.00,
        tempo_medio_preparo: formData.tempo_medio_preparo,
        config_impressora: formData.config_impressora,
        permitir_pedido_online: formData.permitir_pedido_online ? 1 : 0,
        pedido_minimo_delivery: parseFloat(formData.pedido_minimo_delivery) || 0.00,
        desativar_entrega: formData.desativar_entrega ? 1 : 0,
        desativar_retirada: formData.desativar_retirada ? 1 : 0,
        tempo_corte_pedido_online: formData.tempo_corte_pedido_online,
        mensagem_confirmacao_pedido: formData.mensagem_confirmacao_pedido,
        auto_aprovar_pedidos: formData.auto_aprovar_pedidos ? 1 : 0,
        cor_primaria_cardapio: formData.cor_primaria_cardapio, // <--- ENVIA A CLASSE TAILWIND
        mostrar_promocoes_na_home: formData.mostrar_promocoes_na_home ? 1 : 0,
        layout_cardapio: formData.layout_cardapio,
        alerta_estoque_baixo_ativo: formData.alerta_estoque_baixo_ativo ? 1 : 0,
        limite_estoque_baixo: parseInt(formData.limite_estoque_baixo) || 0,
        enviar_email_confirmacao: formData.enviar_email_confirmacao ? 1 : 0,
      };

      await api.put(`/gerencial/${empresa.slug}/config`, dataToSend, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (formData.logo_file) {
        setIsUploadingLogo(true);
        const logoFormData = new FormData();
        logoFormData.append('logo', formData.logo_file);

        try {
          await api.post(`/gerencial/${empresa.slug}/config/upload-logo`, logoFormData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${token}`
            },
          });
          toast.success("Logo atualizada com sucesso!");
        } catch (logoErr) {
          toast.error("Erro ao fazer upload da logo: " + (logoErr.response?.data?.message || logoErr.message));
          console.error("Erro upload logo:", logoErr);
        } finally {
          setIsUploadingLogo(false);
        }
      }

      await loadEmpresa(empresa.slug); 
      
      toast.success('Configurações salvas com sucesso!');

    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar configurações.');
      toast.error(err.response?.data?.message || 'Erro ao salvar configurações.');
      console.error("Erro ao salvar configurações:", err);
    } finally {
      setLoadingConfig(false);
      setFormData(prev => ({ ...prev, logo_file: null }));
      setPreviewLogoUrl(null);
      document.getElementById('logo_file').value = '';
    }
  };

  const canManage = user?.role === 'Proprietario' || user?.role === 'Gerente';
  const canView = ['Proprietario', 'Gerente', 'Funcionario', 'Caixa'].includes(user?.role);


  if (empresaLoading || !empresa) {
    return <div className="p-4 text-center text-gray-600">Carregando dados da empresa...</div>;
  }
  
  if (!canView) {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para visualizar esta página.</div>;
  }

  if (loadingConfig) {
    return <div className="p-4 text-center text-gray-600">Carregando configurações...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Configurações da Empresa - {empresa.nome_fantasia}</h2>

      {/* Adicionado o componente Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="detalhes">Detalhes da Empresa</TabsTrigger>
          <TabsTrigger value="pedidosCardapio">Pedidos e Cardápio</TabsTrigger>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
        </TabsList>

        <form onSubmit={handleSaveConfig} className="mt-4">
          {/* ABA 1: DETALHES DA EMPRESA */}
          <TabsContent value="detalhes" className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Informações Gerais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                {/* Campo Logo */}
                <div className="col-span-full">
                  <Label htmlFor="logo_file">Logo da Empresa (opcional)</Label>
                  <Input
                    id="logo_file"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={!canManage || isUploadingLogo}
                  />
                  <div className="mt-2 flex space-x-4">
                    {empresa.logo_full_url && (
                      <div className="flex flex-col items-center">
                        <img 
                          src={empresa.logo_full_url} 
                          alt="Logo atual" 
                          className="h-24 w-24 object-contain rounded-md border" 
                        />
                        <p className="text-sm text-gray-600 mt-1">Atual</p>
                      </div>
                    )}
                    {previewLogoUrl && (
                      <div className="flex flex-col items-center">
                        <img 
                          src={previewLogoUrl} 
                          alt="Nova logo preview" 
                          className="h-24 w-24 object-contain rounded-md border" 
                        />
                        <p className="text-sm text-blue-600 mt-1">Nova (Prévia)</p>
                      </div>
                    )}
                  </div>
                  {isUploadingLogo && <p className="text-sm text-blue-500 flex items-center mt-2"><Loader2 className="animate-spin mr-2"/> Fazendo upload da logo...</p>}
                </div>

                {/* Horário de Funcionamento */}
                <div className="col-span-full">
                  <Label htmlFor="horario_funcionamento">Horário de Funcionamento</Label>
                  <Textarea
                    id="horario_funcionamento"
                    placeholder="Ex: Seg-Sex: 09h-18h, Sáb: 09h-14h"
                    value={formData.horario_funcionamento}
                    onChange={handleFormChange}
                    rows={3}
                    disabled={!canManage}
                  />
                </div>

                {/* Número de Mesas */}
                <div>
                  <Label htmlFor="numero_mesas">Número de Mesas</Label>
                  <Input
                    id="numero_mesas"
                    type="number"
                    min="0"
                    placeholder="Ex: 10"
                    value={formData.numero_mesas}
                    onChange={handleFormChange}
                    disabled={!canManage}
                  />
                </div>

                {/* Taxa de Entrega */}
                <div>
                  <Label htmlFor="taxa_entrega">Taxa de Entrega (R$)</Label>
                  <Input
                    id="taxa_entrega"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Ex: 5.00"
                    value={formData.taxa_entrega}
                    onChange={handleFormChange}
                    disabled={!canManage}
                  />
                </div>

                {/* Tempo Médio de Preparo */}
                <div>
                  <Label htmlFor="tempo_medio_preparo">Tempo Médio de Preparo</Label>
                  <Input
                    id="tempo_medio_preparo"
                    type="text"
                    placeholder="Ex: 20-30 minutos"
                    value={formData.tempo_medio_preparo}
                    onChange={handleFormChange}
                    disabled={!canManage}
                  />
                </div>

                {/* Configuração da Impressora */}
                <div className="col-span-full">
                  <Label htmlFor="config_impressora">Configuração da Impressora (JSON ou Texto)</Label>
                  <Textarea
                    id="config_impressora"
                    placeholder="Ex: { 'tipo': 'termica', 'ip': '192.168.1.100' }"
                    value={formData.config_impressora}
                    onChange={handleFormChange}
                    rows={4}
                    disabled={!canManage}
                  />
                </div>
            </div>
          </TabsContent>

          {/* ABA 2: CONFIGURAÇÕES DE PEDIDO E CARDÁPIO */}
          <TabsContent value="pedidosCardapio" className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Configurações de Pedido e Cardápio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex items-center space-x-2 col-span-full">
                <Switch
                  id="permitir_pedido_online"
                  checked={formData.permitir_pedido_online}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, permitir_pedido_online: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="permitir_pedido_online">Permitir Pedido Online (Cardápio Digital)</Label>
              </div>

              <div>
                <Label htmlFor="pedido_minimo_delivery">Pedido Mínimo para Delivery (R$)</Label>
                <Input
                  id="pedido_minimo_delivery"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Ex: 20.00"
                  value={formData.pedido_minimo_delivery}
                  onChange={handleFormChange}
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="desativar_entrega"
                  checked={formData.desativar_entrega}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, desativar_entrega: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="desativar_entrega">Desativar Opção de Entrega (Delivery)</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="desativar_retirada"
                  checked={formData.desativar_retirada}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, desativar_retirada: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="desativar_retirada">Desativar Opção de Retirada no Local</Label>
              </div>

              <div>
                <Label htmlFor="tempo_corte_pedido_online">Tempo de Corte Pedido Online (HH:MM)</Label>
                <Input
                  id="tempo_corte_pedido_online"
                  type="text"
                  placeholder="Ex: 22:00"
                  value={formData.tempo_corte_pedido_online}
                  onChange={handleFormChange}
                  disabled={!canManage}
                />
              </div>

              <div className="col-span-full">
                <Label htmlFor="mensagem_confirmacao_pedido">Mensagem de Confirmação de Pedido</Label>
                <Textarea
                  id="mensagem_confirmacao_pedido"
                  placeholder="Ex: Seu pedido foi recebido e está sendo preparado!"
                  value={formData.mensagem_confirmacao_pedido}
                  onChange={handleFormChange}
                  rows={3}
                  disabled={!canManage}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto_aprovar_pedidos"
                  checked={formData.auto_aprovar_pedidos}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, auto_aprovar_pedidos: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="auto_aprovar_pedidos">Aprovar Pedidos Automaticamente</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="enviar_email_confirmacao"
                  checked={formData.enviar_email_confirmacao}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, enviar_email_confirmacao: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="enviar_email_confirmacao">Enviar Email de Confirmação de Pedido</Label>
              </div>

              {/* CAMPO DE SELEÇÃO DE COR */}
              <div className="col-span-full">
                <Label htmlFor="cor_primaria_cardapio" className="mb-2 block">Cor Primária do Cardápio</Label>
                <div className="flex items-center space-x-2">
                  <Select
                    value={formData.cor_primaria_cardapio}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, cor_primaria_cardapio: value }))}
                    disabled={!canManage}
                  >
                    <SelectTrigger id="cor_primaria_cardapio" className="w-[180px]">
                      <SelectValue placeholder="Escolha uma cor" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(tailwindColorMap).map(([tailwindClass, hex]) => (
                        <SelectItem key={tailwindClass} value={tailwindClass}>
                          <div className="flex items-center">
                            <div className="h-4 w-4 rounded-full mr-2" style={{ backgroundColor: hex }}></div>
                            {tailwindClass}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {/* Pré-visualização da cor selecionada */}
                  {formData.cor_primaria_cardapio && tailwindColorMap[formData.cor_primaria_cardapio] && (
                    <div
                      className="h-8 w-8 rounded-full border border-gray-300"
                      style={{ backgroundColor: tailwindColorMap[formData.cor_primaria_cardapio] }}
                      title={`Cor selecionada: ${formData.cor_primaria_cardapio}`}
                    ></div>
                  )}
                  <p className="text-sm text-gray-500 ml-2">Ex: red-500</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="mostrar_promocoes_na_home"
                  checked={formData.mostrar_promocoes_na_home}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, mostrar_promocoes_na_home: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="mostrar_promocoes_na_home">Mostrar Promoções na Página Inicial</Label>
              </div>

              <div>
                <Label htmlFor="layout_cardapio">Layout Padrão do Cardápio</Label>
                <Select
                  value={formData.layout_cardapio}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, layout_cardapio: value }))}
                  disabled={!canManage}
                >
                  <SelectTrigger id="layout_cardapio"><SelectValue placeholder="Selecione o layout" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="grid">Grid</SelectItem>
                    <SelectItem value="lista">Lista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          {/* ABA 3: CONFIGURAÇÕES DE ESTOQUE */}
          <TabsContent value="estoque" className="p-4 border rounded-lg bg-gray-50">
            <h3 className="text-xl font-semibold mb-4 text-gray-700">Configurações de Estoque</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div className="flex items-center space-x-2">
                <Switch
                  id="alerta_estoque_baixo_ativo"
                  checked={formData.alerta_estoque_baixo_ativo}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, alerta_estoque_baixo_ativo: checked }))}
                  disabled={!canManage}
                />
                <Label htmlFor="alerta_estoque_baixo_ativo">Ativar Alerta de Estoque Baixo</Label>
              </div>
              <div>
                <Label htmlFor="limite_estoque_baixo">Limite para Alerta de Estoque Baixo</Label>
                <Input
                  id="limite_estoque_baixo"
                  type="number"
                  min="0"
                  placeholder="Ex: 10"
                  value={formData.limite_estoque_baixo}
                  onChange={handleFormChange}
                  disabled={!canManage}
                />
              </div>
            </div>
          </TabsContent>

          {canManage && (
            <div className="flex gap-2 mt-6 justify-end col-span-full">
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white flex items-center">
                Salvar Configurações {loadingConfig && <Loader2 className="animate-spin ml-2 h-4 w-4" />}
              </Button>
            </div>
          )}
        </form>
      </Tabs>
    </div>
  );
};

export default ConfiguracoesPage;