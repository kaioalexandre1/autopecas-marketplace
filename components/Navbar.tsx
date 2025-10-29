'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Radio, MessageSquare, CheckCircle, User, Settings, Car, Wrench, MapPin, ChevronDown, Shield, ChevronRight } from 'lucide-react';

// Estrutura hierárquica: Brasil > Estados > Cidades
const estruturaBrasil = {
  'Paraná': [
    'Curitiba', 'Londrina', 'Maringá', 'Ponta Grossa', 'Cascavel',
    'São José dos Pinhais', 'Foz do Iguaçu', 'Colombo', 'Guarapuava', 'Paranaguá'
  ],
  'São Paulo': [
    'São Paulo', 'Guarulhos', 'Campinas', 'São Bernardo do Campo', 'Santo André',
    'Osasco', 'São José dos Campos', 'Ribeirão Preto', 'Sorocaba', 'Mauá'
  ],
  'Santa Catarina': [
    'Joinville', 'Florianópolis', 'Blumenau', 'São José', 'Criciúma',
    'Chapecó', 'Itajaí', 'Jaraguá do Sul', 'Lages', 'Palhoça'
  ],
  'Rio Grande do Sul': [
    'Porto Alegre', 'Caxias do Sul', 'Pelotas', 'Canoas', 'Santa Maria',
    'Gravataí', 'Viamão', 'Novo Hamburgo', 'São Leopoldo', 'Rio Grande'
  ],
  'Rio de Janeiro': [
    'Rio de Janeiro', 'São Gonçalo', 'Duque de Caxias', 'Nova Iguaçu', 'Niterói',
    'Belford Roxo', 'São João de Meriti', 'Campos dos Goytacazes', 'Petrópolis', 'Volta Redonda'
  ],
  'Minas Gerais': [
    'Belo Horizonte', 'Uberlândia', 'Contagem', 'Juiz de Fora', 'Betim',
    'Montes Claros', 'Ribeirão das Neves', 'Uberaba', 'Governador Valadares', 'Ipatinga'
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

  return (
    <nav className="navbar-custom bg-blue-700 relative z-50" style={{ backgroundColor: '#1d4ed8', opacity: 1, position: 'relative', zIndex: 9999 }}>
      <div className="container mx-auto px-4" style={{ opacity: 1 }}>
        <div className="flex items-center justify-between h-20" style={{ opacity: 1 }}>
          {/* Logo */}
          <div className="flex items-center space-x-6" style={{ opacity: 1 }}>
            <Link href="/" className="flex items-center space-x-4" style={{ opacity: 1 }}>
              {/* Logo Simples - Carro Amarelo */}
              <svg width="70" height="70" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 1 }}>
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
              <div className="text-3xl font-black text-white uppercase tracking-wide" style={{ opacity: 1, color: 'rgb(255, 255, 255)' }}>
                Grupão das Autopeças
              </div>
            </Link>

            {/* Seletor de Cidades (Múltipla) */}
            {userData && cidadesSelecionadas.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setMostrarDropdown(!mostrarDropdown)}
                  className="bg-blue-800 text-white font-semibold px-4 py-2.5 pr-10 rounded-lg border-2 border-white focus:outline-none cursor-pointer flex items-center gap-2"
                >
                  <MapPin size={18} className="text-yellow-400" />
                  <span>
                    {brasilSelecionado 
                      ? 'Brasil' 
                      : cidadesSelecionadas.length === 1
                      ? cidadesSelecionadas[0]
                      : `${cidadesSelecionadas.length} locais`
                    }
                  </span>
                  <ChevronDown size={18} className={`text-yellow-400 ${mostrarDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown hierárquico */}
                {mostrarDropdown && (
                  <>
                    {/* Overlay para fechar ao clicar fora */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setMostrarDropdown(false)}
                    />
                    
                    <div className="absolute top-full mt-2 left-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 py-2 min-w-[300px] max-w-[400px] max-h-[500px] overflow-y-auto z-20">
                      <div className="px-3 py-2 border-b border-gray-200">
                        <p className="text-xs font-semibold text-gray-600">Selecione Brasil, Estados ou Cidades</p>
                      </div>
                      
                      {/* BRASIL */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBrasil();
                        }}
                        className="w-full px-3 py-2.5 flex items-center gap-2 text-left hover:bg-blue-50 font-bold"
                      >
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                          brasilSelecionado
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-400'
                        }`}>
                          {brasilSelecionado && (
                            <CheckCircle size={16} className="text-white" />
                          )}
                        </div>
                        <span className="text-base text-blue-900">🇧🇷 BRASIL</span>
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
                              className="px-2 py-2 hover:bg-gray-100"
                            >
                              <ChevronRight 
                                size={16} 
                                className={`text-gray-600 transition-transform ${estadosExpandidos.includes(estado) ? 'rotate-90' : ''}`}
                              />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleEstado(estado);
                              }}
                              className="flex-1 px-2 py-2 flex items-center gap-2 text-left hover:bg-blue-50"
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                estadoTotalmenteSelecionado(estado)
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'border-gray-300'
                              }`}>
                                {estadoTotalmenteSelecionado(estado) && (
                                  <CheckCircle size={14} className="text-white" />
                                )}
                              </div>
                              <span className={`text-sm ${
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
                            <div className="ml-8 border-l-2 border-gray-200">
                              {cidades.map((cidade) => (
                                <button
                                  key={cidade}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCidade(cidade);
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 text-left hover:bg-blue-50"
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                    cidadesSelecionadas.includes(cidade)
                                      ? 'bg-green-500 border-green-500'
                                      : 'border-gray-300'
                                  }`}>
                                    {cidadesSelecionadas.includes(cidade) && (
                                      <CheckCircle size={10} className="text-white" />
                                    )}
                                  </div>
                                  <span className={`text-xs ${
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
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1" style={{ opacity: 1 }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-2.5 rounded-lg font-medium ${
                    isActive
                      ? 'bg-yellow-400 text-blue-900 font-bold shadow-lg'
                      : 'text-white'
                  }`}
                >
                  <Icon size={20} className="mr-2" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Info */}
          <div className="flex items-center space-x-4" style={{ opacity: 1 }}>
            <div className="text-right" style={{ opacity: 1 }}>
              <div className="text-sm font-bold text-white" style={{ opacity: 1, color: 'rgb(255, 255, 255)' }}>{userData?.nome}</div>
              <div className={`text-xs px-3 py-1 rounded-full inline-block font-semibold ${getTipoBadgeColor()}`} style={{ opacity: 1 }}>
                {getTipoLabel()}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="p-2.5 text-white rounded-lg border-2 border-white"
              style={{ opacity: 1, color: 'rgb(255, 255, 255)', borderColor: 'rgb(255, 255, 255)' }}
              title="Sair"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

