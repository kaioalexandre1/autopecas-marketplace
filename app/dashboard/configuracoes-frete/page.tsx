'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, DollarSign, Clock, TrendingUp, Save } from 'lucide-react';
import { formatarPreco } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function ConfiguracoesFretePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  
  // Configurações
  const [valorFrete, setValorFrete] = useState<string>('');
  const [prazoColeta, setPrazoColeta] = useState<string>('');
  const [prazoEntrega, setPrazoEntrega] = useState<string>('');
  
  // Estatísticas
  const [totalFretes, setTotalFretes] = useState(0);
  const [totalLucro, setTotalLucro] = useState(0);

  useEffect(() => {
    if (!userData) {
      router.push('/login');
      return;
    }

    if (userData.tipo !== 'entregador') {
      router.push('/dashboard');
      return;
    }

    carregarDados();
  }, [userData, router]);

  const carregarDados = async () => {
    if (!userData) return;

    setLoading(true);
    try {
      // Carregar configurações do usuário
      const userDoc = await getDoc(doc(db, 'users', userData.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setValorFrete(data.valorFreteDentroCidade?.toString() || '');
        setPrazoColeta(data.prazoColeta || '');
        setPrazoEntrega(data.prazoEntrega || '');
      }

      // Carregar estatísticas de fretes aceitos (ofertas confirmadas)
      const ofertasQuery = query(
        collection(db, 'ofertasFrete'),
        where('entregadorId', '==', userData.id),
        where('status', '==', 'aceita')
      );

      const snapshot = await getDocs(ofertasQuery);
      let total = 0;
      let lucro = 0;

      snapshot.forEach((registro) => {
        const data = registro.data();
        total += 1;
        lucro += data.valorFrete || 0;
      });

      setTotalFretes(total);
      setTotalLucro(lucro);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const salvarConfiguracoes = async () => {
    if (!userData) return;

    const valor = parseFloat(valorFrete.replace(',', '.'));
    if (isNaN(valor) || valor <= 0) {
      toast.error('Valor de frete inválido');
      return;
    }

    if (!prazoColeta.trim() || !prazoEntrega.trim()) {
      toast.error('Preencha os prazos de coleta e entrega');
      return;
    }

    setSalvando(true);
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        valorFreteDentroCidade: valor,
        prazoColeta: prazoColeta.trim(),
        prazoEntrega: prazoEntrega.trim(),
        updatedAt: new Date(),
      });

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 relative">
      {/* Background decorativo */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-20 text-6xl opacity-20 animate-bounce">🚚</div>
        <div className="absolute top-40 right-32 text-5xl opacity-15 animate-bounce" style={{ animationDelay: '0.5s' }}>📦</div>
        <div className="absolute bottom-32 left-1/3 text-6xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>💰</div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-yellow-500 rounded-full mb-4 shadow-lg">
              <Truck className="text-white" size={40} />
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 drop-shadow-lg">
              Configurações de Frete
            </h1>
            <p className="text-lg text-white/90 font-medium">
              Gerencie seus valores e prazos de entrega
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Card de Configurações */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-yellow-400">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
                <DollarSign className="mr-2 text-yellow-600" size={28} />
                Valores e Prazos
              </h2>

              <div className="space-y-6">
                {/* Valor do Frete */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Valor do Frete (Dentro da Cidade) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-bold">R$</span>
                    <input
                      type="text"
                      value={valorFrete}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^\d,]/g, '');
                        setValorFrete(value);
                      }}
                      placeholder="0,00"
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-lg font-bold text-gray-900 dark:text-gray-900 bg-white"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Digite apenas números. Ex: 15 ou 15,50</p>
                </div>

                {/* Prazo de Coleta */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Prazo de Coleta *
                  </label>
                  <input
                    type="text"
                    value={prazoColeta}
                    onChange={(e) => setPrazoColeta(e.target.value)}
                    placeholder="Ex: 1-2 horas, 30 minutos, etc."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                  />
                </div>

                {/* Prazo de Entrega */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Prazo de Entrega *
                  </label>
                  <input
                    type="text"
                    value={prazoEntrega}
                    onChange={(e) => setPrazoEntrega(e.target.value)}
                    placeholder="Ex: 2-3 dias úteis, 1 dia, etc."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                  />
                </div>

                {/* Botão Salvar */}
                <button
                  onClick={salvarConfiguracoes}
                  disabled={salvando}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-black py-4 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {salvando ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={20} className="mr-2" />
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Card de Estatísticas */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-green-400">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
                <TrendingUp className="mr-2 text-green-600" size={28} />
                Estatísticas
              </h2>

              <div className="space-y-6">
                {/* Total de Fretes */}
                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total de Fretes Realizados
                    </span>
                    <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <p className="text-4xl font-black text-blue-700 dark:text-blue-300">
                    {totalFretes}
                  </p>
                </div>

                {/* Total Lucro */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total Lucrado
                    </span>
                    <DollarSign className="text-green-600 dark:text-green-400" size={24} />
                  </div>
                  <p className="text-4xl font-black text-green-700 dark:text-green-300">
                    {formatarPreco(totalLucro)}
                  </p>
                </div>

                {/* Prazo Médio */}
                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border-2 border-yellow-200 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Prazo Configurado
                    </span>
                    <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                      Coleta: <span className="font-normal">{prazoColeta || 'Não configurado'}</span>
                    </p>
                    <p className="text-lg font-bold text-yellow-700 dark:text-yellow-300">
                      Entrega: <span className="font-normal">{prazoEntrega || 'Não configurado'}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Registrar corrida */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-blue-400 mb-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
              <Truck className="mr-2 text-blue-600" size={28} />
              Registrar Corrida Concluída
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Valor recebido (R$) *
                </label>
              <input
                type="text"
                value={novoFreteValor}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d.,]/g, '');
                  const normalizado = raw.replace(/\./g, ',');
                  setNovoFreteValor(normalizado);
                }}
                placeholder="Ex: 25,00"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
              />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Origem (opcional)
                </label>
                <input
                  type="text"
                  value={novoFreteOrigem}
                  onChange={(e) => setNovoFreteOrigem(e.target.value)}
                  placeholder="Ex: Autopeças X"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Destino (opcional)
                </label>
                <input
                  type="text"
                  value={novoFreteDestino}
                  onChange={(e) => setNovoFreteDestino(e.target.value)}
                  placeholder="Ex: Oficina Y"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Observações (opcional)
                </label>
                <textarea
                  value={novoFreteObservacoes}
                  onChange={(e) => setNovoFreteObservacoes(e.target.value)}
                  placeholder="Ex: Pagamento em dinheiro, entrega urgente, etc."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white min-h-[100px]"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={registrarFrete}
                disabled={registrandoFrete}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black px-6 py-3 rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {registrandoFrete ? 'Registrando...' : 'Registrar Corrida'}
              </button>
            </div>
          </div>

          {/* Histórico */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-blue-200">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Histórico de Corridas</h2>

            {historicoFretes.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400 font-semibold">
                Você ainda não registrou nenhuma corrida.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-blue-50 dark:bg-blue-900/40 text-left text-xs sm:text-sm uppercase tracking-wide text-blue-900 dark:text-blue-200">
                      <th className="px-4 py-3 border-b border-blue-200 dark:border-blue-700">Data</th>
                      <th className="px-4 py-3 border-b border-blue-200 dark:border-blue-700">Origem</th>
                      <th className="px-4 py-3 border-b border-blue-200 dark:border-blue-700">Destino</th>
                      <th className="px-4 py-3 border-b border-blue-200 dark:border-blue-700">Valor</th>
                      <th className="px-4 py-3 border-b border-blue-200 dark:border-blue-700">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoFretes.map((frete) => (
                      <tr key={frete.id} className="border-b border-gray-100 dark:border-gray-700 text-sm">
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {frete.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {frete.origem || '--'}
                        </td>
                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                          {frete.destino || '--'}
                        </td>
                        <td className="px-4 py-3 text-green-600 dark:text-green-300 font-bold">
                          {formatarPreco(frete.valor)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                          {frete.observacoes || '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

