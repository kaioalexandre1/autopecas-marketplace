'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { NegocioFechado } from '@/types';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { startOfDay, startOfWeek, startOfMonth, isAfter } from 'date-fns';

export default function RankingPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [negocios, setNegocios] = useState<NegocioFechado[]>([]);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | 'semana' | 'mes' | 'todos'>('mes');

  useEffect(() => {
    if (!authLoading && !userData) {
      router.push('/login');
    }
  }, [userData, authLoading, router]);

  useEffect(() => {
    if (userData) {
      carregarNegocios();
    }
  }, [userData, periodoSelecionado]);

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
    } catch (error) {
      console.error('Erro ao carregar negócios:', error);
    } finally {
      setCarregando(false);
    }
  };

  // Filtrar negócios por período
  const negociosFiltrados = negocios.filter(negocio => {
    if (periodoSelecionado === 'todos') return true;
    
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
    
    return isAfter(dataNegocio, dataInicio);
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
          <h1 className="text-3xl sm:text-4xl font-black text-blue-900 mb-2">
            🏆 Ranking de Autopeças
          </h1>
          <p className="text-gray-600 text-sm sm:text-lg">Ranking por faturamento</p>
        </div>

        {/* Seletor de Período */}
        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
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
                <p className="text-gray-500 text-lg">Nenhum negócio fechado neste período.</p>
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

