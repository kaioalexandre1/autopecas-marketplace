'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Entregador } from '@/types';
import { Truck, Phone, X, MessageCircle } from 'lucide-react';
import { formatarPreco, formatarTelefone } from '@/lib/utils';
import toast from 'react-hot-toast';

interface EntregadoresModalProps {
  isOpen: boolean;
  onClose: () => void;
  nomePeca?: string;
  nomeAutopeca?: string;
  enderecoAutopeca?: string;
  nomeOficina?: string;
  enderecoOficina?: string;
}

export default function EntregadoresModal({ 
  isOpen, 
  onClose, 
  nomePeca,
  nomeAutopeca,
  enderecoAutopeca,
  nomeOficina,
  enderecoOficina
}: EntregadoresModalProps) {
  const [entregadores, setEntregadores] = useState<Entregador[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      carregarEntregadores();
    }
  }, [isOpen]);

  const carregarEntregadores = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('tipo', '==', 'entregador')
      );

      const snapshot = await getDocs(q);
      const entregadoresData: Entregador[] = [];
      
        snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.nome || data.nomeLoja) {
          entregadoresData.push({
            id: doc.id,
            nome: data.nome || data.nomeLoja || 'Entregador',
            telefone: data.telefone || '',
            whatsapp: data.whatsapp || data.telefone?.replace(/\D/g, '') || '',
            valorDentroCidade: data.valorFreteDentroCidade || data.valorDentroCidade || 0,
            cidade: data.cidade || 'Maringá-PR',
            ativo: true,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Entregador);
        }
      });

      // Se não houver entregadores cadastrados, usar dados de exemplo
      if (entregadoresData.length === 0) {
        // Dados de exemplo para demonstração
        setEntregadores([
          {
            id: '1',
            nome: 'José Motoboy',
            telefone: '(44) 99999-1111',
            whatsapp: '44999991111',
            valorDentroCidade: 15,
            cidade: 'Maringá-PR',
            ativo: true,
            createdAt: new Date(),
          },
          {
            id: '2',
            nome: 'Carlos Entregas',
            telefone: '(44) 99999-2222',
            whatsapp: '44999992222',
            valorDentroCidade: 12,
            cidade: 'Maringá-PR',
            ativo: true,
            createdAt: new Date(),
          },
          {
            id: '3',
            nome: 'Rápido Delivery',
            telefone: '(44) 99999-3333',
            whatsapp: '44999993333',
            valorDentroCidade: 18,
            cidade: 'Maringá-PR',
            ativo: true,
            createdAt: new Date(),
          },
        ] as any);
      } else {
        setEntregadores(entregadoresData);
      }
    } catch (error) {
      console.error('Erro ao carregar entregadores:', error);
      toast.error('Erro ao carregar entregadores');
    } finally {
      setLoading(false);
    }
  };

  const abrirWhatsApp = (entregador: Entregador) => {
    const whatsapp = entregador.whatsapp || entregador.telefone?.replace(/\D/g, '');
    if (!whatsapp) {
      toast.error('WhatsApp não disponível para este entregador');
      return;
    }

    let mensagem = 'Bom dia, vim pelo grupão das autopeças e quero saber quanto você cobra de um frete';
    
    if (nomeAutopeca && enderecoAutopeca && nomeOficina && enderecoOficina) {
      mensagem += ` saindo de ${nomeAutopeca} - *${enderecoAutopeca}* para ${nomeOficina} - *${enderecoOficina}* e qual prazo de coleta e entrega.`;
    } else {
      mensagem += ' e qual prazo de coleta e entrega.';
    }

    const url = `https://wa.me/55${whatsapp}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
    toast.success('WhatsApp aberto!');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center">
            <Truck className="text-yellow-600 mr-3" size={28} />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Entregadores</h2>
              <p className="text-sm text-gray-600">Maringá-PR • Entregas dentro da cidade</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div>
            </div>
          ) : entregadores.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Truck size={64} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum entregador disponível</p>
              <p className="text-sm mt-2">
                Cadastre-se como entregador ou aguarde novos cadastros
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {entregadores.map((entregador) => (
                <div
                  key={entregador.id}
                  className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 border-2 border-yellow-200 
hover:border-yellow-400 transition-all shadow-md hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mr-3">
                          <Truck className="text-white" size={24} />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">
                            {entregador.nome}
                          </h3>
                          <p className="text-sm text-gray-600 flex items-center">
                            <Phone size={14} className="mr-1" />
                            {formatarTelefone(entregador.telefone)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold text-yellow-700">
                        {formatarPreco(entregador.valorDentroCidade)}
                      </p>
                      <p className="text-xs text-gray-600">Dentro da cidade</p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-yellow-200">
                    <button
                      onClick={() => abrirWhatsApp(entregador)}
                      className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold flex 
items-center justify-center shadow-md hover:shadow-lg transition-all"
                    >
                      <MessageCircle size={20} className="mr-2" />
                      Solicitar no WhatsApp
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 border-t border-blue-200">
          <p className="text-sm text-blue-800">
            <strong>💡 Dica:</strong> Ao clicar no botão, você será direcionado ao WhatsApp do entregador 
            com uma mensagem pré-pronta. Combine os detalhes da entrega diretamente com ele!
          </p>
        </div>
      </div>
    </div>
  );
}