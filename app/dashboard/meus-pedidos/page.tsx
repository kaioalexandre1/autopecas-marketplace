'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Pedido } from '@/types';
import { Search, Trash2, ChevronUp, ChevronDown, Car } from 'lucide-react';
import { formatarPreco } from '@/lib/utils';
import toast from 'react-hot-toast';
import { excluirChatsDoPedido } from '@/lib/chatUtils';

export default function MeusPedidosPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [pedidosExpandidos, setPedidosExpandidos] = useState<string[]>([]);

  useEffect(() => {
    if (!userData || userData.tipo !== 'oficina') {
      router.push('/dashboard');
      return;
    }

    // Buscar apenas pedidos da oficina logada
    const q = query(
      collection(db, 'pedidos'),
      where('oficinaId', '==', userData.id),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const pedidosData: Pedido[] = [];
      const pedidosExpirados: string[] = [];
      const agora = new Date();

      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        
        // Verificar expiração (24 horas)
        const criacao = data.createdAt?.toDate() || new Date();
        const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
        
        if (horasPassadas >= 24 && data.status === 'ativo') {
          pedidosExpirados.push(docSnapshot.id);
        } else {
          pedidosData.push({
            id: docSnapshot.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          } as Pedido);
        }
      });

      // Processar pedidos expirados
      if (pedidosExpirados.length > 0) {
        pedidosExpirados.forEach(async (pedidoId) => {
          try {
            await excluirChatsDoPedido(pedidoId);
            await updateDoc(doc(db, 'pedidos', pedidoId), {
              status: 'expirado',
              updatedAt: Timestamp.now(),
            });
          } catch (error) {
            console.error(`Erro ao processar pedido expirado ${pedidoId}:`, error);
          }
        });
      }

      setPedidos(pedidosData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData, router]);

  const cancelarPedido = async (pedidoId: string) => {
    if (!confirm('Tem certeza que deseja cancelar este pedido?')) return;

    try {
      // Excluir chats relacionados
      await excluirChatsDoPedido(pedidoId);
      
      // Atualizar status do pedido
      await updateDoc(doc(db, 'pedidos', pedidoId), {
        status: 'cancelado',
        updatedAt: Timestamp.now(),
      });
      
      toast.success('Pedido cancelado com sucesso!');
    } catch (error) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error('Erro ao cancelar pedido. Tente novamente.');
    }
  };

  const toggleExpansaoPedido = (pedidoId: string) => {
    setPedidosExpandidos(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  const formatarDataHora = (data: Date) => {
    const hoje = new Date();
    const ontem = new Date(hoje);
    ontem.setDate(ontem.getDate() - 1);
    
    const dataPedido = new Date(data);
    const horasPassadas = (hoje.getTime() - dataPedido.getTime()) / (1000 * 60 * 60);
    
    if (horasPassadas < 24) {
      if (horasPassadas < 1) {
        const minutos = Math.floor(horasPassadas * 60);
        return minutos < 1 ? 'Agora' : `Há ${minutos} minuto${minutos > 1 ? 's' : ''}`;
      }
      return `Há ${Math.floor(horasPassadas)} hora${Math.floor(horasPassadas) > 1 ? 's' : ''}`;
    }
    
    return dataPedido.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-white">Carregando seus pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            Meus Pedidos
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Todos os seus pedidos, independente da localização
          </p>
        </div>

        {/* Grid de Pedidos */}
        <div className="flex-1">
          {pedidos.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-100 rounded-xl shadow border border-gray-200 dark:border-gray-300">
              <Search size={64} className="mx-auto text-gray-300 dark:text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-900 mb-2">
                Nenhum pedido encontrado
              </h3>
              <p className="text-gray-900 dark:text-gray-900">
                Você ainda não criou nenhum pedido
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pedidos.map((pedido) => {
                const isExpandido = pedidosExpandidos.includes(pedido.id);
                const diaIndicador = (() => {
                  const hoje = new Date();
                  const ontem = new Date(hoje);
                  ontem.setDate(ontem.getDate() - 1);
                  const dataPedido = new Date(pedido.createdAt);
                  
                  if (dataPedido.toDateString() === hoje.toDateString()) return 'Hoje';
                  if (dataPedido.toDateString() === ontem.toDateString()) return 'Ontem';
                  return dataPedido.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                })();

                return (
                  <div
                    key={pedido.id}
                    className={`bg-white dark:bg-gray-100 rounded-xl transition-all duration-300 ease-in-out p-4 border-2 ${
                      pedido.condicaoPeca === 'Nova' 
                        ? 'border-green-500 dark:border-green-600 shadow-[0_0_15px_3px_rgba(16,185,129,0.5)] dark:shadow-[0_0_15px_3px_rgba(16,185,129,0.4)]'
                        : pedido.condicaoPeca === 'Usada'
                        ? 'border-orange-500 dark:border-orange-600 shadow-[0_0_15px_3px_rgba(249,115,22,0.5)] dark:shadow-[0_0_15px_3px_rgba(249,115,22,0.4)]'
                        : pedido.condicaoPeca === 'Nova ou Usada'
                        ? 'border-green-500 dark:border-green-600 shadow-[0_0_15px_3px_rgba(16,185,129,0.4)] dark:shadow-[0_0_15px_3px_rgba(16,185,129,0.3)]'
                        : 'border-blue-500 dark:border-blue-600'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <p className="text-xs text-gray-900 dark:text-gray-900 font-semibold mb-1">
                          {diaIndicador} - {pedido.cidade}
                        </p>
                        <p className="text-xs text-gray-900 dark:text-gray-900 font-semibold mb-2">
                          Criado {formatarDataHora(pedido.createdAt)}
                        </p>
                        <div className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          pedido.status === 'ativo' ? 'bg-green-100 text-green-800 dark:bg-green-200 dark:text-green-900' :
                          pedido.status === 'fechado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-200 dark:text-blue-900' :
                          pedido.status === 'cancelado' ? 'bg-red-100 text-red-800 dark:bg-red-200 dark:text-red-900' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-200 dark:text-gray-900'
                        }`}>
                          {pedido.status === 'ativo' ? 'Ativo' :
                           pedido.status === 'fechado' ? 'Fechado' :
                           pedido.status === 'cancelado' ? 'Cancelado' :
                           'Expirado'}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {pedido.status === 'ativo' && (
                          <button
                            onClick={() => cancelarPedido(pedido.id)}
                            className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-2 transition-colors"
                            title="Cancelar pedido"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => toggleExpansaoPedido(pedido.id)}
                          className="bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full p-2 transition-colors"
                          title={isExpandido ? "Recolher" : "Expandir"}
                        >
                          {isExpandido ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Nome da Peça */}
                    <div className={`rounded-lg p-3 mb-3 border-2 ${
                      pedido.condicaoPeca === 'Nova' 
                        ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-400'
                        : pedido.condicaoPeca === 'Usada'
                        ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-400'
                        : pedido.condicaoPeca === 'Nova ou Usada'
                        ? 'border-green-400'
                        : 'bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-blue-400'
                    }`}
                    style={
                      pedido.condicaoPeca === 'Nova ou Usada'
                        ? {
                            background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.7) 0%, rgba(209, 250, 229, 0.7) 45%, rgba(254, 243, 199, 0.7) 55%, rgba(254, 243, 199, 0.7) 100%)',
                          }
                        : undefined
                    }>
                      <h3 className="font-black text-xl text-gray-900 dark:text-gray-900 uppercase text-center">
                        {pedido.nomePeca}
                      </h3>
                      {pedido.condicaoPeca && (
                        <div className="flex justify-center mt-2">
                          {pedido.condicaoPeca === 'Nova ou Usada' ? (
                            <span 
                              className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs text-white relative overflow-hidden"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #10b981 45%, #f97316 55%, #f97316 100%)'
                              }}
                            >
                              NOVO/USADO
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-xs ${
                              pedido.condicaoPeca === 'Nova' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                            }`}>
                              {pedido.condicaoPeca.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Informações do Carro */}
                    <div className="bg-white dark:bg-gray-50 rounded-lg p-3 mb-3 shadow-md border border-gray-200 dark:border-gray-300">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-md shadow-sm">
                          <Car size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="font-black text-lg text-gray-900 dark:text-gray-900 uppercase leading-tight tracking-wide">
                            {pedido.marcaCarro} {pedido.modeloCarro}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-700 font-bold mt-0.5">
                            ANO: {pedido.anoCarro}
                            {pedido.especificacaoMotor && ` | ${pedido.especificacaoMotor}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Ofertas */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-900 dark:text-gray-900 font-semibold">Ofertas recebidas:</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-900">
                          {pedido.ofertas?.length || 0}
                        </span>
                      </div>
                      
                      {isExpandido && pedido.ofertas && pedido.ofertas.length > 0 && (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {pedido.ofertas
                            .sort((a, b) => a.preco - b.preco)
                            .map((oferta) => (
                              <div
                                key={oferta.id}
                                className="text-xs p-2 rounded bg-gray-50 dark:bg-gray-100 border border-gray-200 dark:border-gray-300"
                              >
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-gray-900 dark:text-gray-900">{oferta.autopecaNome}</span>
                                  <span className="text-green-700 dark:text-green-800 font-semibold">
                                    {formatarPreco(oferta.preco)}
                                  </span>
                                </div>
                                {oferta.observacao && (
                                  <div className="text-xs text-gray-900 dark:text-gray-900 italic mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-400">
                                    💬 {oferta.observacao}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

