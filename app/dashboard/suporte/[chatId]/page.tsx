'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  collection, 
  doc, 
  getDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, MessageSquare, Headphones } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function SuporteChatPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const params = useParams();
  const chatId = params?.chatId as string;
  
  const [chat, setChat] = useState<any>(null);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !userData) return;

    const chatRef = doc(db, 'suporte_chats', chatId);
    
    // Verificar se o usuário tem acesso a este chat
    getDoc(chatRef).then((docSnap) => {
      if (!docSnap.exists()) {
        toast.error('Chat não encontrado');
        router.push('/dashboard');
        return;
      }

      const data = docSnap.data();
      if (data.usuarioId !== userData.id && userData.role !== 'admin') {
        toast.error('Você não tem acesso a este chat');
        router.push('/dashboard');
        return;
      }
    });

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
  }, [chatId, userData, router]);

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
        remetenteTipo: userData.tipo,
        texto: mensagem.trim(),
        createdAt: Timestamp.now(),
      };

      await updateDoc(chatRef, {
        mensagens: arrayUnion(novaMensagem),
        updatedAt: Timestamp.now(),
        status: userData.role === 'admin' ? 'em_andamento' : 'aberto',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'em_andamento':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'resolvido':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'fechado':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'aberto':
        return 'Aberto';
      case 'em_andamento':
        return 'Em Andamento';
      case 'resolvido':
        return 'Resolvido';
      case 'fechado':
        return 'Fechado';
      default:
        return status;
    }
  };

  if (!chat) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold mb-4"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-xl">
                  <Headphones className="text-blue-600 dark:text-blue-400" size={24} />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    Chat de Suporte
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {chat.motivoLabel}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(chat.status)}`}>
                {getStatusLabel(chat.status)}
              </span>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-300">
              Criado {formatDistanceToNow(chat.createdAt, { addSuffix: true, locale: ptBR })}
            </div>
          </div>
        </div>

        {/* Área de Mensagens */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: 'calc(100vh - 280px)' }}>
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {chat.mensagens.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-12">
                <MessageSquare size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="text-lg font-medium text-gray-700 dark:text-gray-300">Nenhuma mensagem ainda</p>
              </div>
            ) : (
              chat.mensagens.map((msg: any) => {
                const isMinha = msg.remetenteId === userData?.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMinha ? 'justify-end' : 'justify-start'} animate-fadeIn`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-md ${
                        isMinha
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                          : userData?.role === 'admin'
                          ? 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                          : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      {msg.texto && <p className="text-sm leading-relaxed">{msg.texto}</p>}
                      <span className={`text-xs mt-2 block ${
                        isMinha || userData?.role === 'admin'
                          ? 'text-blue-100'
                          : 'text-gray-900 dark:text-gray-300'
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
            <div className="p-3 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
              <form onSubmit={enviarMensagem} className="flex gap-2">
                <input
                  type="text"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite sua mensagem..."
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400"
                />
                <button
                  type="submit"
                  disabled={!mensagem.trim() || enviando}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={20} />
                  Enviar
                </button>
              </form>
            </div>
          )}

          {chat.status === 'fechado' && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <p className="font-semibold">Este chat foi fechado</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

