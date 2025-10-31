'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc,
  updateDoc,
  doc,
  getDoc,
  Timestamp,
  arrayUnion,
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Chat, Mensagem } from '@/types';
import { excluirChatsDoPedido } from '@/lib/chatUtils';
import { 
  MessageSquare, 
  Send, 
  Image as ImageIcon, 
  X, 
  Truck, 
  CheckCircle, 
  XCircle,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import toast from 'react-hot-toast';
import EntregadoresModal from '@/components/EntregadoresModal';

export default function ChatsPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [chats, setChats] = useState<Chat[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<Chat | null>(null);
  const [mensagem, setMensagem] = useState('');
  const [imagemUpload, setImagemUpload] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mostrarEntregadores, setMostrarEntregadores] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userData) return;

    let q;
    
    if (userData.tipo === 'oficina') {
      q = query(
        collection(db, 'chats'),
        where('oficinaId', '==', userData.id)
      );
    } else if (userData.tipo === 'autopeca') {
      q = query(
        collection(db, 'chats'),
        where('autopecaId', '==', userData.id)
      );
    }

    if (!q) return;

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatsData: Chat[] = [];
      const chatsParaVerificar: string[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        chatsData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          encerradoEm: data.encerradoEm?.toDate(),
          ultimaLeituraOficina: data.ultimaLeituraOficina?.toDate(),
          ultimaLeituraAutopeca: data.ultimaLeituraAutopeca?.toDate(),
          mensagens: data.mensagens?.map((m: any) => ({
            ...m,
            createdAt: m.createdAt?.toDate() || new Date(),
          })) || [],
        } as Chat);
        
        // Coletar IDs de chats com pedidoId para verificar se o pedido ainda existe
        if (data.pedidoId) {
          chatsParaVerificar.push(doc.id);
        }
      });
      
      // Verificar se os pedidos relacionados aos chats ainda existem
      if (chatsParaVerificar.length > 0) {
        const pedidosParaVerificar = new Set(
          chatsData.filter(c => c.pedidoId).map(c => c.pedidoId!)
        );
        
        for (const pedidoId of pedidosParaVerificar) {
          try {
            const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
            if (!pedidoDoc.exists()) {
              // Pedido não existe mais, excluir todos os chats relacionados
              console.log(`⚠️ Pedido ${pedidoId} não encontrado - excluindo chats relacionados...`);
              await excluirChatsDoPedido(pedidoId);
            } else {
              // Verificar se o pedido está expirado ou cancelado
              const pedidoData = pedidoDoc.data();
              const criacao = pedidoData.createdAt?.toDate() || new Date();
              const agora = new Date();
              const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
              
              if (horasPassadas >= 24 || pedidoData.status !== 'ativo') {
                console.log(`⚠️ Pedido ${pedidoId} expirado ou inativo - excluindo chats relacionados...`);
                await excluirChatsDoPedido(pedidoId);
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao verificar pedido ${pedidoId}:`, error);
          }
        }
      }
      
      chatsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      setChats(chatsData);
    });

    return () => unsubscribe();
  }, [userData]);

  // Atualizar chat selecionado em tempo real quando chats mudarem
  useEffect(() => {
    if (chatSelecionado && chats.length > 0) {
      const chatAtualizado = chats.find(c => c.id === chatSelecionado.id);
      if (chatAtualizado) {
        // Sempre atualizar para pegar a versão mais recente do chat
        const ultimaMsgAtual = chatAtualizado.mensagens[chatAtualizado.mensagens.length - 1];
        const ultimaMsgSelecionado = chatSelecionado.mensagens[chatSelecionado.mensagens.length - 1];
        
        // Verificar se há novas mensagens ou se a última mensagem mudou
        if (chatAtualizado.mensagens.length !== chatSelecionado.mensagens.length ||
            ultimaMsgAtual?.id !== ultimaMsgSelecionado?.id) {
          console.log('🔄 Atualizando chat selecionado:', {
            mensagensAntes: chatSelecionado.mensagens.length,
            mensagensDepois: chatAtualizado.mensagens.length
          });
          setChatSelecionado(chatAtualizado);
        }
      }
    }
  }, [chats, chatSelecionado]);

  // Selecionar automaticamente o chat quando vindo da URL
  useEffect(() => {
    const pedidoId = searchParams.get('pedidoId');
    const autopecaId = searchParams.get('autopecaId');

    console.log('🔍 Verificando seleção automática de chat:', {
      pedidoId,
      autopecaId,
      totalChats: chats.length,
      chatSelecionado: chatSelecionado?.id
    });

    if (pedidoId && autopecaId && chats.length > 0) {
      const chatEncontrado = chats.find(
        chat => chat.pedidoId === pedidoId && chat.autopecaId === autopecaId
      );
      
      console.log('✅ Chat encontrado:', chatEncontrado?.id);
      
      if (chatEncontrado && (!chatSelecionado || chatSelecionado.id !== chatEncontrado.id)) {
        console.log('🎯 Selecionando chat automaticamente');
        setChatSelecionado(chatEncontrado);
        marcarComoLido(chatEncontrado);
      }
    }
  }, [chats, searchParams]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatSelecionado?.mensagens]);

  const marcarComoLido = async (chat: Chat) => {
    if (!userData) return;
    
    const chatRef = doc(db, 'chats', chat.id);
    const campo = userData.tipo === 'oficina' ? 'ultimaLeituraOficina' : 'ultimaLeituraAutopeca';
    
    await updateDoc(chatRef, {
      [campo]: Timestamp.now()
    });
  };

  const enviarMensagem = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    console.log('📤 Tentando enviar mensagem:', {
      mensagem: mensagem,
      temImagem: !!imagemUpload,
      chatSelecionado: chatSelecionado?.id,
      userData: userData?.id,
      chatEncerrado: chatSelecionado?.encerrado
    });
    
    if (!mensagem.trim() && !imagemUpload) {
      toast.error('Digite uma mensagem ou anexe uma imagem');
      return;
    }
    
    if (!chatSelecionado) {
      toast.error('Nenhum chat selecionado');
      return;
    }
    
    if (!userData) {
      toast.error('Usuário não autenticado');
      return;
    }
    
    if (chatSelecionado.encerrado) {
      toast.error('Este chat está encerrado');
      return;
    }

    setEnviando(true);
    
    try {
      let imagemUrl: string | undefined;

      if (imagemUpload) {
        console.log('📷 Fazendo upload da imagem...');
        const storageRef = ref(storage, `chats/${chatSelecionado.id}/${Date.now()}-${imagemUpload.name}`);
        await uploadBytes(storageRef, imagemUpload);
        imagemUrl = await getDownloadURL(storageRef);
        console.log('✅ Upload concluído:', imagemUrl);
      }

      // Criar mensagem apenas com campos válidos (evitar undefined)
      const novaMensagem: any = {
        remetenteId: userData.id,
        remetenteTipo: userData.tipo,
        createdAt: new Date(),
      };

      // Adicionar texto apenas se não estiver vazio
      if (mensagem.trim()) {
        novaMensagem.texto = mensagem.trim();
      }

      // Adicionar imagem apenas se houver URL
      if (imagemUrl) {
        novaMensagem.imagemUrl = imagemUrl;
      }

      console.log('💾 Salvando mensagem no Firestore...', novaMensagem);

      const chatRef = doc(db, 'chats', chatSelecionado.id);
      
      // Criar objeto para o Firestore sem valores undefined
      const mensagemFirestore: any = {
        id: `${Date.now()}-${userData.id}`,
        remetenteId: userData.id,
        remetenteTipo: userData.tipo,
        createdAt: Timestamp.now(),
      };

      if (mensagem.trim()) {
        mensagemFirestore.texto = mensagem.trim();
      }

      if (imagemUrl) {
        mensagemFirestore.imagemUrl = imagemUrl;
      }
      
      await updateDoc(chatRef, {
        mensagens: arrayUnion(mensagemFirestore),
        updatedAt: Timestamp.now(),
      });

      console.log('✅ Mensagem enviada com sucesso!');

      setMensagem('');
      setImagemUpload(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast.success('Mensagem enviada!');
    } catch (error: any) {
      console.error('❌ Erro ao enviar mensagem:', error);
      console.error('Detalhes do erro:', {
        code: error?.code,
        message: error?.message,
        stack: error?.stack
      });
      
      let mensagemErro = 'Erro ao enviar mensagem';
      
      if (error?.code === 'permission-denied') {
        mensagemErro = 'Sem permissão para enviar mensagens';
      } else if (error?.code === 'not-found') {
        mensagemErro = 'Chat não encontrado';
      } else if (error?.message) {
        mensagemErro = `Erro: ${error.message}`;
      }
      
      toast.error(mensagemErro);
    } finally {
      setEnviando(false);
    }
  };

  const handleImagemSelecionada = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Imagem muito grande. Máximo 5MB');
        return;
      }

      setImagemUpload(file);
    }
  };

  const finalizarNegociacao = async () => {
    if (!chatSelecionado || !userData) return;

    try {
      console.log('💼 Finalizando negociação:', chatSelecionado);

      // Buscar o pedido para pegar o valor da oferta
      const pedidoRef = doc(db, 'pedidos', chatSelecionado.pedidoId);
      const pedidoSnap = await getDoc(pedidoRef);
      
      if (!pedidoSnap.exists()) {
        toast.error('Pedido não encontrado');
        return;
      }

      const pedidoData = pedidoSnap.data();
      const ofertas = pedidoData.ofertas || [];
      
      // Encontrar a oferta da autopeça deste chat
      const oferta = ofertas.find((o: any) => o.autopecaId === chatSelecionado.autopecaId);
      
      if (!oferta || !oferta.preco) {
        toast.error('Oferta não encontrada');
        return;
      }

      const valorFinal = oferta.preco;

      // 1. Criar registro de negócio fechado
      const negocioFechado = {
        pedidoId: chatSelecionado.pedidoId,
        oficinaId: chatSelecionado.oficinaId,
        oficinaNome: chatSelecionado.oficinaNome,
        autopecaId: chatSelecionado.autopecaId,
        autopecaNome: chatSelecionado.autopecaNome,
        nomePeca: chatSelecionado.nomePeca,
        marcaCarro: chatSelecionado.marcaCarro,
        modeloCarro: chatSelecionado.modeloCarro,
        anoCarro: chatSelecionado.anoCarro,
        valorFinal: valorFinal,
        chatId: chatSelecionado.id,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'negocios_fechados'), negocioFechado);
      console.log('✅ Negócio fechado registrado! Valor:', valorFinal);

      // 2. Marcar chat como encerrado
      const chatRef = doc(db, 'chats', chatSelecionado.id);
      await updateDoc(chatRef, {
        encerrado: true,
        encerradoPor: userData.id,
        encerradoEm: Timestamp.now(),
      });
      console.log('✅ Chat marcado como encerrado!');

      // 3. Marcar pedido como fechado
      await updateDoc(pedidoRef, {
        status: 'fechado',
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Pedido marcado como fechado!');

      toast.success(`Negócio fechado: R$ ${valorFinal.toFixed(2)}`);
      setChatSelecionado(null);
    } catch (error) {
      console.error('❌ Erro ao finalizar negociação:', error);
      toast.error('Erro ao finalizar negociação');
    }
  };

  const excluirChat = async () => {
    if (!chatSelecionado) return;

    const confirmar = window.confirm('Deseja realmente excluir este chat? Esta ação não pode ser desfeita.');
    if (!confirmar) return;

    setExcluindo(true);
    try {
      await deleteDoc(doc(db, 'chats', chatSelecionado.id));
      toast.success('Chat excluído com sucesso!');
      setChatSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir chat:', error);
      toast.error('Erro ao excluir chat');
    } finally {
      setExcluindo(false);
    }
  };

  const excluirChatsEncerrados = async () => {
    const chatsEncerrados = chats.filter(chat => chat.encerrado);
    
    if (chatsEncerrados.length === 0) {
      toast.error('Não há chats encerrados para excluir');
      return;
    }

    const confirmar = window.confirm(
      `Deseja realmente excluir os ${chatsEncerrados.length} chat${chatsEncerrados.length > 1 ? 's' : ''} encerrado${chatsEncerrados.length > 1 ? 's' : ''}? Esta ação não pode ser desfeita!`
    );
    if (!confirmar) return;

    setExcluindo(true);
    try {
      // Filtrar apenas chats que o usuário tem permissão para excluir
      const chatsParaExcluir = chatsEncerrados.filter(chat => 
        userData && (chat.oficinaId === userData.id || chat.autopecaId === userData.id)
      );

      if (chatsParaExcluir.length === 0) {
        toast.error('Você não tem permissão para excluir nenhum chat encerrado');
        setExcluindo(false);
        return;
      }

      console.log(`🗑️ Iniciando exclusão de ${chatsParaExcluir.length} chat(s)...`);
      console.log('📋 Chats a excluir:', chatsParaExcluir.map(c => ({
        id: c.id,
        oficinaId: c.oficinaId,
        autopecaId: c.autopecaId,
        userDataId: userData?.id,
        podeExcluir: c.oficinaId === userData?.id || c.autopecaId === userData?.id
      })));

      // Excluir todos os chats simultaneamente usando Promise.allSettled
      const resultados = await Promise.allSettled(
        chatsParaExcluir.map(async (chat) => {
          console.log(`🗑️ Excluindo chat ${chat.id}...`, {
            oficinaId: chat.oficinaId,
            autopecaId: chat.autopecaId,
            userId: userData?.id
          });
          
          try {
            await deleteDoc(doc(db, 'chats', chat.id));
            console.log(`✅ Chat ${chat.id} excluído com sucesso`);
            return { chatId: chat.id, sucesso: true };
          } catch (error: any) {
            console.error(`❌ Erro ao excluir chat ${chat.id}:`, {
              code: error?.code,
              message: error?.message,
              chat: {
                id: chat.id,
                oficinaId: chat.oficinaId,
                autopecaId: chat.autopecaId
              }
            });
            throw error;
          }
        })
      );

      const sucesso = resultados.filter(r => r.status === 'fulfilled').length;
      const falhas = resultados.filter(r => r.status === 'rejected').length;

      // Log detalhado das falhas
      resultados.forEach((resultado, index) => {
        if (resultado.status === 'rejected') {
          const erro = resultado.reason;
          const chat = chatsParaExcluir[index];
          console.error(`❌ Erro ao excluir chat ${chat.id}:`, {
            erro: erro,
            code: erro?.code,
            message: erro?.message,
            chat: {
              id: chat.id,
              oficinaId: chat.oficinaId,
              autopecaId: chat.autopecaId,
              userId: userData?.id
            }
          });
        }
      });

      if (falhas > 0) {
        toast.error(
          `${sucesso} excluído${sucesso > 1 ? 's' : ''} com sucesso, mas ${falhas} falharam. Verifique o console para detalhes.`,
          { duration: 5000 }
        );
      } else {
        toast.success(`✅ Todos os ${sucesso} chat${sucesso > 1 ? 's' : ''} foram excluído${sucesso > 1 ? 's' : ''} com sucesso!`);
      }

      // Limpar chat selecionado se foi excluído
      if (chatSelecionado?.encerrado && chatsParaExcluir.some(c => c.id === chatSelecionado.id)) {
        setChatSelecionado(null);
      }
    } catch (error: any) {
      console.error('❌ Erro geral ao excluir chats:', error);
      toast.error(`Erro ao excluir os chats: ${error?.message || 'Erro desconhecido'}`);
    } finally {
      setExcluindo(false);
    }
  };

  const temMensagensNaoLidas = (chat: Chat) => {
    if (!userData || chat.mensagens.length === 0) return false;
    
    const ultimaLeitura = userData.tipo === 'oficina' 
      ? chat.ultimaLeituraOficina 
      : chat.ultimaLeituraAutopeca;
    
    if (!ultimaLeitura) return true;
    
    const ultimaMensagem = chat.mensagens[chat.mensagens.length - 1];
    return ultimaMensagem.createdAt > ultimaLeitura && 
           ultimaMensagem.remetenteId !== userData.id;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 sm:mb-8 flex items-center">
          <MessageSquare className="mr-2 sm:mr-3 text-blue-600" size={32} />
          Conversas
        </h1>

        <div className="grid lg:grid-cols-3 gap-3 sm:gap-6" style={{ height: 'calc(100vh - 140px)' }}>
          {/* Lista de Chats */}
          <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-3 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <div>
                  <h2 className="font-semibold text-white text-base sm:text-lg">Suas Conversas</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1">{chats.length} conversa{chats.length !== 1 ? 's' : ''}</p>
                </div>
                {chats.filter(c => c.encerrado).length > 0 && (
                  <button
                    onClick={excluirChatsEncerrados}
                    disabled={excluindo}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                    title="Excluir chats encerrados"
                  >
                    <Trash2 size={14} className="mr-1" />
                    <span className="hidden sm:inline">Excluir Encerrados</span>
                    <span className="sm:hidden">Excluir</span>
                  </button>
                )}
              </div>
            </div>
            
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 72px)' }}>
              {chats.length === 0 ? (
                <div className="p-8 text-center text-gray-900 dark:text-white">
                  <MessageSquare size={56} className="mx-auto mb-4 text-gray-600 dark:text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-white">Nenhuma conversa ainda</p>
                  <p className="text-sm text-gray-900 mt-2 dark:text-gray-200">
                    {userData?.tipo === 'autopeca' 
                      ? 'Faça uma oferta para iniciar uma conversa'
                      : 'Aguarde ofertas em seus pedidos'}
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  const naoLidas = temMensagensNaoLidas(chat);
                  
                  return (
                    <div
                      key={chat.id}
                      onClick={() => {
                        setChatSelecionado(chat);
                        marcarComoLido(chat);
                      }}
                      className={`relative p-4 border-b border-gray-100 cursor-pointer transition-all ${
                        chatSelecionado?.id === chat.id 
                          ? 'bg-green-100 dark:bg-green-900 border-l-4 border-l-green-600 dark:border-l-green-500' 
                          : chat.encerrado
                          ? 'bg-gray-100 dark:bg-gray-700 opacity-70 hover:bg-gray-150 dark:hover:bg-gray-600'
                          : 'bg-white dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/30 border-l-4 border-l-green-500 dark:border-l-green-400'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                            {userData?.tipo === 'oficina' ? chat.autopecaNome : chat.oficinaNome}
                          </h3>
                          {naoLidas && (
                            <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
                          )}
                        </div>
                        {chat.mensagens.length > 0 && (
                          <span className="text-xs text-gray-900 dark:text-gray-300">
                            {formatDistanceToNow(
                              chat.mensagens[chat.mensagens.length - 1].createdAt,
                              { addSuffix: true, locale: ptBR }
                            )}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-white mb-1">
                        <span className="font-medium">{chat.nomePeca}</span>
                        {chat.encerrado && (
                          <span className="ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-white rounded text-xs">
                            Encerrado
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-900 dark:text-gray-300">
                        {chat.marcaCarro} {chat.modeloCarro} {chat.anoCarro}
                      </p>
                      
                      {chat.mensagens.length > 0 && (
                        <p className="text-xs text-gray-900 dark:text-gray-300 truncate mt-1">
                          {chat.mensagens[chat.mensagens.length - 1].texto || '📷 Imagem'}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Área do Chat */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
            {chatSelecionado ? (
              <>
                {/* Header do Chat */}
                <div className="p-3 sm:p-5 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-white text-base sm:text-lg truncate">
                        {userData?.tipo === 'oficina' 
                          ? chatSelecionado.autopecaNome 
                          : chatSelecionado.oficinaNome}
                      </h2>
                      <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1 truncate">{chatSelecionado.nomePeca}</p>
                      <p className="text-blue-200 text-[10px] sm:text-xs truncate">
                        {chatSelecionado.marcaCarro} {chatSelecionado.modeloCarro} {chatSelecionado.anoCarro}
                      </p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => setMostrarEntregadores(true)}
                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium flex items-center transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                        title="Solicitar entregador"
                      >
                        <Truck size={16} className="mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Entregador</span>
                        <span className="sm:hidden">Entreg.</span>
                      </button>
                      
                      {!chatSelecionado.encerrado && (
                        <button
                          onClick={finalizarNegociacao}
                          className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center transition-all shadow-lg hover:shadow-xl text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                          title="Marcar como negócio fechado"
                        >
                          <CheckCircle size={16} className="mr-1 sm:mr-2" />
                          <span className="hidden lg:inline">Negócio Fechado</span>
                          <span className="lg:hidden">Fechado</span>
                        </button>
                      )}
                      
                      <button
                        onClick={excluirChat}
                        disabled={excluindo}
                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-medium flex items-center transition-all shadow-lg hover:shadow-xl disabled:opacity-50 text-xs sm:text-sm flex-1 sm:flex-initial justify-center"
                        title="Cancelar pedido"
                      >
                        <XCircle size={16} className="mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Cancelar</span>
                        <span className="sm:hidden">X</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 0 }}>
                  {chatSelecionado.encerrado && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4 rounded-r-lg">
                      <div className="flex items-center">
                        <AlertCircle className="text-yellow-600 mr-3" size={24} />
                        <div>
                          <p className="font-medium text-yellow-800">Chat Encerrado</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Esta negociação foi finalizada em{' '}
                            {chatSelecionado.encerradoEm && 
                              formatDistanceToNow(chatSelecionado.encerradoEm, { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {chatSelecionado.mensagens.length === 0 ? (
                    <div className="text-center text-gray-900 dark:text-white py-12">
                      <MessageSquare size={64} className="mx-auto mb-4 text-gray-600 dark:text-gray-400" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">Nenhuma mensagem ainda</p>
                      <p className="text-sm text-gray-900 mt-2 dark:text-gray-200">Envie a primeira mensagem para iniciar a conversa!</p>
                    </div>
                  ) : (
                    chatSelecionado.mensagens.map((msg) => {
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
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                            }`}
                          >
                            {msg.imagemUrl && (
                              <img
                                src={msg.imagemUrl}
                                alt="Imagem"
                                className="rounded-xl mb-2 max-w-full cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(msg.imagemUrl, '_blank')}
                              />
                            )}
                            {msg.texto && <p className="text-sm leading-relaxed">{msg.texto}</p>}
                            <span
                              className={`text-xs mt-2 block ${
                                isMinha ? 'text-blue-100' : 'text-gray-900 dark:text-gray-300'
                              }`}
                            >
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
                <div className="p-3 sm:p-5 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
                  {chatSelecionado.encerrado ? (
                    <div className="text-center py-4 sm:py-6 text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                      <XCircle size={28} className="mx-auto mb-2 sm:mb-3 text-gray-700 dark:text-gray-300" />
                      <p className="font-semibold text-gray-900 dark:text-white text-base sm:text-lg">Chat Encerrado</p>
                      <p className="text-xs sm:text-sm text-gray-900 mt-1 dark:text-gray-200">Este chat foi finalizado e não aceita mais mensagens.</p>
                    </div>
                  ) : (
                    <>
                      {imagemUpload && (
                        <div className="mb-2 sm:mb-3 flex items-center justify-between bg-blue-50 p-2 sm:p-3 rounded-lg border border-blue-200">
                          <span className="text-xs sm:text-sm text-gray-700 truncate flex items-center">
                            <ImageIcon size={16} className="mr-2 text-blue-600" />
                            <span className="font-medium">{imagemUpload.name}</span>
                          </span>
                          <button
                            onClick={() => {
                              setImagemUpload(null);
                              if (fileInputRef.current) {
                                fileInputRef.current.value = '';
                              }
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}
                      
                      <form onSubmit={enviarMensagem} className="flex items-center space-x-2 sm:space-x-3">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleImagemSelecionada}
                          accept="image/*"
                          className="hidden"
                        />
                        
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 sm:p-3 text-blue-600 hover:bg-blue-50 rounded-lg sm:rounded-xl transition-colors border border-gray-300 flex-shrink-0"
                          title="Enviar imagem"
                        >
                          <ImageIcon size={20} />
                        </button>

                        <input
                          type="text"
                          value={mensagem}
                          onChange={(e) => setMensagem(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 px-3 sm:px-5 py-2.5 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm sm:text-base"
                        />

                        <button
                          type="submit"
                          disabled={enviando || (!mensagem.trim() && !imagemUpload)}
                          className="p-2 sm:p-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl flex-shrink-0"
                        >
                          {enviando ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          ) : (
                            <Send size={20} />
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-900 dark:text-white">
                <div className="text-center">
                  <MessageSquare size={80} className="mx-auto mb-6 text-gray-600 dark:text-gray-400" />
                  <p className="text-xl font-medium text-gray-900 dark:text-white">Selecione uma conversa</p>
                  <p className="text-sm text-gray-900 dark:text-gray-300 mt-2">Escolha um chat na lista para começar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Entregadores */}
      <EntregadoresModal 
        isOpen={mostrarEntregadores}
        onClose={() => setMostrarEntregadores(false)}
        nomePeca={chatSelecionado?.nomePeca}
      />
    </div>
  );
}
