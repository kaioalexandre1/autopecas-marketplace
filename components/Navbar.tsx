'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { RamoVeiculo } from '@/types';
import { LogOut, Radio, MessageSquare, CheckCircle, User, Settings, Car, Wrench, MapPin, ChevronDown, Shield, ChevronRight, Menu, X, Zap, Crown, Store, Headphones, Trophy, Truck } from 'lucide-react';
import ModalSuporte from './ModalSuporte';
import { useUnreadChats } from '@/hooks/useUnreadChats';

// Estrutura hierárquica: Brasil > Estados > Cidades (TODOS OS 27 ESTADOS)
const estruturaBrasil = {
  'Acre-AC': [
    'Rio Branco', 'Cruzeiro do Sul', 'Sena Madureira', 'Tarauacá', 'Feijó',
    'Senador Guiomard', 'Plácido de Castro', 'Brasiléia', 'Epitaciolândia', 'Xapuri'
  ],
  'Alagoas-AL': [
    'Maceió', 'Arapiraca', 'Palmeira dos Índios', 'Rio Largo', 'Penedo',
    'União dos Palmares', 'São Miguel dos Campos', 'Santana do Ipanema', 'Delmiro Gouveia', 'Coruripe'
  ],
  'Amapá-AP': [
    'Macapá', 'Santana', 'Laranjal do Jari', 'Oiapoque', 'Mazagão',
    'Porto Grande', 'Tartarugalzinho', 'Pedra Branca do Amapari', 'Vitória do Jari', 'Ferreira Gomes'
  ],
  'Amazonas-AM': [
    'Manaus', 'Parintins', 'Itacoatiara', 'Manacapuru', 'Coari',
    'Tefé', 'Tabatinga', 'Maués', 'Humaitá', 'Iranduba'
  ],
  'Bahia-BA': [
    'Salvador', 'Feira de Santana', 'Vitória da Conquista', 'Camaçari', 'Itabuna',
    'Juazeiro', 'Lauro de Freitas', 'Ilhéus', 'Jequié', 'Teixeira de Freitas'
  ],
  'Ceará-CE': [
    'Fortaleza', 'Caucaia', 'Juazeiro do Norte', 'Maracanaú', 'Sobral',
    'Crato', 'Itapipoca', 'Maranguape', 'Iguatu', 'Quixadá'
  ],
  'Distrito Federal-DF': [
    'Brasília', 'Taguatinga', 'Ceilândia', 'Samambaia', 'Planaltina',
    'Águas Claras', 'Guará', 'Sobradinho', 'Gama', 'Santa Maria'
  ],
  'Espírito Santo-ES': [
    'Vitória', 'Vila Velha', 'Serra', 'Cariacica', 'Viana',
    'Cachoeiro de Itapemirim', 'Linhares', 'São Mateus', 'Colatina', 'Guarapari'
  ],
  'Goiás-GO': [
    'Goiânia', 'Aparecida de Goiânia', 'Anápolis', 'Rio Verde', 'Luziânia',
    'Águas Lindas de Goiás', 'Valparaíso de Goiás', 'Trindade', 'Formosa', 'Novo Gama'
  ],
  'Maranhão-MA': [
    'São Luís', 'Imperatriz', 'São José de Ribamar', 'Timon', 'Caxias',
    'Codó', 'Paço do Lumiar', 'Açailândia', 'Bacabal', 'Balsas'
  ],
  'Mato Grosso-MT': [
    'Cuiabá', 'Várzea Grande', 'Rondonópolis', 'Sinop', 'Tangará da Serra',
    'Cáceres', 'Sorriso', 'Lucas do Rio Verde', 'Barra do Garças', 'Primavera do Leste'
  ],
  'Mato Grosso do Sul-MS': [
    'Campo Grande', 'Dourados', 'Três Lagoas', 'Corumbá', 'Ponta Porã',
    'Aquidauana', 'Nova Andradina', 'Sidrolândia', 'Naviraí', 'Maracaju'
  ],
  'Minas Gerais-MG': [
    'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim',
    'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga'
  ],
  'Pará-PA': [
    'Belém', 'Ananindeua', 'Santarém', 'Marabá', 'Castanhal',
    'Parauapebas', 'Itaituba', 'Cametá', 'Bragança', 'Abaetetuba'
  ],
  'Paraíba-PB': [
    'João Pessoa', 'Campina Grande', 'Santa Rita', 'Patos', 'Bayeux',
    'Sousa', 'Cajazeiras', 'Guarabira', 'Mamanguape', 'Cabedelo'
  ],
  'Paraná-PR': [
    'Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel',
    'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá'
  ],
  'Pernambuco-PE': [
    'Recife', 'Jaboatão dos Guararapes', 'Olinda', 'Caruaru', 'Petrolina',
    'Paulista', 'Cabo de Santo Agostinho', 'Camaragibe', 'Garanhuns', 'Vitória de Santo Antão'
  ],
  'Piauí-PI': [
    'Teresina', 'Parnaíba', 'Picos', 'Floriano', 'Piripiri',
    'Campo Maior', 'Barras', 'União', 'Altos', 'Pedro II'
  ],
  'Rio de Janeiro-RJ': [
    'Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói',
    'Belford Roxo', 'São João de Meriti', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda'
  ],
  'Rio Grande do Norte-RN': [
    'Natal', 'Mossoró', 'Parnamirim', 'São Gonçalo do Amarante', 'Macaíba',
    'Ceará-Mirim', 'Caicó', 'Açu', 'Currais Novos', 'Nova Cruz'
  ],
  'Rio Grande do Sul-RS': [
    'Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria',
    'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande'
  ],
  'Rondônia-RO': [
    'Porto Velho', 'Ji-Paraná', 'Ariquemes', 'Vilhena', 'Cacoal',
    'Jaru', 'Rolim de Moura', 'Guajará-Mirim', 'Pimenta Bueno', 'Buritis'
  ],
  'Roraima-RR': [
    'Boa Vista', 'Rorainópolis', 'Caracaraí', 'Mucajaí', 'São João da Baliza',
    'Alto Alegre', 'Bonfim', 'Cantá', 'Normandia', 'Pacaraima'
  ],
  'Santa Catarina-SC': [
    'Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Criciúma',
    'Chapecó', 'Itajaí', 'Jaraguá do Sul', 'Lages', 'Palhoça'
  ],
  'São Paulo-SP': [
    'São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André',
    'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Mauá'
  ],
  'Sergipe-SE': [
    'Aracaju', 'Nossa Senhora do Socorro', 'Lagarto', 'Itabaiana', 'São Cristóvão',
    'Estância', 'Tobias Barreto', 'Simão Dias', 'Propriá', 'Laranjeiras'
  ],
  'Tocantins-TO': [
    'Palmas', 'Araguaína', 'Gurupi', 'Porto Nacional', 'Paraíso do Tocantins',
    'Colinas do Tocantins', 'Guaraí', 'Tocantinópolis', 'Miracema do Tocantins', 'Dianópolis'
  ]
};

