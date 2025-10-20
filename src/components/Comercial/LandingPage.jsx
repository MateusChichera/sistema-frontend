import React, { useState } from 'react';
import { 
  ChefHat, 
  Smartphone, 
  Cloud, 
  Users, 
  BarChart3, 
  CreditCard, 
  Truck, 
  Star, 
  CheckCircle, 
  Phone, 
  Mail, 
  MapPin,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';

const LandingPage = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.nome && formData.email && formData.telefone) {
      const message = `Olá! Gostaria de fazer um orçamento do sistema Athos.%0A%0ANome: ${formData.nome}%0AEmail: ${formData.email}%0ATelefone: ${formData.telefone}`;
      window.open(`https://wa.me/5518991506079?text=${message}`, '_blank');
    } else {
      alert('Por favor, preencha todos os campos.');
    }
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img src="/logoathos.png" alt="Athos" className="w-12 h-10" />
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <button onClick={() => scrollToSection('funcionalidades')} className="text-foreground hover:text-primary transition-colors">
                Funcionalidades
              </button>
              <button onClick={() => scrollToSection('sobre')} className="text-foreground hover:text-primary transition-colors">
                Sobre
              </button>
              <button onClick={() => scrollToSection('contato')} className="text-foreground hover:text-primary transition-colors">
                Contato
              </button>
            </nav>

            <button 
              className="md:hidden"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile Menu */}
          {isMenuOpen && (
            <div className="md:hidden mt-4 pb-4 border-t border-border">
              <nav className="flex flex-col space-y-4 mt-4">
                <button onClick={() => scrollToSection('funcionalidades')} className="text-left text-foreground hover:text-primary transition-colors">
                  Funcionalidades
                </button>
                <button onClick={() => scrollToSection('sobre')} className="text-left text-foreground hover:text-primary transition-colors">
                  Sobre
                </button>
                <button onClick={() => scrollToSection('contato')} className="text-left text-foreground hover:text-primary transition-colors">
                  Contato
                </button>
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl md:text-6xl font-bold leading-tight">
                  Revolucione seu
                  <span className="text-primary block">Restaurante</span>
                  com a ATHOS
                </h1>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Sistema completo de gestão para restaurantes com cardápio digital, 
                  controle de mesas, comandas inteligentes e muito mais. Tudo na nuvem!
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={() => scrollToSection('contato')}
                  className="bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Faça seu Orçamento Grátis
                  <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => scrollToSection('funcionalidades')}
                  className="border border-primary text-primary px-8 py-4 rounded-lg font-semibold hover:bg-primary/5 transition-colors"
                >
                  Ver Funcionalidades
                </button>
              </div>

              <div className="flex items-center gap-8 pt-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-primary" size={20} />
                  <span className="text-sm text-muted-foreground">Sistema em Nuvem</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-primary" size={20} />
                  <span className="text-sm text-muted-foreground">Suporte 24/7</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-primary" size={20} />
                  <span className="text-sm text-muted-foreground">Sem Instalação</span>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                      <ChefHat className="text-white" size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Dashboard Gerencial</h3>
                      <p className="text-muted-foreground">Controle total do seu negócio</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/10 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-primary">R$ 4.181,31</div>
                      <div className="text-sm text-primary">Faturamento Total</div>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-secondary">40</div>
                      <div className="text-sm text-secondary">Pedidos Finalizados</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Funcionalidades que <span className="text-primary">Transformam</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubra como a ATHOS pode revolucionar a gestão do seu restaurante
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <Smartphone className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Cardápio Digital</h3>
              <p className="text-muted-foreground leading-relaxed">
                Cardápio interativo acessível por QR Code. Seus clientes fazem pedidos 
                diretamente pelo celular, com opções de delivery e retirada no local.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                <Users className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Controle de Mesas</h3>
              <p className="text-muted-foreground leading-relaxed">
                Gerencie mesas e comandas de forma inteligente. Controle ocupação, 
                tempo de permanência e histórico de pedidos por mesa.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Cloud className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Sistema em Nuvem</h3>
              <p className="text-muted-foreground leading-relaxed">
                Acesse de qualquer lugar, a qualquer hora. Dados seguros na nuvem 
                com backup automático e sincronização em tempo real.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                <BarChart3 className="text-primary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Relatórios Inteligentes</h3>
              <p className="text-muted-foreground leading-relaxed">
                Dashboard completo com métricas de vendas, produtos mais vendidos, 
                ticket médio e análises detalhadas do seu negócio.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
                <CreditCard className="text-secondary" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Caixa Integrado</h3>
              <p className="text-muted-foreground leading-relaxed">
                Sistema de caixa completo com múltiplas formas de pagamento, 
                controle de sangria e fechamento automático.
              </p>
            </div>

            <div className="group p-8 rounded-2xl border border-border hover:border-primary/20 hover:shadow-lg transition-all duration-300">
              <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent/20 transition-colors">
                <Truck className="text-accent" size={32} />
              </div>
              <h3 className="text-xl font-bold mb-4">Integrações Futuras</h3>
              <p className="text-muted-foreground leading-relaxed">
                Em breve: integração com iFood, emissão de NFCe, cupom fiscal 
                e outras funcionalidades para expandir seu negócio.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold">
                  Sobre a <span className="text-primary">ATHOS</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Somos especialistas em tecnologia para restaurantes, desenvolvendo 
                  soluções que simplificam a gestão e potencializam resultados.
                </p>
              </div>

              <div className="grid gap-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Star className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Nossa Missão</h3>
                    <p className="text-muted-foreground">
                      Democratizar a tecnologia para restaurantes, oferecendo ferramentas 
                      profissionais acessíveis que impulsionam o crescimento do seu negócio.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="text-secondary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Nossa Visão</h3>
                    <p className="text-muted-foreground">
                      Ser a plataforma de gestão mais utilizada por restaurantes no Brasil, 
                      reconhecida pela inovação e facilidade de uso.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Users className="text-accent" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">Nossos Valores</h3>
                    <p className="text-muted-foreground">
                      Inovação constante, atendimento humanizado, transparência total 
                      e compromisso com o sucesso dos nossos clientes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-center">Por que escolher a ATHOS?</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
                      <CheckCircle className="text-primary" size={20} />
                      <span className="font-medium">Implementação em 24 horas</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-secondary/10 rounded-lg">
                      <CheckCircle className="text-secondary" size={20} />
                      <span className="font-medium">Suporte técnico especializado</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
                      <CheckCircle className="text-accent" size={20} />
                      <span className="font-medium">Atualizações automáticas</span>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-accent/10 rounded-lg">
                      <CheckCircle className="text-accent" size={20} />
                      <span className="font-medium">Treinamento completo da equipe</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Faça seu <span className="text-primary">Orçamento Grátis</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Preencha seus dados e receba uma proposta personalizada para seu restaurante
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-16">
            <div className="space-y-8">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Phone className="text-primary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Telefone</h3>
                    <p className="text-muted-foreground">(18) 99150-6079</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center">
                    <Mail className="text-secondary" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Email</h3>
                    <p className="text-muted-foreground">contato@athos.com.br</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center">
                    <MapPin className="text-accent" size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">Endereço</h3>
                    <p className="text-muted-foreground">Presidente Prudente, SP - Brasil</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-muted/30 rounded-2xl">
                <h3 className="font-bold text-lg mb-4">Benefícios do nosso sistema:</h3>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-primary" size={16} />
                    <span className="text-sm">Aumento de 30% na eficiência operacional</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-primary" size={16} />
                    <span className="text-sm">Redução de 50% nos erros de pedidos</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-primary" size={16} />
                    <span className="text-sm">Controle total do faturamento</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle className="text-primary" size={16} />
                    <span className="text-sm">Experiência digital para seus clientes</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                    placeholder="Seu nome completo"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                    placeholder="seu@email.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium mb-2">
                    Telefone/WhatsApp *
                  </label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={formData.telefone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-colors"
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  Solicitar Orçamento via WhatsApp
                  <ArrowRight size={20} />
                </button>

                <p className="text-xs text-muted-foreground text-center">
                  Ao clicar em "Solicitar Orçamento", você será redirecionado para o WhatsApp 
                  com suas informações preenchidas.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary/10 text-foreground py-6">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <img src="/ATHOS.png" alt="Athos" className="w-30 h-20" />
            </div>
            <p className="text-muted-foreground mb-6">
              Transformando restaurantes através da tecnologia
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <span>© 2025 ATHOS. Todos os direitos reservados.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

