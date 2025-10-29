'use client';

import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc,
  getDocs,
  getDoc,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { OfertaFrete, User, Pedido } from '@/types';
import { X, Truck, MapPin, Clock, DollarSign, Send, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface OfertasFreteModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  pedidoId: string;
  entregadorId: string;
  entregadorNome: string;
}

export default function OfertasFreteModal({ 
  isOpen, 
  onClose, 
  chatId, 
  pedidoId, 
  entregadorId, 
  entregadorNome 
}: OfertasFreteModalProps) {
  const [ofertas, setOfertas] = useState<OfertaFrete[]>([]);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [oficina, setOficina] = useState<User | null>(null);
  const [autopeca, setAutopeca] = useState<User | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [valorFrete, setValorFrete] = useState('');
  const [prazoEntrega, setPrazoEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!isOpen || !pedidoId) return;

    const buscarPedido = async () => {
      setCarregando(true);
      try {
        const pedidoRef = doc(db, 'pedidos', pedidoId);
        const pedidoDoc = await getDoc(pedidoRef);
        
        if (pedidoDoc.exists()) {
          const pedidoData = pedidoDoc.data() as Pedido;
          setPedido({ ...pedidoData, id: pedidoDoc.id });

          const oficinaRef = doc(db, 'users', pedidoData.oficinaId);
          const oficinaDoc = await getDoc(oficinaRef);
          if (oficinaDoc.exists()) {
            const oficinaData = oficinaDoc.data() as User;
            setOficina({ ...oficinaData, id: oficinaDoc.id });
          }

          if (pedidoData.ofertas && pedidoData.ofertas.length > 0) {
            const autopecaRef = doc(db, 'users', pedidoData.ofertas[0].autopecaId);
            const autopecaDoc = await getDoc(autopecaRef);
            if (autopecaDoc.exists()) {
              const autopecaData = autopecaDoc.data() as User;
              setAutopeca({ ...autopecaData, id: autopecaDoc.id });
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar dados:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setCarregando(false);
      }
    };

    buscarPedido();

    const q = query(
      collection(db, 'ofertasFrete'),
      where('pedidoId', '==', pedidoId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ofertasData: OfertaFrete[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        ofertasData.push({
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        } as OfertaFrete);
      });
      ofertasData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setOfertas(ofertasData);
    });

    return () => unsubscribe();
  }, [isOpen, pedidoId]);

  const enviarOferta = async () => {
    if (!valorFrete || !prazoEntrega) {
      toast.error('Preencha valor e prazo');
      return;
    }

    setEnviando(true);
    try {
      const novaOferta = {
        entregadorId,
        entregadorNome,
        chatId,
        pedidoId,
        valorFrete: parseFloat(valorFrete),
        prazoEntrega,
        observacoes: observacoes.trim() || null,
        status: 'pendente' as const,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'ofertasFrete'), novaOferta);

      const mensagemFrete = {
        id: `${Date.now()}-frete`,
        remetenteId: entregadorId,
        remetenteTipo: 'entregador' as any,
        texto: `🚚 Oferta de frete: R$ ${parseFloat(valorFrete).toFixed(2)} - Prazo: ${prazoEntrega}${observacoes ? ` - ${observacoes}` : ''}`,
        createdAt: Timestamp.now(),
      };

      const chatRef = doc(db, 'chats', chatId);
      await updateDoc(chatRef, {
        mensagens: arrayUnion(mensagemFrete),
        updatedAt: Timestamp.now(),
      });

      toast.success('Oferta de frete enviada!');
      setMostrarFormulario(false);
      setValorFrete('');
      setPrazoEntrega('');
      setObservacoes('');
    } catch (error) {
      console.error('Erro ao enviar oferta:', error);
      toast.error('Erro ao enviar oferta');
    } finally {
      setEnviando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Truck className="text-blue-600" size={24} />
              <div>
                <h2 className="text-xl font-bold text-gray-900">Ofertas de Frete</h2>
                <p className="text-sm text-gray-600">
                  {pedido?.nomePeca} - {pedido?.marcaCarro} {pedido?.modeloCarro} {pedido?.anoCarro}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]">
          {carregando ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando dados...</p>
              </div>
            </div>
          ) : (
            <>
              {oficina && autopeca && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                    <MapPin size={18} className="mr-2" />
                    Endereços
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-blue-800">📍 Autopeça</p>
                      <p className="text-sm text-blue-700">{autopeca.nome}</p>
                      <p className="text-sm text-blue-600">
                        {autopeca.endereco}
                        {autopeca.numero && `, ${autopeca.numero}`}
                        {autopeca.bairro && ` - ${autopeca.bairro}`}
                      </p>
                      <p className="text-sm text-blue-600">
                        {autopeca.cidade}
                        {autopeca.cep && ` - ${autopeca.cep}`}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-blue-800">🏢 Oficina</p>
                      <p className="text-sm text-blue-700">{oficina.nome}</p>
                      <p className="text-sm text-blue-600">
                        {oficina.endereco}
                        {oficina.numero && `, ${oficina.numero}`}
                        {oficina.bairro && ` - ${oficina.bairro}`}
                      </p>
                      <p className="text-sm text-blue-600">
                        {oficina.cidade}
                        {oficina.cep && ` - ${oficina.cep}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <button
                  onClick={() => setMostrarFormulario(!mostrarFormulario)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center transition-colors"
                >
                  <Send size={18} className="mr-2" />
                  {mostrarFormulario ? 'Cancelar Nova Oferta' : 'Nova Oferta de Frete'}
                </button>
              </div>

              {mostrarFormulario && (
                <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
                  <h3 className="font-semibold text-gray-900 mb-3">Enviar Oferta de Frete</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor do Frete (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={valorFrete}
                        onChange={(e) => setValorFrete(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prazo de Entrega
                      </label>
                      <input
                        type="text"
                        value={prazoEntrega}
                        onChange={(e) => setPrazoEntrega(e.target.value)}
                        placeholder="Ex: 2-3 dias úteis"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observações (opcional)
                    </label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Informações adicionais sobre a entrega..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="mt-4 flex space-x-3">
                    <button
                      onClick={enviarOferta}
                      disabled={enviando || !valorFrete || !prazoEntrega}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center"
                    >
                      {enviando ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      ) : (
                        <Send size={16} className="mr-2" />
                      )}
                      Enviar Oferta
                    </button>
                    <button
                      onClick={() => setMostrarFormulario(false)}
                      className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                  <Eye size={18} className="mr-2" />
                  Ofertas Enviadas ({ofertas.length})
                </h3>
                {ofertas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Truck size={48} className="mx-auto mb-3 text-gray-300" />
                    <p>Nenhuma oferta enviada ainda</p>
                    <p className="text-sm mt-1">Envie sua primeira oferta de frete!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ofertas.map((oferta) => (
                      <div
                        key={oferta.id}
                        className={`p-4 rounded-lg border ${
                          oferta.status === 'aceita'
                            ? 'bg-green-50 border-green-200'
                            : oferta.status === 'rejeitada'
                            ? 'bg-red-50 border-red-200'
                            : 'bg-yellow-50 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2 rounded-full ${
                              oferta.status === 'aceita'
                                ? 'bg-green-100 text-green-600'
                                : oferta.status === 'rejeitada'
                                ? 'bg-red-100 text-red-600'
                                : 'bg-yellow-100 text-yellow-600'
                            }`}>
                              <DollarSign size={16} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                R$ {oferta.valorFrete.toFixed(2)}
                              </p>
                              <p className="text-sm text-gray-600 flex items-center">
                                <Clock size={14} className="mr-1" />
                                {oferta.prazoEntrega}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              oferta.status === 'aceita'
                                ? 'bg-green-100 text-green-800'
                                : oferta.status === 'rejeitada'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {oferta.status === 'aceita' ? 'Aceita' : 
                               oferta.status === 'rejeitada' ? 'Rejeitada' : 'Pendente'}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(oferta.createdAt).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        {oferta.observacoes && (
                          <p className="text-sm text-gray-600 mt-2 italic">
                            "{oferta.observacoes}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


