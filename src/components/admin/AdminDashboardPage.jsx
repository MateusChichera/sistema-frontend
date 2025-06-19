// frontend/src/components/admin/AdminDashboardPage.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2 } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { Switch } from '../ui/switch';

const AdminDashboardPage = () => {
  const { user, token } = useAuth();
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState(null); // ID da empresa sendo editada (usado para buscar dados completos)
  const [formData, setFormData] = useState({
    nome_fantasia: '',
    razao_social: '',
    cnpj: '',
    email_contato: '',
    telefone_contato: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    valor_mensalidade: 99.90,
    status: 'Ativa',
    proprietario_nome: '',
    proprietario_email: '',
    proprietario_senha: ''
  });

  const [isPessoaFisica, setIsPessoaFisica] = useState(false);
  const [isFetchingDoc, setIsFetchingDoc] = useState(false);
  const [docError, setDocError] = useState('');

  // Estado para o campo de busca
  const [searchTerm, setSearchTerm] = useState('');


  const fetchEmpresas = async () => {
    if (!user || user.email !== 'admin@sistema.com') {
      setError('Acesso negado. Apenas o Administrador Master pode gerenciar empresas.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/admin/empresas', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmpresas(response.data);
      toast.success("Empresas carregadas com sucesso!");
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao carregar empresas.');
      console.error("Erro ao carregar empresas:", err);
      toast.error(err.response?.data?.message || 'Erro ao carregar empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmpresas();
  }, [user, token]);

  const filteredEmpresas = useMemo(() => {
    if (!searchTerm) {
      return empresas;
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return empresas.filter(emp =>
      emp.nome_fantasia.toLowerCase().includes(lowerCaseSearchTerm) ||
      emp.razao_social.toLowerCase().includes(lowerCaseSearchTerm) ||
      emp.cnpj.includes(lowerCaseSearchTerm) ||
      emp.slug.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [empresas, searchTerm]);


  const handleFormChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const fetchDocData = async (docValue) => {
    const cleanedDoc = docValue.replace(/\D/g, '');

    if (isPessoaFisica) {
      if (cleanedDoc.length !== 11) {
        setDocError('CPF deve conter 11 dígitos.');
        return;
      }
      setDocError('');
      toast.info("Para CPF, o preenchimento automático de dados da empresa não está disponível.");
      return;
    } else { // CNPJ
      if (cleanedDoc.length !== 14) {
        setDocError('CNPJ deve conter 14 dígitos.');
        return;
      }

      setIsFetchingDoc(true);
      setDocError('');
      try {
        const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanedDoc}`);
        const data = await response.json();

        if (response.ok) {
          setFormData(prev => ({
            ...prev,
            nome_fantasia: data.nome_fantasia || '',
            razao_social: data.razao_social || '',
            endereco: `${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}`,
            cidade: data.municipio || '',
            estado: data.uf || '',
            cep: data.cep || '',
            telefone_contato: data.ddd_telefone_1 ? `(${data.ddd_telefone_1}) ${data.telefone_1}` : '',
            email_contato: data.email || '',
          }));
          toast.success("Dados do CNPJ preenchidos automaticamente!");
        } else {
          setDocError(data.message || 'CNPJ não encontrado ou inválido.');
          toast.error(data.message || 'CNPJ não encontrado ou inválido.');
        }
      } catch (err) {
        setDocError('Erro ao buscar CNPJ. Verifique sua conexão.');
        toast.error('Erro ao buscar CNPJ. Verifique sua conexão.');
        console.error("Erro ao buscar CNPJ:", err);
      } finally {
        setIsFetchingDoc(false);
      }
    }
  };

  const handleDocBlur = (e) => {
    const docValue = e.target.value;
    if (docValue && !editingEmpresa) { // Apenas para criação de nova empresa
      fetchDocData(docValue);
    }
  };

  const handleEmpresaSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanedDoc = formData.cnpj.replace(/\D/g, '');
    if (isPessoaFisica && cleanedDoc.length !== 11) {
      setDocError('CPF deve conter 11 dígitos.');
      setLoading(false);
      return;
    }
    if (!isPessoaFisica && cleanedDoc.length !== 14) {
      setDocError('CNPJ deve conter 14 dígitos.');
      setLoading(false);
      return;
    }
    
    try {
      if (editingEmpresa) {
        await api.put(`/admin/empresas/${editingEmpresa.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Empresa atualizada com sucesso!');
      } else {
        await api.post('/admin/empresas', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Empresa criada com sucesso! Proprietário inicial também cadastrado.');
      }
      setIsFormOpen(false);
      setEditingEmpresa(null);
      setFormData({});
      fetchEmpresas();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar empresa.');
      toast.error(err.response?.data?.message || 'Erro ao salvar empresa.');
      console.error("Erro ao salvar empresa:", err);
    } finally {
      setLoading(false);
    }
  };


  // --- NOVO: LÓGICA DE ABRIR FORMULÁRIO DE EDIÇÃO COM DADOS COMPLETOS ---
  const handleOpenForm = async (empresaToEditId = null) => {
    setDocError('');
    setIsFetchingDoc(false);
    
    if (empresaToEditId) { // Se for edição, busca os dados completos
      setLoading(true); // Ativa o loading enquanto busca os dados
      try {
        const response = await api.get(`/admin/empresas/${empresaToEditId}`, { // <--- CHAMA A ROTA POR ID AQUI!
            headers: { Authorization: `Bearer ${token}` }
        });
        const fullEmpresaData = response.data; // Dados completos da empresa

        const isPFfromDB = fullEmpresaData.cnpj.replace(/\D/g, '').length === 11;
        setIsPessoaFisica(isPFfromDB);
        setEditingEmpresa(fullEmpresaData); // Define o objeto completo como editingEmpresa

        setFormData({
          nome_fantasia: fullEmpresaData.nome_fantasia || '',
          razao_social: fullEmpresaData.razao_social || '',
          cnpj: fullEmpresaData.cnpj || '',
          email_contato: fullEmpresaData.email_contato || '',
          telefone_contato: fullEmpresaData.telefone_contato || '',
          endereco: fullEmpresaData.endereco || '',
          cidade: fullEmpresaData.cidade || '',
          estado: fullEmpresaData.estado || '',
          cep: fullEmpresaData.cep || '',
          valor_mensalidade: parseFloat(fullEmpresaData.valor_mensalidade) || 99.90,
          status: fullEmpresaData.status || 'Ativa',
          proprietario_nome: '', // Campos de proprietário são apenas para criação
          proprietario_email: '',
          proprietario_senha: ''
        });
        setIsFormOpen(true); // Abre o modal após carregar os dados
      } catch (err) {
        toast.error(err.response?.data?.message || 'Erro ao carregar dados da empresa para edição.');
        console.error("Erro ao carregar empresa para edição:", err);
        setEditingEmpresa(null); // Reseta se der erro
        setIsFormOpen(false); // Fecha o modal se falhar
      } finally {
        setLoading(false); // Desativa o loading
      }
    } else { // Se for nova empresa
      setIsPessoaFisica(false); // Nova empresa começa como PJ
      setEditingEmpresa(null); // Garante que não está em modo de edição
      setFormData({
        nome_fantasia: '', razao_social: '', cnpj: '', email_contato: '',
        telefone_contato: '', endereco: '', cidade: '', estado: '', cep: '',
        valor_mensalidade: 99.90, status: 'Ativa',
        proprietario_nome: '', proprietario_email: '', proprietario_senha: ''
      });
      setIsFormOpen(true); // Abre o modal imediatamente
    }
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingEmpresa(null);
    setFormData({});
    setDocError('');
    setIsPessoaFisica(false);
  };


  if (loading) {
    return <div className="p-4 text-center text-gray-600">Carregando empresas...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600 text-center">{error}</div>;
  }

  if (!user || user.email !== 'admin@sistema.com') {
    return <div className="p-4 text-red-600 text-center">Você não tem permissão para acessar esta página.</div>;
  }
  
  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Gerenciar Empresas - Admin Master</h2>

      <Button onClick={() => handleOpenForm()} className="mb-6 bg-green-600 hover:bg-green-700">
        Criar Nova Empresa
      </Button>

      {/* Campo de Busca de Empresas */}
      <div className="mb-6">
        <Label htmlFor="searchEmpresas">Buscar Empresa</Label>
        <Input
          id="searchEmpresas"
          type="text"
          placeholder="Nome, CNPJ, Slug..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>


      {filteredEmpresas.length === 0 ? (
        <p className="text-gray-600">Nenhuma empresa encontrada ou nenhum resultado para a busca.</p>
      ) : (
        <div className="overflow-x-auto">
          <Table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <TableHeader className="bg-gray-100">
              <TableRow>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">ID</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Nome Fantasia</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">CNPJ/CPF</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Slug</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Status</TableHead>
                <TableHead className="py-2 px-4 border-b text-left text-sm font-medium text-gray-600">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmpresas.map((emp) => (
                <TableRow key={emp.id} className="hover:bg-gray-50">
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{emp.id}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{emp.nome_fantasia}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{emp.cnpj}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">{emp.slug}</TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm text-gray-800">
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      emp.status === 'Ativa' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {emp.status}
                    </span>
                  </TableCell>
                  <TableCell className="py-2 px-4 border-b text-sm">
                    {/* Passa apenas o ID da empresa para a função, que buscará os detalhes completos */}
                    <Button 
                      onClick={() => handleOpenForm(emp.id)} 
                      variant="outline" 
                      size="sm" 
                      className="mr-2"
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Modal para Adicionar/Editar Empresa */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        {/* Adicionado um loader condicional para quando a edição está buscando os dados */}
        {loading && editingEmpresa && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50 rounded-lg">
                <Loader2 className="animate-spin text-primary h-8 w-8" />
                <span className="ml-2 text-primary">Carregando dados da empresa...</span>
            </div>
        )}
        <DialogContent className="max-w-screen-md overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingEmpresa ? `Editar Empresa: ${editingEmpresa.nome_fantasia}` : 'Criar Nova Empresa'}</DialogTitle>
            <DialogDescription>
              {editingEmpresa ? `Altere os dados da empresa ${editingEmpresa.nome_fantasia}.` : 'Preencha os dados para uma nova empresa e seu proprietário inicial.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEmpresaSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo CNPJ/CPF com Máscara e Toggle - POSICIONADO NO INÍCIO */}
            <div className="col-span-full">
              <div className="flex items-center space-x-2 mb-2">
                <Switch
                  id="isPessoaFisica"
                  checked={isPessoaFisica}
                  onCheckedChange={(checked) => {
                    setIsPessoaFisica(checked);
                    setFormData(prev => ({ ...prev, cnpj: '' }));
                    setDocError('');
                  }}
                  disabled={!!editingEmpresa || isFetchingDoc}
                />
                <Label htmlFor="isPessoaFisica">Pessoa Física (CPF)</Label>
              </div>
              <Label htmlFor="cnpj">{isPessoaFisica ? 'CPF' : 'CNPJ'}</Label>
              <div className="flex items-center space-x-2">
                <IMaskInput
                  mask={isPessoaFisica ? '000.000.000-00' : '00.000.000/0000-00'}
                  radix="."
                  value={formData.cnpj}
                  onAccept={(value, mask) => setFormData(prev => ({ ...prev, cnpj: value }))}
                  onBlur={handleDocBlur}
                  disabled={!!editingEmpresa || isFetchingDoc} // Desabilitar na edição e enquanto busca
                  placeholder={isPessoaFisica ? '000.000.000-00' : '00.000.000/0000-00'}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                />
                {isFetchingDoc && <Loader2 className="animate-spin text-primary h-5 w-5" />}
              </div>
              {docError && <p className="text-red-500 text-xs mt-1">{docError}</p>}
            </div>

            {/* Campos de Dados da Empresa */}
            <div className="col-span-full">
              <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
              <Input id="nome_fantasia" value={formData.nome_fantasia} onChange={handleFormChange} required />
            </div>
            <div className="col-span-full">
              <Label htmlFor="razao_social">Razão Social</Label>
              <Input id="razao_social" value={formData.razao_social} onChange={handleFormChange} required />
            </div>
            
            {/* Endereço */}
            <div className="col-span-full">
              <Label htmlFor="endereco">Endereço</Label>
              <Input id="endereco" value={formData.endereco} onChange={handleFormChange} />
            </div>
            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input id="cidade" value={formData.cidade} onChange={handleFormChange} />
            </div>
            <div>
              <Label htmlFor="estado">Estado (UF)</Label>
              <Input id="estado" value={formData.estado} onChange={handleFormChange} maxLength="2" />
            </div>
            <div>
              <Label htmlFor="cep">CEP</Label>
              <IMaskInput
                mask="00000-000"
                value={formData.cep}
                onAccept={(value, mask) => setFormData(prev => ({ ...prev, cep: value }))}
                placeholder="00000-000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            {/* Contato */}
            <div>
              <Label htmlFor="telefone_contato">Telefone de Contato</Label>
              <IMaskInput
                mask="(00) 00000-0000"
                value={formData.telefone_contato}
                onAccept={(value, mask) => setFormData(prev => ({ ...prev, telefone_contato: value }))}
                placeholder="(00) 00000-0000"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
            <div>
              <Label htmlFor="email_contato">Email de Contato</Label>
              <Input id="email_contato" type="email" value={formData.email_contato} onChange={handleFormChange} required />
            </div>
            
            {/* Mensalidade e Status */}
            <div>
              <Label htmlFor="valor_mensalidade">Valor Mensalidade</Label>
              <Input id="valor_mensalidade" type="number" step="0.01" value={formData.valor_mensalidade} onChange={handleFormChange} />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger id="status"><SelectValue placeholder="Selecione um status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa">Ativa</SelectItem>
                  <SelectItem value="Inativa">Inativa</SelectItem>
                  <SelectItem value="Suspensa">Suspensa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos para o Proprietário inicial (APENAS na criação de NOVA empresa) */}
            {!editingEmpresa && (
              <>
                <div className="col-span-full border-t pt-4 mt-4">
                  <h4 className="text-lg font-semibold mb-2">Dados do Proprietário Inicial</h4>
                  <p className="text-sm text-gray-600 mb-4">Este será o primeiro usuário com acesso 'Proprietário' para esta empresa.</p>
                </div>
                <div>
                  <Label htmlFor="proprietario_nome">Nome do Proprietário</Label>
                  <Input id="proprietario_nome" value={formData.proprietario_nome} onChange={handleFormChange} required />
                </div>
                <div>
                  <Label htmlFor="proprietario_email">Email do Proprietário</Label>
                  <Input id="proprietario_email" type="email" value={formData.proprietario_email} onChange={handleFormChange} required />
                </div>
                <div>
                  <Label htmlFor="proprietario_senha">Senha do Proprietário</Label>
                  <Input id="proprietario_senha" type="password" value={formData.proprietario_senha} onChange={handleFormChange} required />
                </div>
              </>
            )}

            <DialogFooter className="col-span-full mt-6 flex justify-end gap-2">
              <Button type="submit">{editingEmpresa ? 'Salvar Alterações' : 'Criar Empresa'}</Button>
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancelar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboardPage;