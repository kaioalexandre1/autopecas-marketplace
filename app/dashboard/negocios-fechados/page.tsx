'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { NegocioFechado } from '@/types';
import { CheckCircle, Calendar, Package, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';

type Periodo = 'hoje' | 'semana' | 'mes';

export default function NegociosFechadosPage() {
  const { userData } = useAuth();
  const [negocios, setNegocios] = useState<NegocioFechado[]>([]);
  const [negociosFiltrados, setNegociosFiltrados] = useState<NegocioFechado[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoSelecionado, setPeriodoSelecionado] = useState<Periodo>('hoje');

  useEffect(() => {
    if (!userData) {
      console.log('Aguardando userData...');
      return;
    }

    console.log('Carregando negócios fechados para:', userData.tipo, userData.id);

    // Buscar todos os negócios fechados (sem filtro de data)
    let q;
    
    if (userData.tipo === 'oficina') {
      q = query(
        collection(db, 'negocios_fechados'),
        where('oficinaId', '==', userData.id)
      );
    } else if (userData.tipo === 'autopeca') {
      q = query(
        collection(db, 'negocios_fechados'),
        where('autopecaId', '==', userData.id)
      );
    } else {
      // Para todos os negócios (admin ou visualização geral)
      q = query(
        collection(db, 'negocios_fechados')
      );
    }

    if (!q) {
      console.log('Query não definida');
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        console.log('Snapshot recebido:', snapshot.size, 'documentos');
        const negociosData: NegocioFechado[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          const negocio = {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as NegocioFechado;
          negociosData.push(negocio);
        });
        // Ordenar no cliente (mais recente primeiro)
        negociosData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        console.log('Negócios carregados:', negociosData.length);
        setNegocios(negociosData);
        setLoading(false);
      },
      (error) => {
        console.error('Erro ao buscar negócios:', error);
        toast.error('Erro ao carregar negócios fechados');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userData]);

  // Filtrar negócios por período
  useEffect(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo
    inicioSemana.setHours(0, 0, 0, 0);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioMes.setHours(0, 0, 0, 0);

    let filtrados: NegocioFechado[] = [];

    if (periodoSelecionado === 'hoje') {
      filtrados = negocios.filter(n => n.createdAt >= hoje);
    } else if (periodoSelecionado === 'semana') {
      filtrados = negocios.filter(n => n.createdAt >= inicioSemana);
    } else if (periodoSelecionado === 'mes') {
      filtrados = negocios.filter(n => n.createdAt >= inicioMes);
    }

    setNegociosFiltrados(filtrados);
  }, [negocios, periodoSelecionado]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const getTituloPeriodo = () => {
    if (periodoSelecionado === 'hoje') return 'Hoje';
    if (periodoSelecionado === 'semana') return 'Esta Semana';
    return 'Este Mês';
  };

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center mb-2">
          <CheckCircle className="mr-2 sm:mr-3 text-green-600" size={28} />
          Negócios Fechados
        </h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center text-gray-600">
            <Calendar size={16} className="mr-2" />
            <span className="text-sm sm:text-base">
              {format(new Date(), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          {/* Seletor de Período */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setPeriodoSelecionado('hoje')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                periodoSelecionado === 'hoje'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodoSelecionado('semana')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                periodoSelecionado === 'semana'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriodoSelecionado('mes')}
              className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm sm:text-base ${
                periodoSelecionado === 'mes'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Mês
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      {negociosFiltrados.length > 0 && (
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg p-4 sm:p-6 text-white">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center">
            <TrendingUp className="mr-2" size={22} />
            Estatísticas - {getTituloPeriodo()}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
            <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
              <p className="text-green-100 text-xs sm:text-sm mb-1">Total de Negócios</p>
              <p className="text-2xl sm:text-3xl font-bold">{negociosFiltrados.length}</p>
            </div>

            <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
              <p className="text-green-100 text-xs sm:text-sm mb-1">Valor Total</p>
              <p className="text-2xl sm:text-3xl font-bold">
                R$ {negociosFiltrados.reduce((total, n) => total + (n.valorFinal || 0), 0).toFixed(2)}
              </p>
            </div>
            
            {userData?.tipo === 'oficina' && (
              <>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
                  <p className="text-green-100 text-xs sm:text-sm mb-1">Peças Compradas</p>
                  <p className="text-2xl sm:text-3xl font-bold">{negociosFiltrados.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
                  <p className="text-green-100 text-xs sm:text-sm mb-1">Fornecedores</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {new Set(negociosFiltrados.map(n => n.autopecaId)).size}
                  </p>
                </div>
              </>
            )}

            {userData?.tipo === 'autopeca' && (
              <>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
                  <p className="text-green-100 text-xs sm:text-sm mb-1">Peças Vendidas</p>
                  <p className="text-2xl sm:text-3xl font-bold">{negociosFiltrados.length}</p>
                </div>
                <div className="bg-white bg-opacity-20 rounded-lg p-3 sm:p-4">
                  <p className="text-green-100 text-xs sm:text-sm mb-1">Clientes</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {new Set(negociosFiltrados.map(n => n.oficinaId)).size}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Lista de Negócios Fechados */}
      {negociosFiltrados.length === 0 ? (
        <div className="text-center py-12 sm:py-20 bg-white rounded-xl shadow mt-6 sm:mt-8">
          <CheckCircle size={56} className="mx-auto text-gray-300 mb-3 sm:mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-600 mb-2 px-3">
            Nenhum negócio fechado {periodoSelecionado === 'hoje' ? 'hoje' : periodoSelecionado === 'semana' ? 'esta semana' : 'este mês'}
          </h3>
          <p className="text-sm sm:text-base text-gray-500">
            Os negócios fechados aparecerão aqui
          </p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4 mt-6 sm:mt-8">
          {negociosFiltrados.map((negocio) => (
            <div
              key={negocio.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow p-4 sm:p-6 border-l-4 border-green-500 animate-slide-in"
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0">
                <div className="flex-1 w-full">
                  <div className="flex items-center mb-2 sm:mb-3">
                    <CheckCircle className="text-green-600 mr-2 flex-shrink-0" size={20} />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      {negocio.nomePeca}
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-2 sm:mb-3">
                    <div className="bg-blue-50 rounded-lg p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Oficina</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{negocio.oficinaNome}</p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Autopeça</p>
                      <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">{negocio.autopecaNome}</p>
                    </div>

                    <div className="bg-yellow-50 rounded-lg p-2.5 sm:p-3">
                      <p className="text-[10px] sm:text-xs text-gray-600 mb-0.5 sm:mb-1">Valor Final</p>
                      <p className="font-bold text-green-700 text-base sm:text-lg">
                        R$ {negocio.valorFinal?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center text-xs sm:text-sm text-gray-600">
                    <Calendar size={14} className="mr-2 flex-shrink-0" />
                    <span>
                      Fechado às {format(negocio.createdAt, 'HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                </div>

                <div className="ml-0 sm:ml-4 self-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