export default function Navbar() {
  const { userData, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [estadosExpandidos, setEstadosExpandidos] = useState<string[]>([]);
  const [brasilSelecionado, setBrasilSelecionado] = useState(false);
  const [ramoSelecionado, setRamoSelecionado] = useState<RamoVeiculo | 'TODOS'>('TODOS');
  const [mostrarDropdownRamo, setMostrarDropdownRamo] = useState(false);
  const [menuMobileAberto, setMenuMobileAberto] = useState(false);
  const [modalSuporteAberto, setModalSuporteAberto] = useState(false);

  // Função auxiliar para obter todas as cidades do Brasil
  const obterTodasCidades = (): string[] => {
    const todasCidades: string[] = [];
    Object.entries(estruturaBrasil).forEach(([estado, cidades]) => {
      cidades.forEach(cidade => todasCidades.push(cidade));
    });
    return todasCidades;
  };

  // Carregar cidades selecionadas do localStorage
  useEffect(() => {
    if (userData?.cidade && cidadesSelecionadas.length === 0) {
      const cidadesSalvas = localStorage.getItem('cidadesSelecionadas');
      const brasilSalvo = localStorage.getItem('brasilSelecionado');
      
      if (brasilSalvo === 'true') {
        setBrasilSelecionado(true);
        setCidadesSelecionadas(obterTodasCidades());
      } else if (cidadesSalvas) {
        const cidades = JSON.parse(cidadesSalvas);
        setCidadesSelecionadas(cidades);
        // Verificar se todas as cidades estão selecionadas (Brasil)
        if (cidades.length === obterTodasCidades().length) {
          setBrasilSelecionado(true);
        }
      } else {
        // Extrair apenas o nome da cidade (remover estado)
        const nomeCidade = userData.cidade.split('-')[0];
        setCidadesSelecionadas([nomeCidade]);
        localStorage.setItem('cidadesSelecionadas', JSON.stringify([nomeCidade]));
      }
    }
  }, [userData, cidadesSelecionadas.length]);

  // Inicializar ramo selecionado (padrão do usuário ou localStorage)
  useEffect(() => {
    if (userData && (userData.tipo === 'oficina' || userData.tipo === 'autopeca')) {
      const ramoSalvo = localStorage.getItem('ramoSelecionado') as RamoVeiculo | 'TODOS' | null;
      if (ramoSalvo) {
        setRamoSelecionado(ramoSalvo);
      } else if (userData.ramo) {
        // Usar o ramo padrão do usuário
        setRamoSelecionado(userData.ramo);
        localStorage.setItem('ramoSelecionado', userData.ramo);
      }
    }
  }, [userData]);

  // Função para mudar o ramo selecionado
  const handleMudarRamo = (novoRamo: RamoVeiculo | 'TODOS') => {
    setRamoSelecionado(novoRamo);
    localStorage.setItem('ramoSelecionado', novoRamo);
    setMostrarDropdownRamo(false);
    setTimeout(() => window.location.reload(), 100);
  };

  // Verificar se um estado está totalmente selecionado
  const estadoTotalmenteSelecionado = (estado: string): boolean => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    return cidadesDoEstado.every(cidade => cidadesSelecionadas.includes(cidade));
  };

  // Toggle Brasil inteiro
  const toggleBrasil = () => {
    if (brasilSelecionado) {
      // Desmarcar Brasil - voltar para cidade do usuário
      const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
      setCidadesSelecionadas([nomeCidade]);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify([nomeCidade]));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      // Selecionar Brasil inteiro
      const todasCidades = obterTodasCidades();
      setCidadesSelecionadas(todasCidades);
      setBrasilSelecionado(true);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(todasCidades));
      localStorage.setItem('brasilSelecionado', 'true');
    }
    setTimeout(() => window.location.reload(), 100);
  };

  // Toggle Estado inteiro
  const toggleEstado = (estado: string) => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    
    if (estadoTotalmenteSelecionado(estado)) {
      // Desmarcar todas as cidades do estado
      const novaSelecao = cidadesSelecionadas.filter(c => !cidadesDoEstado.includes(c));
      // Garantir pelo menos uma cidade
      if (novaSelecao.length === 0) {
        const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
        novaSelecao.push(nomeCidade);
      }
      setCidadesSelecionadas(novaSelecao);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      // Selecionar todas as cidades do estado
      const novaSelecao = [...new Set([...cidadesSelecionadas, ...cidadesDoEstado])];
      setCidadesSelecionadas(novaSelecao);
      
      // Verificar se agora Brasil está completo
      if (novaSelecao.length === obterTodasCidades().length) {
        setBrasilSelecionado(true);
        localStorage.setItem('brasilSelecionado', 'true');
      }
      
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
    }
    setTimeout(() => window.location.reload(), 100);
  };

  // Toggle cidade individual
  const toggleCidade = (cidade: string) => {
    setCidadesSelecionadas(prev => {
      let novaSelecao: string[];
      if (prev.includes(cidade)) {
        // Não permitir desmarcar se for a única cidade
        if (prev.length === 1) {
          return prev;
        }
        novaSelecao = prev.filter(c => c !== cidade);
        setBrasilSelecionado(false);
        localStorage.setItem('brasilSelecionado', 'false');
      } else {
        novaSelecao = [...prev, cidade];
        
        // Verificar se agora Brasil está completo
        if (novaSelecao.length === obterTodasCidades().length) {
          setBrasilSelecionado(true);
          localStorage.setItem('brasilSelecionado', 'true');
        }
      }
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      setTimeout(() => window.location.reload(), 100);
      return novaSelecao;
    });
  };

  // Toggle expansão de estado
  const toggleEstadoExpansao = (estado: string) => {
    setEstadosExpandidos(prev => 
      prev.includes(estado) 
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    );
  };

  const handleLogout = async () => {
    await signOut();
    router.push('/');
  };

  const navItems = [
    { href: '/dashboard', label: 'Pedidos ao Vivo', icon: Radio },
    { href: '/dashboard/chats', label: 'Chats', icon: MessageSquare },
    { href: '/dashboard/negocios-fechados', label: 'Negócios Fechados', icon: CheckCircle },
    ...(userData?.tipo === 'entregador' ? [{ href: '/dashboard/configuracoes-frete', label: 'Configurações de Frete', icon: Truck }] : []),
    ...(userData?.role === 'admin' ? [{ href: '/admin', label: 'Admin', icon: Shield }] : []),
  ];

  const getTipoBadgeColor = () => {
    switch (userData?.tipo) {
      case 'oficina':
        return 'bg-blue-100 text-blue-800';
      case 'autopeca':
        return 'bg-green-100 text-green-800';
      case 'entregador':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTipoLabel = () => {
    switch (userData?.tipo) {
      case 'oficina':
        return 'Oficina';
      case 'autopeca':
        return 'Autopeça';
      case 'entregador':
        return 'Entregador';
      default:
        return '';
    }
  };

  // Função para calcular ofertas restantes (apenas para autopeças)
  const getOfertasInfo = () => {
    if (userData?.tipo !== 'autopeca') return null;
    
    const mesAtual = new Date().toISOString().slice(0, 7);
    const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
    
    const limites: Record<string, number> = {
      basico: 20,
      premium: 100,
      gold: 200,
      platinum: -1, // ilimitado
    };
    
    const plano = userData.plano || 'basico';
    const limite = limites[plano];
    const restantes = limite === -1 ? -1 : Math.max(0, limite - ofertasUsadas);
    const porcentagem = limite === -1 ? 100 : (ofertasUsadas / limite) * 100;
    
    return {
      usadas: ofertasUsadas,
      limite,
      restantes,
      porcentagem,
      plano,
      precisaUpgrade: limite !== -1 && porcentagem >= 80
    };
  };

  const ofertasInfo = getOfertasInfo();

  // Função para obter cor e nome do plano
  const getPlanoInfo = () => {
    if (!userData || userData.tipo !== 'autopeca') return null;
    
    const plano = userData.plano || 'basico';
    
    const planosConfig: Record<string, { nome: string; cor: string; corTexto: string; corBorda: string }> = {
      basico: {
        nome: 'Básico',
        cor: 'bg-gray-500',
        corTexto: 'text-white',
        corBorda: 'border-gray-600'
      },
      premium: {
        nome: 'Silver',
        cor: 'bg-blue-600',
        corTexto: 'text-white',
        corBorda: 'border-blue-700'
      },
      gold: {
        nome: 'Gold',
        cor: 'bg-yellow-500',
        corTexto: 'text-white',
        corBorda: 'border-yellow-600'
      },
      platinum: {
        nome: 'Platinum',
        cor: 'bg-purple-600',
        corTexto: 'text-white',
        corBorda: 'border-purple-700'
      }
    };
    
    return planosConfig[plano] || planosConfig.basico;
  };

  const planoInfo = getPlanoInfo();
  const unreadChatsCount = useUnreadChats();

  return (
    <nav className="navbar-custom bg-blue-700 relative z-50" style={{ backgroundColor: '#1d4ed8', opacity: 1, position: 'relative', zIndex: 9999 }}>
      <div className="container mx-auto px-3 sm:px-4" style={{ opacity: 1 }}>
        <div className="flex items-center justify-between h-16 sm:h-20" style={{ opacity: 1 }}>
          {/* Logo */}
          <div className="flex items-center space-x-2 sm:space-x-4 md:space-x-6" style={{ opacity: 1 }}>
            <Link href="/" className="flex items-center space-x-2 sm:space-x-3 md:space-x-4" style={{ opacity: 1 }}>
              {/* Logo Simples - Carro Amarelo */}
              <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="sm:w-[70px] sm:h-[70px]" style={{ opacity: 1 }}>
                  <defs>
                    <linearGradient id="carGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{stopColor: '#FBBF24', stopOpacity: 1}} />
                      <stop offset="100%" style={{stopColor: '#F59E0B', stopOpacity: 1}} />
                    </linearGradient>
                  </defs>
                  
                  {/* Círculo de fundo azul */}
                  <circle cx="50" cy="50" r="48" fill="#1E40AF" stroke="#FBBF24" strokeWidth="3"/>
                  
                  {/* Carro amarelo - vista lateral */}
                  <g transform="translate(50, 50)">
                    {/* Corpo do carro */}
                    <path d="M-20 5 L-15 -5 L-5 -8 L5 -8 L15 -5 L20 5 L20 10 L-20 10 Z" 
                          fill="url(#carGradient)" stroke="#FFFFFF" strokeWidth="1.5"/>
                    
                    {/* Janelas */}
                    <rect x="-12" y="-6" width="8" height="6" rx="1" fill="#1E40AF"/>
                    <rect x="0" y="-6" width="10" height="6" rx="1" fill="#1E40AF"/>
                    
                    {/* Rodas */}
                    <circle cx="-12" cy="10" r="5" fill="#FFFFFF" stroke="#1E40AF" strokeWidth="2"/>
                    <circle cx="12" cy="10" r="5" fill="#FFFFFF" stroke="#1E40AF" strokeWidth="2"/>
                    
                    {/* Centro das rodas */}
                    <circle cx="-12" cy="10" r="2" fill="#1E40AF"/>
                    <circle cx="12" cy="10" r="2" fill="#1E40AF"/>
                  </g>
              </svg>
              <div className="hidden md:block text-xl lg:text-3xl font-black text-white uppercase tracking-wide mr-2 md:mr-4 lg:mr-6 whitespace-nowrap" style={{ opacity: 1, color: 'rgb(255, 255, 255)' }}>
                Grupão das Autopeças
              </div>
            </Link>

            {/* Seletor de Cidades (Múltipla) - Removido do Navbar, agora está apenas nos filtros do dashboard */}
            {false && (
              <div className="relative">
                <button
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                  className="bg-blue-800 text-white font-semibold px-3 py-3 sm:px-2.5 sm:py-2.5 rounded-lg border-2 border-white focus:outline-none cursor-pointer flex items-center gap-1.5 min-w-[50px] min-h-[50px] sm:min-w-0 sm:min-h-0 justify-center"
                >
                  <MapPin size={22} className="text-yellow-400 sm:w-[18px] sm:h-[18px]" />
                  <ChevronDown size={18} className={`text-yellow-400 sm:w-4 sm:h-4 ${mostrarDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown hierárquico */}
                {mostrarDropdown && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMostrarDropdown(false)}
                    />
                    
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 py-2 min-w-[280px] sm:min-w-[300px] max-w-[90vw] sm:max-w-[400px] max-h-[70vh] sm:max-h-[500px] overflow-y-auto z-20">
                      <div className="px-3 py-3 sm:py-2 border-b border-gray-200">
                        <p className="text-sm sm:text-xs font-semibold text-gray-600">Selecione Brasil, Estados ou Cidades</p>
                      </div>
                      
                      {/* BRASIL */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBrasil();
                        }}
                        className="w-full px-4 py-3.5 sm:px-3 sm:py-2.5 flex items-center gap-3 sm:gap-2 text-left hover:bg-blue-50 font-bold"
                      >
                        <div className={`w-7 h-7 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center ${
                          brasilSelecionado
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-400'
                        }`}>
                          {brasilSelecionado && (
                            <CheckCircle size={18} className="text-white sm:w-4 sm:h-4" />
                          )}
                        </div>
                        <span className="text-lg sm:text-base text-blue-900">🇧🇷 BRASIL</span>
                      </button>
                      
                      <div className="border-t border-gray-200 my-1"></div>
                      
                      {/* ESTADOS */}
                      {Object.entries(estruturaBrasil).map(([estado, cidades]) => (
                        <div key={estado}>
                          {/* Botão do Estado */}
                          <div className="flex items-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEstadoExpansao(estado);
                              }}
                              className="px-3 py-3 sm:px-2 sm:py-2 hover:bg-gray-100"
                            >
                              <ChevronRight 
                                size={20} 
                                className={`sm:w-4 sm:h-4 text-gray-600 transition-transform ${estadosExpandidos.includes(estado) ? 'rotate-90' : ''}`}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEstado(estado);
                              }}
                              className="flex-1 px-3 py-3 sm:px-2 sm:py-2 flex items-center gap-3 sm:gap-2 text-left hover:bg-blue-50"
                            >
                              <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded border-2 flex items-center justify-center ${
                                estadoTotalmenteSelecionado(estado)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}>
                                {estadoTotalmenteSelecionado(estado) && (
                                  <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                                )}
                              </div>
                              <span className={`text-base sm:text-sm ${
                                estadoTotalmenteSelecionado(estado)
                                  ? 'font-bold text-blue-800'
                                  : 'font-semibold text-gray-700'
                              }`}>
                                {estado}
                              </span>
                            </button>
                          </div>
                          
                          {/* Cidades do Estado (expansível) */}
                          {estadosExpandidos.includes(estado) && (
                            <div className="ml-6 sm:ml-8 border-l-2 border-gray-200">
                              {cidades.map((cidade) => (
                        <button
                          key={cidade}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCidade(cidade);
                          }}
                                  className="w-full px-4 py-2.5 sm:px-3 sm:py-1.5 flex items-center gap-3 sm:gap-2 text-left hover:bg-blue-50"
                        >
                                  <div className={`w-5 h-5 sm:w-4 sm:h-4 rounded border-2 flex items-center justify-center ${
                            cidadesSelecionadas.includes(cidade)
                                      ? 'bg-green-500 border-green-500'
                              : 'border-gray-300'
                          }`}>
                            {cidadesSelecionadas.includes(cidade) && (
                                      <CheckCircle size={14} className="text-white sm:w-2.5 sm:h-2.5" />
                            )}
                          </div>
                                  <span className={`text-sm sm:text-xs ${
                            cidadesSelecionadas.includes(cidade)
                                      ? 'font-semibold text-green-700'
                                      : 'text-gray-600'
                          }`}>
                            {cidade}
                          </span>
                        </button>
                      ))}
                            </div>
                          )}
                        </div>
                      ))}
                      
                      <div className="px-3 py-2 border-t border-gray-200 mt-2 bg-gray-50">
                        <p className="text-xs text-gray-600 font-semibold">
                          ✓ {brasilSelecionado ? 'Brasil inteiro' : `${cidadesSelecionadas.length} ${cidadesSelecionadas.length === 1 ? 'cidade' : 'cidades'}`} selecionada{cidadesSelecionadas.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Seletor de Ramo (CARRO, MOTO, CAMINHÃO, ÔNIBUS, TODOS) - Removido do Navbar, agora está apenas nos filtros do dashboard */}
            {false && (
              <div className="relative">
                <button
                  onClick={() => setMostrarDropdownRamo(!mostrarDropdownRamo)}
                  className="bg-blue-800 text-white font-semibold px-3 py-3 sm:px-2.5 sm:py-2.5 rounded-lg border-2 border-white focus:outline-none cursor-pointer flex items-center gap-1.5 min-w-[50px] min-h-[50px] sm:min-w-0 sm:min-h-0 justify-center"
                >
                  <span className="text-xl sm:text-base leading-none">
                    {ramoSelecionado === 'TODOS' && '🚗'}
                    {ramoSelecionado === 'CARRO' && '🚗'}
                    {ramoSelecionado === 'MOTO' && '🏍️'}
                    {ramoSelecionado === 'CAMINHÃO' && '🚚'}
                    {ramoSelecionado === 'ÔNIBUS' && '🚌'}
                  </span>
                  <ChevronDown size={18} className={`text-yellow-400 sm:w-4 sm:h-4 ${mostrarDropdownRamo ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown de Ramo */}
                {mostrarDropdownRamo && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMostrarDropdownRamo(false)}
                    />
                    
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 py-2 min-w-[250px] sm:min-w-[220px] max-w-[90vw] z-20">
                      <div className="px-4 py-3 sm:px-3 sm:py-2 border-b border-gray-200">
                        <p className="text-sm sm:text-xs font-semibold text-gray-600">Selecione o tipo de veículo</p>
                      </div>
                      
                      {/* TODOS */}
                      <button
                        onClick={() => handleMudarRamo('TODOS')}
                        className="w-full px-5 py-3.5 sm:px-4 sm:py-2.5 flex items-center gap-3 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                          ramoSelecionado === 'TODOS'
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {ramoSelecionado === 'TODOS' && (
                            <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                          )}
                        </div>
                        <span className={`text-base sm:text-sm ${
                          ramoSelecionado === 'TODOS'
                            ? 'font-bold text-blue-800'
                            : 'text-gray-700'
                        }`}>
                          TODOS
                        </span>
                      </button>

                      {/* CARRO */}
                      <button
                        onClick={() => handleMudarRamo('CARRO')}
                        className="w-full px-5 py-3.5 sm:px-4 sm:py-2.5 flex items-center gap-3 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                          ramoSelecionado === 'CARRO'
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300'
                        }`}>
                          {ramoSelecionado === 'CARRO' && (
                            <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                          )}
                        </div>
                        <span className="text-2xl sm:text-xl">🚗</span>
                        <span className={`text-base sm:text-sm ${
                          ramoSelecionado === 'CARRO'
                            ? 'font-bold text-blue-800'
                            : 'text-gray-700'
                        }`}>
                          CARRO
                        </span>
                      </button>

                      {/* MOTO */}
                      <button
                        onClick={() => handleMudarRamo('MOTO')}
                        className="w-full px-5 py-3.5 sm:px-4 sm:py-2.5 flex items-center gap-3 text-left hover:bg-blue-50 transition-colors"
                      >
                        <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                          ramoSelecionado === 'MOTO'
                            ? 'bg-purple-500 border-purple-500'
                            : 'border-gray-300'
                        }`}>
                          {ramoSelecionado === 'MOTO' && (
                            <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                          )}
                        </div>
                        <span className="text-2xl sm:text-xl">🏍️</span>
                        <span className={`text-base sm:text-sm ${
                          ramoSelecionado === 'MOTO'
                            ? 'font-bold text-purple-800'
                            : 'text-gray-700'
                        }`}>
                          MOTO
                        </span>
                      </button>

                      {/* CAMINHÃO */}
                      <button
                        onClick={() => handleMudarRamo('CAMINHÃO')}
                        className="w-full px-5 py-3.5 sm:px-4 sm:py-2.5 flex items-center gap-3 text-left hover:bg-orange-50 transition-colors"
                      >
                        <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                          ramoSelecionado === 'CAMINHÃO'
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-gray-300'
                        }`}>
                          {ramoSelecionado === 'CAMINHÃO' && (
                            <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                          )}
                        </div>
                        <span className="text-2xl sm:text-xl">🚚</span>
                        <span className={`text-base sm:text-sm ${
                          ramoSelecionado === 'CAMINHÃO'
                            ? 'font-bold text-orange-800'
                            : 'text-gray-700'
                        }`}>
                          CAMINHÃO
                        </span>
                      </button>

                      {/* ÔNIBUS */}
                      <button
                        onClick={() => handleMudarRamo('ÔNIBUS')}
                        className="w-full px-5 py-3.5 sm:px-4 sm:py-2.5 flex items-center gap-3 text-left hover:bg-teal-50 transition-colors"
                      >
                        <div className={`w-6 h-6 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center ${
                          ramoSelecionado === 'ÔNIBUS'
                            ? 'bg-teal-500 border-teal-500'
                            : 'border-gray-300'
                        }`}>
                          {ramoSelecionado === 'ÔNIBUS' && (
                            <CheckCircle size={16} className="text-white sm:w-3.5 sm:h-3.5" />
                          )}
                        </div>
                        <span className="text-2xl sm:text-xl">🚌</span>
                        <span className={`text-base sm:text-sm ${
                          ramoSelecionado === 'ÔNIBUS'
                            ? 'font-bold text-teal-800'
                            : 'text-gray-700'
                        }`}>
                          ÔNIBUS
                        </span>
                      </button>

                      <div className="px-3 py-2 border-t border-gray-200 mt-2 bg-gray-50">
                        <p className="text-xs text-gray-600">
                          💡 Filtra pedidos por tipo de veículo
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Navigation Links - Desktop */}
          <div className="hidden lg:flex items-center space-x-2 ml-4" style={{ opacity: 1 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const showBadge = item.href === '/dashboard/chats' && unreadChatsCount > 0;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center px-4 py-2.5 rounded-lg font-medium ${
                    isActive
                      ? 'bg-yellow-400 text-blue-900 font-bold shadow-lg'
                      : 'text-white'
                  }`}
                >
                  <Icon size={20} className="mr-2" />
                  {item.label}
                  {showBadge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadChatsCount > 9 ? '9+' : unreadChatsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* User Info - Desktop */}
          <div className="hidden lg:flex items-center space-x-3" style={{ opacity: 1 }}>
            {/* Botão do Plano Atual (apenas para autopeças) */}
            {ofertasInfo && planoInfo && (
              <Link
                href="/dashboard/planos"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all hover:opacity-90 ${planoInfo.cor} ${planoInfo.corTexto} ${planoInfo.corBorda} ${
                  ofertasInfo.precisaUpgrade ? 'animate-pulse' : ''
                }`}
                title="Ver planos"
              >
                <Crown size={18} />
                <span className="text-sm font-bold">
                  {ofertasInfo.limite === -1 ? (
                    `∞ ${planoInfo.nome}`
                  ) : (
                    `${planoInfo.nome} - ${ofertasInfo.restantes}/${ofertasInfo.limite}`
                  )}
                </span>
              </Link>
            )}
            
            {/* Botão de Ranking (para todos os usuários) */}
            <Link
              href="/dashboard/ranking"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/30 text-white hover:bg-white/20 transition-all text-xl"
              title="Ranking"
            >
              🏆
            </Link>
            
            {/* Botão de Suporte (para autopeças e oficinas) */}
            {(userData?.tipo === 'autopeca' || userData?.tipo === 'oficina') && (
              <button
                onClick={() => setModalSuporteAberto(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-white/30 text-white hover:bg-white/20 transition-all text-xl"
                title="Suporte"
              >
                🎧
              </button>
            )}
            
            {/* Botão de Configurações */}
            <button
              onClick={() => router.push('/dashboard/configuracoes')}
              className="p-2.5 text-white rounded-lg border-2 border-white hover:bg-white/20 transition-all"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Configurações"
            >
              <Settings size={22} />
            </button>
            
            {/* Botão de Sair */}
            <button
              onClick={handleLogout}
              className="p-2.5 text-white rounded-lg border-2 border-white hover:bg-white/20 transition-all"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Sair"
            >
              <LogOut size={22} />
            </button>
          </div>

          {/* Botões Mobile - Chat e Pedidos */}
          <div className="lg:hidden flex items-center gap-2">
            {/* Botão Chat */}
            <Link
              href="/dashboard/chats"
              className="p-3 text-white rounded-lg border-2 border-white min-w-[50px] min-h-[50px] flex items-center justify-center text-2xl hover:bg-white/20 transition-all"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Chats"
            >
              💬
            </Link>

            {/* Botão Pedidos */}
            <Link
              href="/dashboard"
              className="p-3 text-white rounded-lg border-2 border-white min-w-[50px] min-h-[50px] flex items-center justify-center text-2xl hover:bg-white/20 transition-all"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Pedidos ao Vivo"
            >
              📋
            </Link>
          </div>

          {/* Menu Hamburger - Mobile */}
          <button
            onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            className="lg:hidden p-3 text-white rounded-lg border-2 border-white min-w-[50px] min-h-[50px] flex items-center justify-center"
            style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
          >
            {menuMobileAberto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {menuMobileAberto && (
          <div className="lg:hidden border-t-2 border-blue-600 bg-blue-800" style={{ opacity: 1 }}>
            <div className="py-4 px-3 space-y-2">
              {/* User Info Mobile */}
              <div className="pb-4 mb-4 border-b-2 border-blue-600">
                <div className="text-base font-bold text-white mb-2">{userData?.nome}</div>
                <div className={`text-sm px-3 py-1.5 rounded-full inline-block font-semibold ${getTipoBadgeColor()}`}>
                  {getTipoLabel()}
                </div>
                
                {/* Nome da Loja Mobile */}
                <div className="bg-white/20 backdrop-blur-sm border-2 border-white/40 rounded-xl px-3 py-2 mt-3">
                  <div className="flex items-center gap-2">
                    <Store size={16} className="text-yellow-400" />
                    <div>
                      <div className="text-xs text-white/80 font-medium">Loja</div>
                      <div className="text-sm font-bold text-white">
                        {userData?.nomeLoja || userData?.nome || 'Minha Loja'}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Botão do Plano Atual Mobile (apenas para autopeças) */}
                {ofertasInfo && planoInfo && (
                  <Link
                    href="/dashboard/planos"
                    onClick={() => setMenuMobileAberto(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 mt-3 transition-all hover:opacity-90 ${planoInfo.cor} ${planoInfo.corTexto} ${planoInfo.corBorda} ${
                      ofertasInfo.precisaUpgrade ? 'animate-pulse' : ''
                    }`}
                  >
                    <Crown size={20} />
                    <div>
                      <div className="text-sm font-bold">
                        {ofertasInfo.limite === -1 ? (
                          `∞ ${planoInfo.nome} - Ilimitado`
                        ) : (
                          `${planoInfo.nome} - ${ofertasInfo.restantes}/${ofertasInfo.limite} ofertas`
                        )}
                      </div>
                      {ofertasInfo.precisaUpgrade && (
                        <div className="text-xs opacity-90">Toque para fazer upgrade!</div>
                      )}
                    </div>
                  </Link>
                )}
              </div>

              {/* Navigation Links Mobile */}
              <div className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const showBadge = item.href === '/dashboard/chats' && unreadChatsCount > 0;
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuMobileAberto(false)}
                      className={`relative flex items-center px-4 py-3.5 rounded-lg font-semibold text-base ${
                        isActive
                          ? 'bg-yellow-400 text-blue-900 shadow-lg'
                          : 'bg-blue-700 text-white'
                      }`}
                    >
                      <Icon size={24} className="mr-3" />
                      {item.label}
                      {showBadge && (
                        <span className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {unreadChatsCount > 9 ? '9+' : unreadChatsCount}
                        </span>
                      )}
                    </Link>
                  );
                })}

                {/* Botão de Ranking Mobile */}
                <Link
                  href="/dashboard/ranking"
                  onClick={() => setMenuMobileAberto(false)}
                  className={`relative flex items-center px-4 py-3.5 rounded-lg font-semibold text-base ${
                    pathname === '/dashboard/ranking'
                      ? 'bg-yellow-400 text-blue-900 shadow-lg'
                      : 'bg-blue-700 text-white'
                  }`}
                >
                  <Trophy size={24} className="mr-3" />
                  Ranking
                </Link>
              </div>

              {/* Botão de Suporte Mobile (para autopeças e oficinas) */}
              {(userData?.tipo === 'autopeca' || userData?.tipo === 'oficina') && (
                <button
                  onClick={() => {
                    setModalSuporteAberto(true);
                    setMenuMobileAberto(false);
                  }}
                  className="w-full flex items-center px-4 py-3.5 mt-4 bg-blue-700 text-white rounded-lg font-semibold text-base"
                >
                  <span className="text-2xl mr-3">🎧</span>
                  Suporte
                </button>
              )}

              {/* Configurações Button Mobile */}
              <Link
                href="/dashboard/configuracoes"
                onClick={() => setMenuMobileAberto(false)}
                className="w-full flex items-center px-4 py-3.5 mt-4 bg-blue-700 text-white rounded-lg font-semibold text-base"
              >
                <Settings size={24} className="mr-3" />
                Configurações
              </Link>

              {/* Logout Button Mobile */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-3.5 mt-2 text-white bg-red-600 rounded-lg font-semibold text-base"
              >
                <LogOut size={24} className="mr-3" />
                Sair da Conta
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Suporte */}
      <ModalSuporte 
        aberto={modalSuporteAberto} 
        onFechar={() => setModalSuporteAberto(false)} 
      />
    </nav>
  );
}

