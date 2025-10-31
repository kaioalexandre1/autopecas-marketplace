'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  doc, 
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User } from '@/types';
import { Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChatSuporteAdminProps {
  chatId: string;
  userData: User | null;
}

export default function ChatSuporteAdmin({ chatId, userData }: ChatSuporteAdminProps) {
  const [chat, setChat] = useState<any>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !userData) return;

    const chatRef = doc(db, 'suporte_chats', chatId);
    
    // Listener em tempo real
    const unsubscribe = onSnapshot(chatRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setChat({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          mensagens: data.mensagens?.map((m: any) => ({
            ...m,
            createdAt: m.createdAt?.toDate() || new Date(),
          })) || [],
        });
      }
    });

    return () => unsubscribe();
  }, [chatId, userData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.mensagens]);

  const enviarMensagem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensagem.trim() || !chat || !userData) return;

    setEnviando(true);
    try {
      const chatRef = doc(db, 'suporte_chats', chat.id);
      const novaMensagem = {
        id: `${Date.now()}-${userData.id}`,
        remetenteId: userData.id,
        remetenteTipo: 'admin',
        texto: mensagem.trim(),
        createdAt: Timestamp.now(),
      };

      await updateDoc(chatRef, {
        mensagens: arrayUnion(novaMensagem),
        updatedAt: Timestamp.now(),
        status: 'em_andamento',
      });

      setMensagem('');
      toast.success('Mensagem enviada!');
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setEnviando(false);
    }
  };

  const atualizarStatus = async (novoStatus: string) => {
    if (!chat || !userData) return;
    
    try {
      await updateDoc(doc(db, 'suporte_chats', chat.id), {
        status: novoStatus,
        updatedAt: Timestamp.now(),
      });
      toast.success('Status atualizado!');
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  if (!chat) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header do Chat */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">{chat.usuarioNome}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{chat.motivoLabel}</p>
          </div>
          <select
            value={chat.status}
            onChange={(e) => atualizarStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="aberto">Aberto</option>
            <option value="em_andamento">Em Andamento</option>
            <option value="resolvido">Resolvido</option>
            <option value="fechado">Fechado</option>
          </select>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900">
        {chat.mensagens.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <MessageSquare size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
          </div>
        ) : (
          chat.mensagens.map((msg: any) => {
            const isAdmin = msg.remetenteTipo === 'admin';
            
            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl shadow-sm ${
                    isAdmin
                      ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {msg.texto && <p className="text-sm leading-relaxed">{msg.texto}</p>}
                  <span className={`text-xs mt-1 block ${
                    isAdmin ? 'text-purple-100' : 'text-gray-900 dark:text-gray-300'
                  }`}>
                    {formatDistanceToNow(msg.createdAt, { addSuffix: true, locale: ptBR })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      {chat.status !== 'fechado' && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <form onSubmit={enviarMensagem} className="flex gap-2">
            <input
              type="text"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Digite sua resposta..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 text-sm"
            />
            <button
              type="submit"
              disabled={!mensagem.trim() || enviando}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}

      {chat.status === 'fechado' && (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm font-semibold">Este chat foi fechado</p>
        </div>
      )}
    </div>
  );
}

