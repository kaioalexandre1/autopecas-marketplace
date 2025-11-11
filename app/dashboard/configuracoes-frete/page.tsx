'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, updateDoc, doc, getDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Truck, DollarSign, Clock, TrendingUp, Save } from 'lucide-react';
import { formatarPreco } from '@/lib/utils';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function ConfiguracoesFretePage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [valorFrete, setValorFrete] = useState<string>('');
  const [prazoColeta, setPrazoColeta] = useState<string>('');
  const [prazoEntrega, setPrazoEntrega] = useState<string>('');
  const [veiculoTipo, setVeiculoTipo] = useState<'MOTO' | 'UTILITARIO' | 'CAMINHÃO' | ''>('');
  const [veiculoMarca, setVeiculoMarca] = useState('');
  const [veiculoModelo, setVeiculoModelo] = useState('');
  const [veiculoAno, setVeiculoAno] = useState('');
  const [veiculoPlaca, setVeiculoPlaca] = useState('');

  const [totalFretes, setTotalFretes] = useState(0);
  const [totalLucro, setTotalLucro] = useState(0);
  const [registroDescricao, setRegistroDescricao] = useState('');
  const [registroValor, setRegistroValor] = useState('');
  const [registrandoFrete, setRegistrandoFrete] = useState(false);
  const [fretesManuais, setFretesManuais] = useState<{ descricao: string; valor: number; data?: Date }[]>([]);

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
      const userDoc = await getDoc(doc(db, 'users', userData.id));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setValorFrete(data.valorFreteDentroCidade?.toString() || '');
        setPrazoColeta(data.prazoColeta || '');
        setPrazoEntrega(data.prazoEntrega || '');
        setVeiculoTipo(data.veiculoTipo || '');
        setVeiculoMarca(data.veiculoMarca || '');
        setVeiculoModelo(data.veiculoModelo || '');
        setVeiculoAno(data.veiculoAno || '');
        setVeiculoPlaca(data.veiculoPlaca || '');
        const fretesManuaisLista = data.fretesManuais?.map((item: any) => ({
          descricao: item.descricao || '',
          valor: Number(item.valor || 0),
          data: item.data?.toDate ? item.data.toDate() : item.data ? new Date(item.data) : undefined,
        })) || [];

        setFretesManuais(fretesManuaisLista);
        setTotalFretes(totalFretes + fretesManuaisLista.length);
        setTotalLucro(totalLucro + fretesManuaisLista.reduce((acc, item) => acc + item.valor, 0));
      }

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

    if (!veiculoTipo) {
      toast.error('Selecione o tipo de veículo');
      return;
    }

    if (!veiculoMarca.trim() || !veiculoModelo.trim()) {
      toast.error('Informe marca e modelo do veículo');
      return;
    }

    setSalvando(true);
    try {
      await updateDoc(doc(db, 'users', userData.id), {
        valorFreteDentroCidade: valor,
        prazoColeta: prazoColeta.trim(),
        prazoEntrega: prazoEntrega.trim(),
        updatedAt: new Date(),
        veiculoTipo,
        veiculoMarca: veiculoMarca.trim(),
        veiculoModelo: veiculoModelo.trim(),
        veiculoAno: veiculoAno.trim(),
        veiculoPlaca: veiculoPlaca.trim(),
        fretesManuais: fretesManuais.map((item) => ({
          descricao: item.descricao,
          valor: item.valor,
          data: item.data ? Timestamp.fromDate(item.data) : Timestamp.now(),
        })),
      });

      toast.success('Configurações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSalvando(false);
    }
  };

  const registrarFreteManual = async () => {
    if (!userData) return;

    const valorNumero = parseFloat(registroValor.replace(',', '.'));
    if (!registroDescricao.trim() || isNaN(valorNumero)) {
      toast.error('Informe descrição e valor válido');
      return;
    }

    setRegistrandoFrete(true);
    try {
      const novoFrete = {
        descricao: registroDescricao.trim(),
        valor: valorNumero,
        data: Timestamp.now(),
      };

      await updateDoc(doc(db, 'users', userData.id), {
        fretesManuais: arrayUnion(novoFrete),
      });

      setFretesManuais((prev) => {
        const atualizada = [{ descricao: novoFrete.descricao, valor: valorNumero, data: new Date() }, ...prev];
        setTotalFretes((prevTotal) => prevTotal + 1);
        setTotalLucro((prevLucro) => prevLucro + valorNumero);
        return atualizada;
      });
      setRegistroDescricao('');
      setRegistroValor('');
      toast.success('Corrida registrada!');
    } catch (error) {
      console.error('Erro ao registrar corrida manual:', error);
      toast.error('Erro ao registrar corrida');
    } finally {
      setRegistrandoFrete(false);
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
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-20 left-20 text-6xl opacity-20 animate-bounce">🚚</div>
        <div className="absolute top-40 right-32 text-5xl opacity-15 animate-bounce" style={{ animationDelay: '0.5s' }}>📦</div>
        <div className="absolute bottom-32 left-1/3 text-6xl opacity-20 animate-bounce" style={{ animationDelay: '1s' }}>💰</div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-yellow-400">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
                <DollarSign className="mr-2 text-yellow-600" size={28} />
                Valores e Prazos
              </h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Tipo de Veículo *
                  </label>
                  <select
                    value={veiculoTipo}
                    onChange={(e) => setVeiculoTipo(e.target.value as 'MOTO' | 'UTILITARIO' | 'CAMINHÃO' | '')}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                  >
                    <option value="">Selecione</option>
                    <option value="MOTO">Moto</option>
                    <option value="UTILITARIO">Utilitário</option>
                    <option value="CAMINHÃO">Caminhão</option>
                  </select>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Marca *
                    </label>
                    <input
                      type="text"
                      value={veiculoMarca}
                      onChange={(e) => setVeiculoMarca(e.target.value)}
                      placeholder="Ex: Honda"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      value={veiculoModelo}
                      onChange={(e) => setVeiculoModelo(e.target.value)}
                      placeholder="Ex: CG 160"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Ano
                    </label>
                    <input
                      type="text"
                      value={veiculoAno}
                      onChange={(e) => setVeiculoAno(e.target.value)}
                      placeholder="Ex: 2021"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Placa
                    </label>
                    <input
                      type="text"
                      value={veiculoPlaca}
                      onChange={(e) => setVeiculoPlaca(e.target.value.toUpperCase())}
                      placeholder="Ex: ABC1D23"
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-gray-900 dark:text-gray-900 bg-white"
                    />
                  </div>
                </div>

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

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 border-2 border-green-400">
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 flex items-center">
                <TrendingUp className="mr-2 text-green-600" size={28} />
                Estatísticas
              </h2>

              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-900 to-blue-700 rounded-xl p-4 text-white shadow-inner">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                      Total de Fretes Realizados
                    </span>
                    <Truck className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <p className="text-4xl font-black text-blue-700 dark:text-blue-300">
                    {totalFretes}
                  </p>
                </div>

                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-700">
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

                <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-4 text-white shadow-inner border border-gray-700">
                  <h3 className="text-sm font-bold uppercase text-gray-300 flex items-center gap-2 mb-3">
                    <Truck size={16} /> Veículo Cadastrado
                  </h3>
                  {veiculoTipo ? (
                    <div className="space-y-1 text-sm">
                      <p><span className="text-gray-400 uppercase text-xs">Tipo:</span> {veiculoTipo === 'MOTO' ? 'Moto' : veiculoTipo === 'UTILITARIO' ? 'Utilitário' : 'Caminhão'}</p>
                      <p><span className="text-gray-400 uppercase text-xs">Marca / Modelo:</span> {veiculoMarca || '-'} {veiculoModelo ? `• ${veiculoModelo}` : ''}</p>
                      <p><span className="text-gray-400 uppercase text-xs">Ano:</span> {veiculoAno || '-'}</p>
                      <p><span className="text-gray-400 uppercase text-xs">Placa:</span> {veiculoPlaca || '-'}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-300">Informe os dados do veículo para que as oficinas saibam quem fará a entrega.</p>
                  )}
                </div>

                <div className="bg-gradient-to-r from-green-900 to-green-800 rounded-xl p-4 text-white shadow-inner border border-green-700">
                  <h3 className="text-sm font-bold uppercase text-green-200 flex items-center gap-2 mb-3">
                    <DollarSign size={16} /> Registrar Corridas Manualmente
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-green-100 uppercase mb-1">Descrição</label>
                      <input
                        type="text"
                        value={registroDescricao}
                        onChange={(e) => setRegistroDescricao(e.target.value)}
                        placeholder="Ex: Entrega bairro centro"
                        className="w-full px-3 py-2 rounded-lg bg-green-900/50 border border-green-500 text-white placeholder-green-200 focus:ring-2 focus:ring-green-400 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-green-100 uppercase mb-1">Valor</label>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-2 bg-green-900/50 border border-green-500 rounded-lg text-white font-bold">R$</span>
                        <input
                          type="text"
                          value={registroValor}
                          onChange={(e) => setRegistroValor(e.target.value.replace(/[^0-9.,]/g, ''))}
                          placeholder="0,00"
                          className="flex-1 px-3 py-2 rounded-lg bg-green-900/50 border border-green-500 text-white placeholder-green-200 focus:ring-2 focus:ring-green-400 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <button
                      onClick={registrarFreteManual}
                      disabled={registrandoFrete}
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 rounded-lg shadow-lg transition-all disabled:opacity-60"
                    >
                      {registrandoFrete ? 'Registrando...' : 'Adicionar corrida' }
                    </button>
                    {fretesManuais.length > 0 && (
                      <div className="pt-4 border-t border-green-700/60 space-y-2 max-h-48 overflow-y-auto">
                        <p className="text-xs uppercase text-green-200 font-semibold">Histórico</p>
                        {fretesManuais.map((item, idx) => (
                          <div key={idx} className="bg-green-900/60 rounded-lg px-3 py-2 flex items-center justify-between text-sm">
                            <div>
                              <p className="font-semibold text-white">{item.descricao}</p>
                              <p className="text-xs text-green-200">{item.data ? format(item.data, 'dd/MM/yyyy HH:mm') : ''}</p>
                            </div>
                            <span className="text-green-300 font-bold">{formatarPreco(item.valor)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

