'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NegocioFechado, User } from '@/types';
import { ArrowLeft, TrendingUp, MapPin, ChevronDown, ChevronRight, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';
import { estruturaBrasil, obterTodasCidades } from '@/lib/estruturaBrasil';

export default function RankingPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [negocios, setNegocios] = useState<NegocioFechado[]>([]);
  const [autopecas, setAutopecas] = useState<Record<string, User>>({});
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [mostrarDropdownLocalizacao, setMostrarDropdownLocalizacao] = useState(false);
  const [estadosExpandidos, setEstadosExpandidos] = useState<string[]>([]);
  const [brasilSelecionado, setBrasilSelecionado] = useState(false);

  useEffect(() => {
    if (!authLoading && !userData) {
      router.push('/login');
    }
  }, [userData, authLoading, router]);

  // Carregar cidades selecionadas do localStorage
  useEffect(() => {
    const cidadesSalvas = localStorage.getItem('cidadesSelecionadas');
    const brasilSalvo = localStorage.getItem('brasilSelecionado');
    
    if (brasilSalvo === 'true') {
      setBrasilSelecionado(true);
      setCidadesSelecionadas(obterTodasCidades());
    } else if (cidadesSalvas) {
      const cidades = JSON.parse(cidadesSalvas);
      setCidadesSelecionadas(cidades);
      if (cidades.length === obterTodasCidades().length) {
        setBrasilSelecionado(true);
      }
    } else if (userData?.cidade) {
      const nomeCidade = userData.cidade.split('-')[0];
      setCidadesSelecionadas([nomeCidade]);
    }
  }, [userData]);

  useEffect(() => {
    if (userData && cidadesSelecionadas.length > 0) {
      carregarNegocios();
    }
  }, [userData, periodoSelecionado, cidadesSelecionadas]);

  const carregarNegocios = async () => {
    try {
      setCarregando(true);
      const negociosRef = collection(db, 'negocios_fechados');
      const q = query(negociosRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      const negociosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as NegocioFechado[];

      setNegocios(negociosData);

      // Buscar dados das autopeças para obter suas cidades
      const autopecaIds = [...new Set(negociosData.map(n => n.autopecaId))];
      const autopecasData: Record<string, User> = {};
      
      for (const autopecaId of autopecaIds) {
        try {
          const autopecaDoc = await getDoc(doc(db, 'users', autopecaId));
          if (autopecaDoc.exists()) {
            autopecasData[autopecaId] = {
              id: autopecaDoc.id,
              ...autopecaDoc.data()
            } as User;
          }
        } catch (error) {
          console.error(`Erro ao buscar autopeça ${autopecaId}:`, error);
        }
      }
      
      setAutopecas(autopecasData);
    } catch (error) {
      console.error('Erro ao carregar negócios:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Funções para gerenciar localizações
  const estadoTotalmenteSelecionado = (estado: string): boolean => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    return cidadesDoEstado.every(cidade => cidadesSelecionadas.includes(cidade));
  };

  const toggleBrasil = () => {
    if (brasilSelecionado) {
      const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
      setCidadesSelecionadas([nomeCidade]);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify([nomeCidade]));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      const todasCidades = obterTodasCidades();
      setCidadesSelecionadas(todasCidades);
      setBrasilSelecionado(true);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(todasCidades));
      localStorage.setItem('brasilSelecionado', 'true');
    }
  };

  const toggleEstadoExpansao = (estado: string) => {
    setEstadosExpandidos(prev => 
      prev.includes(estado) 
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    );
  };

  const toggleEstado = (estado: string) => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    
    if (estadoTotalmenteSelecionado(estado)) {
      const novaSelecao = cidadesSelecionadas.filter(c => !cidadesDoEstado.includes(c));
      if (novaSelecao.length === 0) {
        const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
        novaSelecao.push(nomeCidade);
      }
      setCidadesSelecionadas(novaSelecao);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      const novaSelecao = [...new Set([...cidadesSelecionadas, ...cidadesDoEstado])];
      setCidadesSelecionadas(novaSelecao);
      
      if (novaSelecao.length === obterTodasCidades().length) {
        setBrasilSelecionado(true);
        localStorage.setItem('brasilSelecionado', 'true');
      }
      
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
    }
  };

  const toggleCidade = (cidade: string) => {
    setCidadesSelecionadas(prev => {
      let novaSelecao: string[];
      if (prev.includes(cidade)) {
        novaSelecao = prev.filter(c => c !== cidade);
        if (novaSelecao.length === 0) {
          const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
          novaSelecao.push(nomeCidade);
        }
        setBrasilSelecionado(false);
      } else {
        novaSelecao = [...prev, cidade];
        const todasCidades = obterTodasCidades();
        if (novaSelecao.length === todasCidades.length) {
          setBrasilSelecionado(true);
        }
      }
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      localStorage.setItem('brasilSelecionado', brasilSelecionado ? 'true' : 'false');
      return novaSelecao;
    });
  };

  // Filtrar negócios por período e localização
  const negociosFiltrados = negocios.filter(negocio => {
    // Filtro de período
    if (periodoSelecionado !== 'todos') {
      const dataNegocio = negocio.createdAt?.toDate() || new Date();
      let dataInicio: Date;
      
      switch (periodoSelecionado) {
        case 'hoje':
          dataInicio = startOfDay(new Date());
          break;
        case 'semana':
          dataInicio = startOfWeek(new Date(), { weekStartsOn: 1 });
          break;
        case 'mes':
          dataInicio = startOfMonth(new Date());
          break;
        default:
          return true;
      }
      
      if (!isAfter(dataNegocio, dataInicio)) {
        return false;
      }
    }

    // Filtro de localização (cidade da autopeça)
    const autopeca = autopecas[negocio.autopecaId];
    if (!autopeca || !autopeca.cidade) return false;
    
    const cidadeAutopeca = autopeca.cidade.split('-')[0]; // Extrair apenas o nome da cidade
    return cidadesSelecionadas.includes(cidadeAutopeca);
  });

  // Calcular faturamento por autopeça
  const faturamentoPorAutopeca = negociosFiltrados.reduce((acc, negocio) => {
    const autopeca = autopecas[negocio.autopecaId];
    if (!autopeca) return acc;
    
    if (!acc[negocio.autopecaNome]) {
      acc[negocio.autopecaNome] = {
        nome: negocio.autopecaNome,
        id: negocio.autopecaId,
        total: 0,
        quantidade: 0,
        cidade: autopeca.cidade || '',
        plano: autopeca.plano || 'basico'
      };
    }
    acc[negocio.autopecaNome].total += negocio.valorFinal || 0;
    acc[negocio.autopecaNome].quantidade += 1;
    return acc;
  }, {} as Record<string, { nome: string; id: string; total: number; quantidade: number; cidade: string; plano: string }>);

  // Calcular ranking geral
  const rankingAutopecas = Object.values(faturamentoPorAutopeca).sort((a, b) => b.total - a.total);

  // Calcular top 1 de cada cidade (quando "todos" está selecionado e Brasil inteiro)
  const top1PorCidade: Record<string, string> = {};
  if (periodoSelecionado === 'todos' && brasilSelecionado) {
    // Agrupar faturamento por autopeça e cidade
    const faturamentoPorCidade: Record<string, Record<string, number>> = {};
    
    negociosFiltrados.forEach(negocio => {
      const autopeca = autopecas[negocio.autopecaId];
      if (!autopeca || !autopeca.cidade) return;
      
      const cidade = autopeca.cidade;
      if (!faturamentoPorCidade[cidade]) {
        faturamentoPorCidade[cidade] = {};
      }
      
      if (!faturamentoPorCidade[cidade][negocio.autopecaId]) {
        faturamentoPorCidade[cidade][negocio.autopecaId] = 0;
      }
      
      faturamentoPorCidade[cidade][negocio.autopecaId] += negocio.valorFinal || 0;
    });
    
    // Encontrar top 1 de cada cidade
    Object.entries(faturamentoPorCidade).forEach(([cidade, autopecasPorId]) => {
      const entries = Object.entries(autopecasPorId);
      if (entries.length > 0) {
        const top1 = entries.sort((a, b) => b[1] - a[1])[0];
        if (top1) {
          top1PorCidade[top1[0]] = cidade;
        }
      }
    });
  }

  // Função para obter info do plano
  const getPlanoInfo = (plano: string) => {
    const planos: Record<string, { nome: string; emoji: string; cor: string }> = {
      basico: { nome: 'Básico', emoji: '', cor: 'text-gray-600' },
      premium: { nome: 'Silver', emoji: '💎', cor: 'text-blue-600' },
      gold: { nome: 'Gold', emoji: '🏆', cor: 'text-yellow-600' },
      platinum: { nome: 'Platinum', emoji: '👑', cor: 'text-purple-600' }
    };
    return planos[plano] || planos.basico;
  };

  if (authLoading || carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando ranking...</p>
        </div>
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-blue-600 p-4 sm:p-6 relative overflow-hidden">
      {/* Fundo animado com emojis */}
      {/* Raios de energia */}
      <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-20 animate-beam"></div>
      <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30 animate-beam-delayed"></div>
      <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-20 animate-beam-slow"></div>
      
      {/* Partículas LED */}
      <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-cyan-400"></div>
      <div className="absolute top-40 right-32 w-2 h-2 bg-yellow-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-yellow-400"></div>
      <div className="absolute bottom-32 left-40 w-2 h-2 bg-blue-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-blue-400"></div>
      <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-green-400"></div>
      
      {/* Emojis de autopeças e carros flutuantes */}
      <div className="absolute top-10 left-10 text-6xl opacity-40 animate-bounce1 drop-shadow-2xl">🚗</div>
      <div className="absolute top-20 left-1/4 text-5xl opacity-35 animate-bounce2 drop-shadow-2xl">🔧</div>
      <div className="absolute top-16 left-1/2 text-6xl opacity-45 animate-bounce3 drop-shadow-2xl">🛞</div>
      <div className="absolute top-12 right-1/4 text-5xl opacity-40 animate-bounce4 drop-shadow-2xl">⚙️</div>
      <div className="absolute top-24 right-10 text-7xl opacity-35 animate-bounce5 drop-shadow-2xl">🏎️</div>
      <div className="absolute top-40 left-16 text-5xl opacity-50 animate-bounce6 drop-shadow-2xl">🔩</div>
      <div className="absolute top-48 left-1/3 text-6xl opacity-40 animate-bounce7 drop-shadow-2xl">🚙</div>
      <div className="absolute top-44 right-1/3 text-5xl opacity-45 animate-bounce8 drop-shadow-2xl">🔋</div>
      <div className="absolute top-52 right-20 text-6xl opacity-38 animate-bounce9 drop-shadow-2xl">⚡</div>
      <div className="absolute top-1/2 left-8 text-7xl opacity-30 animate-bounce10 drop-shadow-2xl">🛠️</div>
      <div className="absolute top-1/2 left-1/4 text-5xl opacity-42 animate-bounce11 drop-shadow-2xl">🏁</div>
      <div className="absolute top-1/2 left-1/2 text-6xl opacity-35 animate-bounce12 drop-shadow-2xl">🚘</div>
      <div className="absolute top-1/2 right-1/4 text-5xl opacity-48 animate-bounce13 drop-shadow-2xl">🔑</div>
      <div className="absolute top-1/2 right-12 text-6xl opacity-40 animate-bounce14 drop-shadow-2xl">🛡️</div>
      <div className="absolute bottom-48 left-20 text-5xl opacity-45 animate-bounce15 drop-shadow-2xl">🚕</div>
      <div className="absolute bottom-52 left-1/3 text-6xl opacity-38 animate-bounce16 drop-shadow-2xl">⛽</div>
      <div className="absolute bottom-44 right-1/3 text-5xl opacity-42 animate-bounce17 drop-shadow-2xl">🧰</div>
      <div className="absolute bottom-40 right-16 text-6xl opacity-36 animate-bounce18 drop-shadow-2xl">💡</div>
      <div className="absolute bottom-24 left-12 text-6xl opacity-40 animate-bounce19 drop-shadow-2xl">🚓</div>
      <div className="absolute bottom-32 right-1/4 text-5xl opacity-35 animate-bounce20 drop-shadow-2xl">🚐</div>
      <div className="absolute bottom-16 left-1/2 text-6xl opacity-42 animate-bounce21 drop-shadow-2xl">🏆</div>
      <div className="absolute bottom-10 right-8 text-7xl opacity-38 animate-bounce22 drop-shadow-2xl">🚗</div>
      
      <div className="container mx-auto max-w-4xl relative z-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-white hover:text-blue-200 font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
          </div>
          
          {/* Card com título em verde neon */}
          <div 
            className="bg-green-600 border-2 border-green-400 rounded-xl p-4 sm:p-6 shadow-lg mb-4"
            style={{
              boxShadow: '0 0 20px rgba(34, 197, 94, 0.8), 0 0 40px rgba(34, 197, 94, 0.6), inset 0 0 20px rgba(34, 197, 94, 0.3)'
            }}
          >
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase flex items-center justify-center gap-3">
              <span 
                className="inline-block text-white"
                style={{
                  textShadow: '0 0 10px rgba(255, 255, 255, 0.8), 0 0 20px rgba(255, 255, 255, 0.5)',
                  letterSpacing: '0.05em'
                }}
              >
                MELHORES VENDEDORES DO SITE
              </span>
              <span className="text-3xl sm:text-4xl md:text-5xl">🚀</span>
            </h1>
          </div>
        </div>

        {/* Seletor de Localização */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border-2 border-green-400/30" style={{ boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)' }}>
          <div className="relative">
            <button
              onClick={() => setMostrarDropdownLocalizacao(!mostrarDropdownLocalizacao)}
              className="w-full flex items-center justify-between bg-green-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-green-700 transition-all uppercase"
              style={{ boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)' }}
            >
              <div className="flex items-center gap-2">
                <MapPin size={20} style={{ filter: 'drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))' }} />
                <span>
                  {brasilSelecionado 
                    ? '🇧🇷 Brasil inteiro' 
                    : `${cidadesSelecionadas.length} ${cidadesSelecionadas.length === 1 ? 'cidade' : 'cidades'} selecionada${cidadesSelecionadas.length > 1 ? 's' : ''}`
                  }
                </span>
              </div>
              <ChevronDown size={20} className={mostrarDropdownLocalizacao ? 'rotate-180' : ''} />
            </button>

            {mostrarDropdownLocalizacao && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMostrarDropdownLocalizacao(false)}
                />
                <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-lg shadow-xl border-2 border-blue-200 py-2 max-h-[70vh] overflow-y-auto z-20">
                  <div className="px-3 py-3 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-600">Selecione Brasil, Estados ou Cidades</p>
                  </div>
                  
                  {/* BRASIL */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBrasil();
                    }}
                    className="w-full px-4 py-3.5 flex items-center gap-3 text-left hover:bg-blue-50 font-bold"
                  >
                    <div className={`w-7 h-7 rounded border-2 flex items-center justify-center ${
                      brasilSelecionado
                        ? 'bg-blue-600 border-blue-600'
                        : 'border-gray-400'
                    }`}>
                      {brasilSelecionado && (
                        <CheckCircle size={18} className="text-white" />
                      )}
                    </div>
                    <span className="text-lg text-blue-900">🇧🇷 BRASIL</span>
                  </button>
                  
                  <div className="border-t border-gray-200 my-1"></div>
                  
                  {/* ESTADOS */}
                  {Object.entries(estruturaBrasil).map(([estado, cidades]) => (
                    <div key={estado}>
                      <div className="flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEstadoExpansao(estado);
                          }}
                          className="px-3 py-3 hover:bg-gray-100"
                        >
                          <ChevronRight 
                            size={20} 
                            className={`text-gray-600 transition-transform ${estadosExpandidos.includes(estado) ? 'rotate-90' : ''}`}
                          />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleEstado(estado);
                          }}
                          className="flex-1 px-3 py-3 flex items-center gap-3 text-left hover:bg-blue-50"
                        >
                          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                            estadoTotalmenteSelecionado(estado)
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300'
                          }`}>
                            {estadoTotalmenteSelecionado(estado) && (
                              <CheckCircle size={16} className="text-white" />
                            )}
                          </div>
                          <span className={`text-base ${
                            estadoTotalmenteSelecionado(estado)
                              ? 'font-bold text-blue-800'
                              : 'font-semibold text-gray-700'
                          }`}>
                            {estado}
                          </span>
                        </button>
                      </div>
                      
                      {estadosExpandidos.includes(estado) && (
                        <div className="ml-6 border-l-2 border-gray-200">
                          {cidades.map((cidade) => (
                            <button
                              key={cidade}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCidade(cidade);
                              }}
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-left hover:bg-blue-50"
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                cidadesSelecionadas.includes(cidade)
                                  ? 'bg-green-500 border-green-500'
                                  : 'border-gray-300'
                              }`}>
                                {cidadesSelecionadas.includes(cidade) && (
                                  <CheckCircle size={14} className="text-white" />
                                )}
                              </div>
                              <span className={`text-sm ${
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
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6 border-2 border-green-400/30" style={{ boxShadow: '0 0 15px rgba(34, 197, 94, 0.2)' }}>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2" style={{ color: '#22c55e', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
              <TrendingUp className="text-green-500" size={24} style={{ filter: 'drop-shadow(0 0 5px rgba(34, 197, 94, 0.8))' }} />
              <span className="hidden sm:inline uppercase">Período</span>
            </h2>
            
            <div className="flex gap-2 flex-wrap">
              {([
                { key: 'hoje', label: 'Hoje' },
                { key: 'semana', label: 'Semana' },
                { key: 'mes', label: 'Mês' },
                { key: 'todos', label: 'Todos' }
              ] as const).map((periodo) => (
                <button
                  key={periodo.key}
                  onClick={() => setPeriodoSelecionado(periodo.key)}
                  className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all uppercase ${
                    periodoSelecionado === periodo.key
                      ? 'bg-green-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-600 hover:border-green-400 border-2 border-transparent'
                  }`}
                  style={periodoSelecionado === periodo.key ? { boxShadow: '0 0 15px rgba(34, 197, 94, 0.5)' } : {}}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking de Autopeças */}
          <div>
            <h3 className="text-lg sm:text-xl font-black mb-4 flex items-center gap-2 uppercase" style={{ color: '#22c55e', textShadow: '0 0 10px rgba(34, 197, 94, 0.5)' }}>
              <span className="text-2xl">🏆</span>
              <span>Ranking por Faturamento</span>
            </h3>
            {rankingAutopecas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-green-600/70 text-lg font-semibold">Nenhum negócio fechado neste período e região.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {rankingAutopecas.map((autopeca, index) => {
                  const planoInfo = getPlanoInfo(autopeca.plano);
                  const isTop1Cidade = top1PorCidade[autopeca.id];
                  const cidadeFormatada = isTop1Cidade ? isTop1Cidade.split('-').join('-') : '';
                  
                  return (
                    <div key={autopeca.id}>
                      {index > 0 && (
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent my-3 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                      )}
                      <div 
                        className="flex items-center justify-between p-4 rounded-lg border-l-4 shadow-md hover:shadow-lg transition-all"
                        style={index === 0 ? {
                          background: 'linear-gradient(to right, rgba(59, 130, 246, 0.1), rgba(147, 197, 253, 0.1))',
                          boxShadow: '0 0 20px rgba(59, 130, 246, 0.5), 0 0 40px rgba(59, 130, 246, 0.3), inset 0 0 20px rgba(59, 130, 246, 0.1)',
                          borderLeftColor: '#3b82f6',
                          borderLeftWidth: '4px'
                        } : {
                          background: 'linear-gradient(to right, rgba(34, 197, 94, 0.05), rgba(16, 185, 129, 0.05))',
                          boxShadow: index < 3 ? '0 0 15px rgba(34, 197, 94, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                          borderLeftColor: index === 1 ? '#9ca3af' : index === 2 ? '#ea580c' : '#22c55e',
                          borderLeftWidth: '4px'
                        }}
                      >
                        <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div 
                            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-white flex-shrink-0 ${
                              index === 0 ? 'bg-blue-600' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-green-600'
                            }`}
                            style={index === 0 ? {
                              boxShadow: '0 0 15px rgba(59, 130, 246, 0.8), 0 0 30px rgba(59, 130, 246, 0.5)'
                            } : {
                              boxShadow: '0 0 10px rgba(0, 0, 0, 0.3)'
                            }}
                          >
                            {index + 1}º
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p 
                                className="font-black text-sm sm:text-base truncate uppercase" 
                                style={index === 0 ? {
                                  color: '#3b82f6',
                                  textShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.5)'
                                } : {
                                  color: '#15803d'
                                }}
                              >
                                {autopeca.nome}
                              </p>
                              <span 
                                className="text-xs sm:text-sm font-semibold flex items-center gap-1 whitespace-nowrap" 
                                style={index === 0 ? {
                                  color: '#3b82f6',
                                  textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                                } : {
                                  color: '#3b82f6',
                                  textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                                }}
                              >
                                <span>-{planoInfo.nome}</span>
                                {planoInfo.emoji && <span>{planoInfo.emoji}</span>}
                              </span>
                              {isTop1Cidade && (
                                <span className="text-xs sm:text-sm font-bold flex items-center gap-1 whitespace-nowrap" style={{ color: '#3b82f6', textShadow: '0 0 8px rgba(59, 130, 246, 0.6)' }}>
                                  TOP 1 {cidadeFormatada} 👑
                                </span>
                              )}
                            </div>
                            <p 
                              className="text-xs sm:text-sm font-semibold mt-1" 
                              style={index === 0 ? {
                                color: '#3b82f6',
                                textShadow: '0 0 8px rgba(59, 130, 246, 0.6)'
                              } : {
                                color: '#22c55e'
                              }}
                            >
                              {autopeca.quantidade} venda{autopeca.quantidade > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p 
                            className="text-lg sm:text-2xl font-black" 
                            style={index === 0 ? {
                              color: '#3b82f6',
                              textShadow: '0 0 10px rgba(59, 130, 246, 0.8), 0 0 20px rgba(59, 130, 246, 0.5)'
                            } : {
                              color: '#16a34a',
                              textShadow: '0 0 8px rgba(34, 197, 94, 0.4)'
                            }}
                          >
                            R$ {autopeca.total.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
