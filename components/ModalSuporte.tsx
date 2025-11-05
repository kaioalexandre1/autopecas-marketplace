'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, MessageSquare, Send } from 'lucide-react';
import { collection, addDoc, Timestamp, getDocs, query, where, updateDoc, arrayUnion, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

const motivosSuporte = [
  { id: 'problema_pagamento', label: 'Problema com Pagamento', emoji: '💳' },
  { id: 'problema_plano', label: 'Dúvida sobre Planos', emoji: '📦' },
  { id: 'problema_tecnico', label: 'Problema Técnico', emoji: '🔧' },
  { id: 'duvida_funcionalidade', label: 'Dúvida sobre Funcionalidade', emoji: '❓' },
  { id: 'sugestao', label: 'Sugestão', emoji: '💡' },
  { id: 'outro', label: 'Outro', emoji: '📝' },
];

interface ModalSuporteProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function ModalSuporte({ aberto, onFechar }: ModalSuporteProps) {
  const { userData } = useAuth();
  const router = useRouter();
  const [motivoSelecionado, setMotivoSelecionado] = useState<string>('');
  const [mensagemInicial, setMensagemInicial] = useState('');
  const [criandoChat, setCriandoChat] = useState(false);

  const handleAbrirChat = async () => {
    if (!motivoSelecionado || !userData) {
      toast.error('Por favor, selecione um motivo');
      return;
    }

    setCriandoChat(true);
    try {
      const motivo = motivosSuporte.find(m => m.id === motivoSelecionado);
      
      // Verificar se já existe um chat de suporte para este usuário
      const chatsSuporteQuery = query(
        collection(db, 'chats'),
        where('isSuporte', '==', true),
        where(userData.tipo === 'oficina' ? 'oficinaId' : 'autopecaId', '==', userData.id)
      );
      
      const chatsExistentes = await getDocs(chatsSuporteQuery);
      
      let chatSuporteRef;
      
      if (!chatsExistentes.empty) {
        // Usar chat existente
        const chatExistente = chatsExistentes.docs[0];
        chatSuporteRef = { id: chatExistente.id };
        
        // Adicionar nova mensagem ao chat existente
        await updateDoc(doc(db, 'chats', chatExistente.id), {
          mensagens: arrayUnion({
            id: `inicial-${Date.now()}`,
            remetenteId: userData.id,
            remetenteTipo: userData.tipo,
            texto: mensagemInicial || `Olá, preciso de ajuda com: ${motivo?.label || 'Outro'}`,
            createdAt: Timestamp.now(),
          }),
          status: 'aberto', // Reabrir o chat se estava fechado
          updatedAt: Timestamp.now(),
        });
      } else {
        // Criar novo chat de suporte na coleção 'chats'
        chatSuporteRef = await addDoc(collection(db, 'chats'), {
          isSuporte: true,
          pedidoId: '', // Chat de suporte não tem pedido associado (string vazia para compatibilidade)
          oficinaId: userData.tipo === 'oficina' ? userData.id : 'suporte',
          autopecaId: userData.tipo === 'autopeca' ? userData.id : 'suporte',
          oficinaNome: userData.tipo === 'oficina' ? (userData.nome || userData.nomeLoja || 'Usuário') : 'Suporte',
          autopecaNome: userData.tipo === 'autopeca' ? (userData.nome || userData.nomeLoja || 'Usuário') : 'Suporte',
          nomePeca: 'Chat de Suporte',
          marcaCarro: '',
          modeloCarro: '',
          anoCarro: '',
          motivo: motivoSelecionado,
          motivoLabel: motivo?.label || 'Outro',
          status: 'aberto', // Status inicial do chat de suporte
          mensagens: [
            {
              id: `inicial-${Date.now()}`,
              remetenteId: userData.id,
              remetenteTipo: userData.tipo,
              texto: mensagemInicial || `Olá, preciso de ajuda com: ${motivo?.label || 'Outro'}`,
              createdAt: Timestamp.now(),
            }
          ],
          encerrado: false,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }

      toast.success('Chat de suporte aberto!');
      onFechar();
      
      // Redirecionar para a página de chats
      router.push(`/dashboard/chats?chatId=${chatSuporteRef.id}`);
    } catch (error: any) {
      console.error('Erro ao criar chat de suporte:', error);
      toast.error('Erro ao abrir chat de suporte. Tente novamente.');
    } finally {
      setCriandoChat(false);
    }
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-xl">
              <MessageSquare className="text-blue-600 dark:text-blue-400" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Abrir Chat de Suporte</h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Selecione o motivo da sua solicitação</p>
            </div>
          </div>
          <button
            onClick={onFechar}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-6">
          {/* Seleção de Motivo */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Qual o motivo do seu contato? *
            </label>
            <div className="grid grid-cols-1 gap-2">
              {motivosSuporte.map((motivo) => (
                <button
                  key={motivo.id}
                  onClick={() => setMotivoSelecionado(motivo.id)}
                  className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all text-left ${
                    motivoSelecionado === motivo.id
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-500'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 bg-white dark:bg-gray-700'
                  }`}
                >
                  <span className="text-2xl">{motivo.emoji}</span>
                  <span className={`font-medium ${
                    motivoSelecionado === motivo.id
                      ? 'text-blue-900 dark:text-blue-200'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {motivo.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Mensagem Inicial (Opcional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Mensagem Inicial (Opcional)
            </label>
            <textarea
              value={mensagemInicial}
              onChange={(e) => setMensagemInicial(e.target.value)}
              placeholder="Descreva brevemente sua dúvida ou problema..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
            />
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={onFechar}
              className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAbrirChat}
              disabled={!motivoSelecionado || criandoChat}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {criandoChat ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Abrindo...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Abrir Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

