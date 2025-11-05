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
    if (!acc[negocio.autopecaNome]) {
      acc[negocio.autopecaNome] = {
        nome: negocio.autopecaNome,
        id: negocio.autopecaId,
        total: 0,
        quantidade: 0
      };
    }
    acc[negocio.autopecaNome].total += negocio.valorFinal || 0;
    acc[negocio.autopecaNome].quantidade += 1;
    return acc;
  }, {} as Record<string, { nome: string; id: string; total: number; quantidade: number }>);

  const rankingAutopecas = Object.values(faturamentoPorAutopeca).sort((a, b) => b.total - a.total);

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Voltar ao Dashboard</span>
              <span className="sm:hidden">Voltar</span>
            </Link>
          </div>
          
          {/* Título com neon amarelo */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 uppercase text-center sm:text-left">
            <span 
              className="inline-block"
              style={{
                color: '#FFD700',
                textShadow: '0 0 10px rgba(255, 215, 0, 0.8), 0 0 20px rgba(255, 215, 0, 0.6), 0 0 30px rgba(255, 215, 0, 0.4)',
                letterSpacing: '0.05em'
              }}
            >
              MELHORES VENDEDORES DO SITE
            </span>
          </h1>
        </div>

        {/* Seletor de Localização */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="relative">
            <button
              onClick={() => setMostrarDropdownLocalizacao(!mostrarDropdownLocalizacao)}
              className="w-full flex items-center justify-between bg-blue-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin size={20} />
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
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={24} />
              <span className="hidden sm:inline">Período</span>
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
                  className={`px-3 sm:px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    periodoSelecionado === periodo.key
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ranking de Autopeças */}
          <div>
            <h3 className="text-lg sm:text-xl font-black text-gray-900 mb-4">
              🏆 Ranking por Faturamento
            </h3>
            {rankingAutopecas.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-lg">Nenhum negócio fechado neste período e região.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rankingAutopecas.map((autopeca, index) => (
                  <div 
                    key={autopeca.id}
                    className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-blue-500 shadow-md hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-black text-white flex-shrink-0 ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                      }`}>
                        {index + 1}º
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-gray-900 text-sm sm:text-base truncate">{autopeca.nome}</p>
                        <p className="text-xs sm:text-sm text-gray-600">{autopeca.quantidade} venda{autopeca.quantidade > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-lg sm:text-2xl font-black text-green-600">R$ {autopeca.total.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
