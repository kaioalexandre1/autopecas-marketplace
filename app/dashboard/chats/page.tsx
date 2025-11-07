'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
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
  AlertCircle,
  ArrowLeft,
  Phone,
  MapPin,
  ChevronDown,
  Package
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
  const [dadosEntregador, setDadosEntregador] = useState<{
    nomeAutopeca?: string;
    enderecoAutopeca?: string;
    nomeOficina?: string;
    enderecoOficina?: string;
  } | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  const [excluindoChatSuporte, setExcluindoChatSuporte] = useState<string | null>(null);
  const [telefoneOutroUsuario, setTelefoneOutroUsuario] = useState<string | null>(null);
  const [planosAutopecas, setPlanosAutopecas] = useState<{[key: string]: string}>({});
  const [mostrarModalEndereco, setMostrarModalEndereco] = useState(false);
  const [dadosEndereco, setDadosEndereco] = useState<{
    estado?: string;
    cidade: string;
    endereco: string;
    bairro?: string;
    numero?: string;
    complemento?: string;
    cep?: string;
    telefone: string;
  } | null>(null);
  const [mostrarMenuMaisInfo, setMostrarMenuMaisInfo] = useState(false);
  const [criandoPedidoFrete, setCriandoPedidoFrete] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selecaoManualRef = useRef<string | null>(null); // Rastrear seleção manual para evitar sobrescrita

  // Verificar timeout de 24h para confirmações pendentes
  useEffect(() => {
    if (!userData || !chats.length) return;

    const verificarTimeouts = async () => {
      const agora = new Date();
      const chatsPendentes = chats.filter(
        chat => chat.aguardandoConfirmacao && 
        chat.dataSolicitacaoConfirmacao && 
        !chat.confirmadoPor && 
        !chat.negadoPor
      );

      for (const chat of chatsPendentes) {
        if (chat.dataSolicitacaoConfirmacao) {
          const horasPassadas = (agora.getTime() - chat.dataSolicitacaoConfirmacao.getTime()) / (1000 * 60 * 60);
          
          if (horasPassadas >= 24) {
            // Timeout: encerrar chat sem registrar venda
            try {
              const chatRef = doc(db, 'chats', chat.id);
              await updateDoc(chatRef, {
                encerrado: true,
                aguardandoConfirmacao: false,
                negadoPor: 'timeout',
                dataNegacao: Timestamp.now(),
              });
              console.log(`⏰ Timeout de 24h: Chat ${chat.id} encerrado automaticamente`);
            } catch (error) {
              console.error('Erro ao processar timeout:', error);
            }
          }
        }
      }
    };

    verificarTimeouts();
    const interval = setInterval(verificarTimeouts, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [chats, userData]);

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
      let chatsData: Chat[] = [];
      const chatsParaVerificar: string[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const isSuporte = data.isSuporte === true;
        
        chatsData.push({
          id: doc.id,
          pedidoId: data.pedidoId || '',
          oficinaId: data.oficinaId || '',
          autopecaId: data.autopecaId || '',
          oficinaNome: data.oficinaNome || '',
          autopecaNome: data.autopecaNome || '',
          nomePeca: data.nomePeca || '',
          marcaCarro: data.marcaCarro || '',
          modeloCarro: data.modeloCarro || '',
          anoCarro: data.anoCarro || '',
          especificacaoMotor: data.especificacaoMotor || undefined,
          isSuporte: isSuporte,
          motivo: data.motivo,
          motivoLabel: data.motivoLabel,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          encerradoEm: data.encerradoEm?.toDate(),
          ultimaLeituraOficina: data.ultimaLeituraOficina?.toDate(),
          ultimaLeituraAutopeca: data.ultimaLeituraAutopeca?.toDate(),
          mensagens: data.mensagens?.map((m: any) => ({
            ...m,
            createdAt: m.createdAt?.toDate() || new Date(),
          })) || [],
          aguardandoConfirmacao: !!data.aguardandoConfirmacao,
          dataSolicitacaoConfirmacao: data.dataSolicitacaoConfirmacao?.toDate(),
          confirmadoPor: data.confirmadoPor || undefined,
          dataConfirmacao: data.dataConfirmacao?.toDate(),
          negadoPor: data.negadoPor || undefined,
          dataNegacao: data.dataNegacao?.toDate(),
        } as Chat);
        
        // Coletar IDs de chats com pedidoId para verificar se o pedido ainda existe
        // Chats de suporte não têm pedidoId válido, então ignorar
        if (data.pedidoId && !isSuporte && data.pedidoId !== '') {
          chatsParaVerificar.push(doc.id);
        }
      });
      
      // Verificar e excluir chats de suporte expirados (48 horas)
      const chatsSuporteExpirados: string[] = [];
      chatsData.forEach((chat) => {
        if (chat.isSuporte) {
          const criacao = chat.createdAt;
          const agora = new Date();
          const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
          
          if (horasPassadas >= 48) {
            chatsSuporteExpirados.push(chat.id);
          }
        }
      });
      
      // Excluir chats de suporte expirados
      if (chatsSuporteExpirados.length > 0) {
        console.log(`⏰ ${chatsSuporteExpirados.length} chat(s) de suporte expirado(s) - excluindo...`);
        for (const chatId of chatsSuporteExpirados) {
          try {
            await deleteDoc(doc(db, 'chats', chatId));
            console.log(`✅ Chat de suporte ${chatId} excluído (expirado após 48h)`);
          } catch (error) {
            console.error(`❌ Erro ao excluir chat de suporte ${chatId}:`, error);
          }
        }
        // Filtrar chats expirados da lista local
        chatsData = chatsData.filter(c => !chatsSuporteExpirados.includes(c.id));
      }
      
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
              // Verificar se o pedido está expirado, cancelado ou fechado
              const pedidoData = pedidoDoc.data();
              const criacao = pedidoData.createdAt?.toDate() || new Date();
              const agora = new Date();
              const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
              
              // Se o pedido está fechado, remover chats da lista local imediatamente
              if (pedidoData.status === 'fechado') {
                console.log(`⚠️ Pedido ${pedidoId} está fechado - removendo chats da lista local...`);
                // Remover chats deste pedido da lista local imediatamente
                const chatsRemovidos = chatsData.filter(c => c.pedidoId === pedidoId);
                chatsData = chatsData.filter(c => c.pedidoId !== pedidoId);
                console.log(`✅ ${chatsRemovidos.length} chat(s) removido(s) da lista local (pedido fechado)`);
                // Excluir do Firestore também (assíncrono, não bloqueia)
                excluirChatsDoPedido(pedidoId).catch(err => 
                  console.error(`❌ Erro ao excluir chats do pedido ${pedidoId}:`, err)
                );
              } else if (horasPassadas >= 24 || pedidoData.status !== 'ativo') {
                console.log(`⚠️ Pedido ${pedidoId} expirado ou inativo - excluindo chats relacionados...`);
                // Remover da lista local imediatamente
                chatsData = chatsData.filter(c => c.pedidoId !== pedidoId);
                // Excluir do Firestore também
                await excluirChatsDoPedido(pedidoId);
              }
            }
          } catch (error) {
            console.error(`❌ Erro ao verificar pedido ${pedidoId}:`, error);
          }
        }
      }
      
      // Ordenar chats pela última mensagem recebida (estilo WhatsApp)
      // Chats com mensagens mais recentes aparecem primeiro
      chatsData.sort((a, b) => {
        const ultimaMsgA = a.mensagens && a.mensagens.length > 0 
          ? a.mensagens[a.mensagens.length - 1].createdAt 
          : null;
        const ultimaMsgB = b.mensagens && b.mensagens.length > 0 
          ? b.mensagens[b.mensagens.length - 1].createdAt 
          : null;
        
        // Se ambos têm mensagens, ordenar pela última mensagem (mais recente primeiro)
        if (ultimaMsgA && ultimaMsgB) {
          return ultimaMsgB.getTime() - ultimaMsgA.getTime();
        }
        
        // Se apenas um tem mensagens, ele vem primeiro
        if (ultimaMsgA && !ultimaMsgB) {
          return -1;
        }
        if (!ultimaMsgA && ultimaMsgB) {
          return 1;
        }
        
        // Se nenhum tem mensagens, ordenar por updatedAt (mais recente primeiro)
        return b.updatedAt.getTime() - a.updatedAt.getTime();
      });
      
      setChats(chatsData);
      
      // Buscar planos das autopeças para mostrar nas ofertas
      if (userData.tipo === 'oficina') {
        const autopecaIds = new Set(chatsData.map(chat => chat.autopecaId).filter(Boolean));
        const novosPlanos: {[key: string]: string} = {};
        
        const promessasPlanos = Array.from(autopecaIds).map(async (autopecaId) => {
          if (!planosAutopecas[autopecaId]) {
            try {
              const userDoc = await getDoc(doc(db, 'users', autopecaId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                novosPlanos[autopecaId] = userData.plano || 'basico';
              }
            } catch (error) {
              console.error(`Erro ao buscar plano da autopeça ${autopecaId}:`, error);
            }
          }
        });
        
        await Promise.all(promessasPlanos);
        
        if (Object.keys(novosPlanos).length > 0) {
          setPlanosAutopecas(prev => ({ ...prev, ...novosPlanos }));
        }
      }
    });

    return () => unsubscribe();
  }, [userData]);

  // Debug: verificar dados do chat selecionado
  useEffect(() => {
    if (chatSelecionado && userData?.tipo === 'oficina') {
      console.log('🔍 Chat selecionado (oficina):', {
        id: chatSelecionado.id,
        aguardandoConfirmacao: chatSelecionado.aguardandoConfirmacao,
        tipoAguardandoConfirmacao: typeof chatSelecionado.aguardandoConfirmacao,
        confirmadoPor: chatSelecionado.confirmadoPor,
        negadoPor: chatSelecionado.negadoPor,
        encerrado: chatSelecionado.encerrado,
        dataSolicitacaoConfirmacao: chatSelecionado.dataSolicitacaoConfirmacao,
        // Verificar se é exatamente true
        isAguardandoTrue: chatSelecionado.aguardandoConfirmacao === true,
      });
    }
  }, [chatSelecionado, userData]);

  // Atualizar chat selecionado em tempo real quando chats mudarem
  // Mas apenas atualizar dados, NUNCA mudar a seleção manual do usuário
  useEffect(() => {
    // Só atualizar se já houver um chat selecionado (não selecionar automaticamente)
    if (!chatSelecionado || chats.length === 0) {
      return;
    }

    // Se há uma seleção manual recente, não atualizar para evitar sobrescrever
    if (selecaoManualRef.current && selecaoManualRef.current === chatSelecionado.id) {
      // Limpar a flag após um tempo para permitir atualizações futuras
      setTimeout(() => {
        if (selecaoManualRef.current === chatSelecionado.id) {
          selecaoManualRef.current = null;
        }
      }, 1000);
      return;
    }

      const chatAtualizado = chats.find(c => c.id === chatSelecionado.id);
      if (chatAtualizado) {
      // Verificar se há novas mensagens ou se a última mensagem mudou
      // IMPORTANTE: Só atualizar se o ID do chat selecionado for o mesmo (evitar mudanças indesejadas)
      if (chatAtualizado.id === chatSelecionado.id) {
        const ultimaMsgAtual = chatAtualizado.mensagens[chatAtualizado.mensagens.length - 1];
        const ultimaMsgSelecionado = chatSelecionado.mensagens[chatSelecionado.mensagens.length - 1];
        
        // Só atualizar se realmente houver mudanças (mensagens, status ou aguardandoConfirmacao)
        if (chatAtualizado.mensagens.length !== chatSelecionado.mensagens.length ||
            ultimaMsgAtual?.id !== ultimaMsgSelecionado?.id ||
            chatAtualizado.encerrado !== chatSelecionado.encerrado ||
            chatAtualizado.aguardandoConfirmacao !== chatSelecionado.aguardandoConfirmacao ||
            chatAtualizado.confirmadoPor !== chatSelecionado.confirmadoPor ||
            chatAtualizado.negadoPor !== chatSelecionado.negadoPor) {
          console.log('🔄 Atualizando dados do chat selecionado (sem mudar seleção):', {
            chatId: chatSelecionado.id,
            mensagensAntes: chatSelecionado.mensagens.length,
            mensagensDepois: chatAtualizado.mensagens.length,
            aguardandoConfirmacaoAntes: chatSelecionado.aguardandoConfirmacao,
            aguardandoConfirmacaoDepois: chatAtualizado.aguardandoConfirmacao,
          });
          // Atualizar apenas os dados, mantendo a mesma referência de seleção
          setChatSelecionado(chatAtualizado);
        }
        }
      } else {
        // Chat não encontrado, pode ter sido excluído
      console.log('⚠️ Chat selecionado não encontrado mais, limpando seleção');
        setChatSelecionado(null);
      selecaoManualRef.current = null;
      }
  }, [chats]); // Remover chatSelecionado das dependências para evitar loop

  // Buscar telefone do outro usuário quando um chat é selecionado
  useEffect(() => {
    if (!chatSelecionado || !userData) {
      setTelefoneOutroUsuario(null);
      return;
    }

    const buscarTelefone = async () => {
      try {
        const outroUsuarioId = userData.tipo === 'oficina' 
          ? chatSelecionado.autopecaId 
          : chatSelecionado.oficinaId;
        
        const userDoc = await getDoc(doc(db, 'users', outroUsuarioId));
        if (userDoc.exists()) {
          const outroUsuarioData = userDoc.data();
          setTelefoneOutroUsuario(outroUsuarioData.telefone || null);
        }
      } catch (error) {
        console.error('Erro ao buscar telefone do usuário:', error);
        setTelefoneOutroUsuario(null);
      }
    };

    buscarTelefone();
  }, [chatSelecionado, userData]);

  // Função para formatar telefone para o link do WhatsApp (remover caracteres não numéricos)
  const formatarTelefoneParaWhatsApp = (telefone: string) => {
    return telefone.replace(/\D/g, ''); // Remove tudo que não é número
  };

  // Função para abrir WhatsApp
  const abrirWhatsApp = () => {
    if (!telefoneOutroUsuario) {
      toast.error('Telefone não disponível');
      return;
    }

    const telefoneFormatado = formatarTelefoneParaWhatsApp(telefoneOutroUsuario);
    const mensagem = encodeURIComponent('Oi vim pelo grupão das autopeças e gostaria de mais informações');
    const url = `https://api.whatsapp.com/send/?phone=${telefoneFormatado}&text=${mensagem}&type=phone_number&app_absent=0`;
    
    window.open(url, '_blank');
  };

  // Selecionar automaticamente o chat quando vindo da URL
  // IMPORTANTE: Só executar uma vez quando os parâmetros da URL mudarem, não quando chats mudarem
  useEffect(() => {
    const pedidoId = searchParams.get('pedidoId');
    const autopecaId = searchParams.get('autopecaId');

    // Só executar se houver parâmetros na URL (vindo de outra página)
    if (!pedidoId || !autopecaId) {
      return;
    }

    console.log('🔍 Verificando seleção automática de chat (URL):', {
      pedidoId,
      autopecaId,
      totalChats: chats.length,
      chatSelecionado: chatSelecionado?.id
    });

    if (chats.length > 0) {
      const chatEncontrado = chats.find(
        chat => chat.pedidoId === pedidoId && chat.autopecaId === autopecaId
      );
      
      console.log('✅ Chat encontrado:', chatEncontrado?.id);
      
      // Só selecionar se não houver chat selecionado OU se o chat selecionado for diferente
      // E se o chat encontrado for diferente do atual
      if (chatEncontrado && (!chatSelecionado || chatSelecionado.id !== chatEncontrado.id)) {
        console.log('🎯 Selecionando chat automaticamente (URL)');
        setChatSelecionado(chatEncontrado);
        marcarComoLido(chatEncontrado);
      }
    }
  }, [searchParams]); // Remover chats das dependências para evitar seleção automática indesejada

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
    
    // Para autopeça: chat encerrado se ela fechou
    // Para oficina: chat encerrado apenas se não estiver aguardando confirmação
    const chatEncerradoParaUsuario = userData?.tipo === 'autopeca' 
      ? chatSelecionado.encerrado
      : chatSelecionado.encerrado && !chatSelecionado.aguardandoConfirmacao;

    if (chatEncerradoParaUsuario) {
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

  // Função para buscar dados da autopeça e oficina para entregador
  const buscarDadosParaEntregador = async () => {
    if (!chatSelecionado || !userData) return;

    try {
      // Buscar dados da autopeça
      let nomeAutopeca = '';
      let enderecoAutopeca = '';
      
      if (chatSelecionado.autopecaId) {
        const autopecaDoc = await getDoc(doc(db, 'users', chatSelecionado.autopecaId));
        if (autopecaDoc.exists()) {
          const autopecaData = autopecaDoc.data();
          nomeAutopeca = autopecaData.nome || autopecaData.nomeLoja || '';
          const enderecoCompleto = [
            autopecaData.endereco || '',
            autopecaData.numero || '',
            autopecaData.bairro || '',
            autopecaData.cidade || ''
          ].filter(Boolean).join(', ');
          enderecoAutopeca = enderecoCompleto;
        }
      }

      // Buscar dados da oficina
      let nomeOficina = '';
      let enderecoOficina = '';
      
      if (chatSelecionado.oficinaId) {
        const oficinaDoc = await getDoc(doc(db, 'users', chatSelecionado.oficinaId));
        if (oficinaDoc.exists()) {
          const oficinaData = oficinaDoc.data();
          nomeOficina = oficinaData.nome || oficinaData.nomeLoja || '';
          const enderecoCompleto = [
            oficinaData.endereco || '',
            oficinaData.numero || '',
            oficinaData.bairro || '',
            oficinaData.cidade || ''
          ].filter(Boolean).join(', ');
          enderecoOficina = enderecoCompleto;
        }
      }

      setDadosEntregador({
        nomeAutopeca,
        enderecoAutopeca,
        nomeOficina,
        enderecoOficina,
      });
    } catch (error) {
      console.error('Erro ao buscar dados da autopeça e oficina:', error);
      toast.error('Erro ao carregar dados do entregador');
    }
  };

  const criarPedidoFreteAutomatico = async (): Promise<boolean> => {
    if (!chatSelecionado || !userData) return false;

    if (!chatSelecionado.autopecaId || !chatSelecionado.oficinaId) {
      toast.error('Informações da autopeça ou oficina indisponíveis.');
      return false;
    }

    if (chatSelecionado.encerrado) {
      toast.error('Este chat está encerrado. Não é possível chamar um frete automático.');
      return false;
    }

    try {
      setCriandoPedidoFrete(true);

      const pedidosAbertos = await getDocs(
        query(
          collection(db, 'pedidosFrete'),
          where('chatId', '==', chatSelecionado.id),
          where('status', '==', 'aberto')
        )
      );

      if (!pedidosAbertos.empty) {
        toast.error('Já existe um pedido de frete aberto para este chat.');
        setMostrarMenuMaisInfo(false);
        return false;
      }

      const autopecaDoc = await getDoc(doc(db, 'users', chatSelecionado.autopecaId));
      const oficinaDoc = await getDoc(doc(db, 'users', chatSelecionado.oficinaId));

      if (!autopecaDoc.exists() || !oficinaDoc.exists()) {
        toast.error('Não foi possível coletar os dados necessários.');
        return false;
      }

      const autopecaData = autopecaDoc.data();
      const oficinaData = oficinaDoc.data();

      const comporEndereco = (dados: any) =>
        [dados.endereco, dados.numero, dados.bairro, dados.cidade].filter(Boolean).join(', ');

      await addDoc(collection(db, 'pedidosFrete'), {
        chatId: chatSelecionado.id,
        pedidoId: chatSelecionado.pedidoId || '',
        autopecaId: chatSelecionado.autopecaId,
        autopecaNome: autopecaData.nome || autopecaData.nomeLoja || 'Autopeça',
        autopecaTelefone: autopecaData.telefone || autopecaData.whatsapp || '',
        autopecaEndereco: comporEndereco(autopecaData),
        autopecaCidade: autopecaData.cidade || '',
        oficinaId: chatSelecionado.oficinaId,
        oficinaNome: oficinaData.nome || oficinaData.nomeLoja || 'Oficina',
        oficinaTelefone: oficinaData.telefone || oficinaData.whatsapp || '',
        oficinaEndereco: comporEndereco(oficinaData),
        oficinaCidade: oficinaData.cidade || '',
        status: 'aberto',
        criadoEm: Timestamp.now(),
        solicitadoPor: userData.id,
        solicitadoTipo: userData.tipo,
      });

      toast.success('Pedido de frete enviado automaticamente aos entregadores!');
      setMostrarMenuMaisInfo(false);
      return true;
    } catch (error) {
      console.error('Erro ao criar pedido de frete:', error);
      toast.error('Não foi possível criar o pedido de frete. Tente novamente.');
      return false;
    } finally {
      setCriandoPedidoFrete(false);
    }
  };

  // Função para abrir modal de endereço
  const abrirModalEndereco = async () => {
    if (!chatSelecionado || !userData) return;

    try {
      // Determinar qual usuário buscar (o outro participante do chat)
      const outroUsuarioId = userData.tipo === 'oficina' 
        ? chatSelecionado.autopecaId 
        : chatSelecionado.oficinaId;

      const outroUsuarioDoc = await getDoc(doc(db, 'users', outroUsuarioId));
      
      if (outroUsuarioDoc.exists()) {
        const outroUsuarioData = outroUsuarioDoc.data();
        
        // Extrair estado da cidade (formato: "Cidade-ESTADO")
        let estado = undefined;
        let cidadeFormatada = outroUsuarioData.cidade || '';
        if (cidadeFormatada && cidadeFormatada.includes('-')) {
          const partes = cidadeFormatada.split('-');
          if (partes.length >= 2) {
            estado = partes[partes.length - 1].trim();
            cidadeFormatada = partes.slice(0, -1).join('-').trim();
          }
        }
        
        setDadosEndereco({
          estado: estado,
          cidade: cidadeFormatada || outroUsuarioData.cidade || '',
          endereco: outroUsuarioData.endereco || '',
          bairro: outroUsuarioData.bairro,
          numero: outroUsuarioData.numero,
          complemento: outroUsuarioData.complemento,
          cep: outroUsuarioData.cep,
          telefone: outroUsuarioData.telefone || '',
        });
        setMostrarModalEndereco(true);
      } else {
        toast.error('Dados do usuário não encontrados');
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      toast.error('Erro ao carregar informações de endereço');
    }
  };

  // Função para excluir todas as fotos de um pedido do Storage
  const excluirFotosDoPedido = async (pedidoId: string, oficinaId: string) => {
    try {
      // Buscar o pedido para pegar as URLs das fotos
      const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
      
      if (pedidoDoc.exists()) {
        const pedidoData = pedidoDoc.data();
        const fotos = pedidoData.fotos || [];
        
        // Excluir cada foto usando a URL
        const promessasExclusao = fotos.map(async (fotoUrl: string) => {
          try {
            // Extrair o caminho do Storage da URL
            const urlObj = new URL(fotoUrl);
            const pathMatch = urlObj.pathname.match(/\/o\/(.+)\?/);
            
            if (pathMatch) {
              const caminhoDecodificado = decodeURIComponent(pathMatch[1]);
              const storageRef = ref(storage, caminhoDecodificado);
              await deleteObject(storageRef);
              console.log(`✅ Foto excluída: ${caminhoDecodificado}`);
            }
          } catch (fotoError) {
            console.error(`⚠️ Erro ao excluir foto individual:`, fotoError);
          }
        });
        
        await Promise.all(promessasExclusao);
        console.log(`✅ ${fotos.length} foto(s) do pedido ${pedidoId} excluída(s) do Storage`);
      }
    } catch (error) {
      console.error(`❌ Erro ao excluir fotos do pedido ${pedidoId}:`, error);
    }
  };

  const finalizarNegociacao = async () => {
    if (!chatSelecionado || !userData) return;

    try {
      // Se for autopeça, apenas solicita confirmação da oficina
      if (userData.tipo === 'autopeca') {
        const chatRef = doc(db, 'chats', chatSelecionado.id);
        const updateData = {
          aguardandoConfirmacao: true,
          dataSolicitacaoConfirmacao: Timestamp.now(),
          encerrado: true, // Encerrado apenas para a autopeça
          encerradoPor: userData.id,
          encerradoEm: Timestamp.now(),
          updatedAt: Timestamp.now(),
          // Garantir que confirmadoPor e negadoPor estejam undefined (não null)
          confirmadoPor: null,
          negadoPor: null,
        };
        
        console.log('💼 Autopeça fechando negócio - salvando:', updateData);
        await updateDoc(chatRef, updateData);
        console.log('✅ Dados salvos com sucesso! Aguardando confirmação da oficina...');
        
        toast.success('Negócio fechado! Aguardando confirmação da oficina.');
        return;
      }

      // Se for oficina, confirma o negócio (lógica antiga mantida para compatibilidade)
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
      const oficinaId = pedidoData.oficinaId || chatSelecionado.oficinaId;
      
      // Encontrar a oferta da autopeça deste chat
      const oferta = ofertas.find((o: any) => o.autopecaId === chatSelecionado.autopecaId);
      
      if (!oferta || !oferta.preco) {
        toast.error('Oferta não encontrada');
        return;
      }

      const valorFinal = oferta.preco;

      // 0. Excluir fotos do Storage antes de fechar o pedido
      try {
        await excluirFotosDoPedido(chatSelecionado.pedidoId, oficinaId);
      } catch (fotoError) {
        console.error('⚠️ Erro ao excluir fotos do pedido (continuando com fechamento):', fotoError);
        // Não interromper o fechamento se houver erro ao excluir fotos
      }

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
        especificacaoMotor: chatSelecionado.especificacaoMotor || null,
        valorFinal: valorFinal,
        chatId: chatSelecionado.id,
        createdAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'negocios_fechados'), negocioFechado);
      console.log('✅ Negócio fechado registrado! Valor:', valorFinal);

      // 2. Marcar chat como encerrado (verificar se ainda existe antes de atualizar)
      const chatRef = doc(db, 'chats', chatSelecionado.id);
      const chatSnap = await getDoc(chatRef);
      
      if (!chatSnap.exists()) {
        console.warn('⚠️ Chat não encontrado ao tentar encerrar. Pode ter sido deletado.');
        // Mesmo assim, continuar com o fechamento do pedido
      } else {
        try {
      await updateDoc(chatRef, {
        encerrado: true,
        encerradoPor: userData.id,
        encerradoEm: Timestamp.now(),
            aguardandoConfirmacao: false,
            confirmadoPor: userData.id,
            dataConfirmacao: Timestamp.now(),
            updatedAt: Timestamp.now(),
      });
      console.log('✅ Chat marcado como encerrado!');
        } catch (updateError: any) {
          // Se o erro for "document not found", apenas logar e continuar
          if (updateError.code === 'not-found' || updateError.message?.includes('No document to update')) {
            console.warn('⚠️ Chat não encontrado ao atualizar. Pode ter sido deletado durante o processo.');
          } else {
            throw updateError; // Re-lançar outros erros
          }
        }
      }

      // 3. Marcar pedido como fechado
      await updateDoc(pedidoRef, {
        status: 'fechado',
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Pedido marcado como fechado!');

      toast.success(`Negócio fechado: R$ ${valorFinal.toFixed(2)}`);
      
      // Limpar o chat selecionado para que desapareça da lista
      setChatSelecionado(null);
      
      // Redirecionar para a lista de chats para atualizar a visualização
      router.push('/dashboard/chats');
    } catch (error) {
      console.error('❌ Erro ao finalizar negociação:', error);
      toast.error('Erro ao finalizar negociação');
    }
  };

  // Função para confirmar negócio (oficina)
  const confirmarNegocio = async () => {
    if (!chatSelecionado || !userData || userData.tipo !== 'oficina') {
      console.error('❌ Validação falhou:', { chatSelecionado: !!chatSelecionado, userData: !!userData, tipo: userData?.tipo });
      return;
    }

    if (!chatSelecionado.pedidoId) {
      console.error('❌ pedidoId não encontrado no chat');
      toast.error('Erro: Pedido não encontrado no chat');
      return;
    }

    try {
      console.log('✅ Iniciando confirmação de negócio:', {
        chatId: chatSelecionado.id,
        pedidoId: chatSelecionado.pedidoId,
        autopecaId: chatSelecionado.autopecaId,
      });

      // Buscar o pedido para pegar o valor da oferta
      const pedidoRef = doc(db, 'pedidos', chatSelecionado.pedidoId);
      const pedidoSnap = await getDoc(pedidoRef);
      
      if (!pedidoSnap.exists()) {
        console.error('❌ Pedido não existe no Firestore:', chatSelecionado.pedidoId);
        toast.error('Pedido não encontrado');
        return;
      }

      const pedidoData = pedidoSnap.data();
      const ofertas = pedidoData.ofertas || [];
      const oficinaId = pedidoData.oficinaId || chatSelecionado.oficinaId;
      
      console.log('📦 Dados do pedido:', {
        ofertasCount: ofertas.length,
        oficinaId,
        autopecaId: chatSelecionado.autopecaId,
      });
      
      // Encontrar a oferta da autopeça deste chat
      const oferta = ofertas.find((o: any) => o.autopecaId === chatSelecionado.autopecaId);
      
      if (!oferta || !oferta.preco) {
        console.error('❌ Oferta não encontrada:', {
          ofertas: ofertas.map((o: any) => ({ autopecaId: o.autopecaId, preco: o.preco })),
          autopecaIdProcurado: chatSelecionado.autopecaId,
        });
        toast.error('Oferta não encontrada. Verifique se a autopeça fez uma oferta válida.');
        return;
      }

      const valorFinal = oferta.preco;
      console.log('💰 Valor final encontrado:', valorFinal);

      // 0. Excluir fotos do Storage antes de fechar o pedido
      try {
        await excluirFotosDoPedido(chatSelecionado.pedidoId, oficinaId);
      } catch (fotoError) {
        console.error('⚠️ Erro ao excluir fotos do pedido (continuando com fechamento):', fotoError);
      }

      // 1. Criar registro de negócio fechado
      const negocioFechado = {
        pedidoId: chatSelecionado.pedidoId,
        oficinaId: chatSelecionado.oficinaId || oficinaId,
        oficinaNome: chatSelecionado.oficinaNome || userData.nome || 'Oficina',
        autopecaId: chatSelecionado.autopecaId,
        autopecaNome: chatSelecionado.autopecaNome || 'Autopeça',
        nomePeca: chatSelecionado.nomePeca || pedidoData.nomePeca || 'Peça',
        marcaCarro: chatSelecionado.marcaCarro || pedidoData.marcaCarro || '',
        modeloCarro: chatSelecionado.modeloCarro || pedidoData.modeloCarro || '',
        anoCarro: chatSelecionado.anoCarro || pedidoData.anoCarro || '',
        especificacaoMotor: chatSelecionado.especificacaoMotor || pedidoData.especificacaoMotor || '',
        valorFinal: valorFinal,
        chatId: chatSelecionado.id,
        createdAt: Timestamp.now(),
      };

      console.log('📝 Criando negócio fechado:', negocioFechado);
      await addDoc(collection(db, 'negocios_fechados'), negocioFechado);
      console.log('✅ Negócio fechado registrado! Valor:', valorFinal);

      // 2. Marcar chat como encerrado e confirmado
      const chatRef = doc(db, 'chats', chatSelecionado.id);
      await updateDoc(chatRef, {
        encerrado: true,
        encerradoPor: userData.id,
        encerradoEm: Timestamp.now(),
        aguardandoConfirmacao: false,
        confirmadoPor: userData.id,
        dataConfirmacao: Timestamp.now(),
      });
      console.log('✅ Chat confirmado e encerrado!');

      // 3. Marcar pedido como fechado
      await updateDoc(pedidoRef, {
        status: 'fechado',
        updatedAt: Timestamp.now(),
      });
      console.log('✅ Pedido marcado como fechado!');

      toast.success(`Negócio confirmado e fechado: R$ ${valorFinal.toFixed(2)}`);
      
      // Limpar o chat selecionado para que desapareça da lista
      setChatSelecionado(null);
      
      // Redirecionar para a lista de chats para atualizar a visualização
      router.push('/dashboard/chats');
    } catch (error: any) {
      console.error('❌ Erro ao confirmar negócio:', error);
      console.error('❌ Detalhes do erro:', {
        message: error.message,
        code: error.code,
        stack: error.stack,
      });
      toast.error(`Erro ao confirmar negócio: ${error.message || 'Erro desconhecido'}`);
    }
  };

  // Função para negar negócio (oficina)
  const negarNegocio = async () => {
    if (!chatSelecionado || !userData || userData.tipo !== 'oficina') return;

    try {
      // Apenas encerrar o chat sem registrar venda
      const chatRef = doc(db, 'chats', chatSelecionado.id);
      await updateDoc(chatRef, {
        encerrado: true,
        encerradoPor: userData.id,
        encerradoEm: Timestamp.now(),
        aguardandoConfirmacao: false,
        negadoPor: userData.id,
        dataNegacao: Timestamp.now(),
      });
      
      toast.success('Negócio não confirmado. Chat encerrado.');
      setChatSelecionado(null);
    } catch (error) {
      console.error('❌ Erro ao negar negócio:', error);
      toast.error('Erro ao processar');
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
    // Filtrar chats encerrados considerando o tipo de usuário
    const chatsEncerrados = chats.filter(chat => {
      if (chat.isSuporte) return false;
      if (userData?.tipo === 'autopeca') {
        return chat.encerrado === true;
      }
      if (userData?.tipo === 'oficina') {
        return chat.encerrado === true && !chat.aguardandoConfirmacao;
      }
      return false;
    });
    
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

  // Excluir chat de suporte individual  
  const excluirChatSuporte = async (chatId: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.stopPropagation(); // Evitar que o clique selecione o chat
    }
    
    if (!window.confirm('Tem certeza que deseja excluir este chat de suporte? Esta ação não pode ser desfeita.')) {
      return;
    }

    setExcluindoChatSuporte(chatId);
    try {
      await deleteDoc(doc(db, 'chats', chatId));
      toast.success('Chat de suporte excluído com sucesso!');
      
      // Se o chat excluído era o selecionado, limpar seleção
      if (chatSelecionado?.id === chatId) {
        setChatSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao excluir chat de suporte:', error);
      toast.error('Erro ao excluir chat de suporte');
    } finally {
      setExcluindoChatSuporte(null);
    }
  };

  // Excluir todos os chats de suporte
  const excluirTodosChatsSuporte = async () => {
    const chatsSuporte = chats.filter(chat => chat.isSuporte);
    
    if (chatsSuporte.length === 0) {
      toast.error('Não há chats de suporte para excluir');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir TODOS os ${chatsSuporte.length} chat(s) de suporte? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoChatSuporte('todos');
    try {
      const promessas = chatsSuporte.map(chat => deleteDoc(doc(db, 'chats', chat.id)));
      await Promise.all(promessas);
      toast.success(`${chatsSuporte.length} chat(s) de suporte excluído(s) com sucesso!`);
      if (chatSelecionado && chatsSuporte.some(c => c.id === chatSelecionado.id)) {
        setChatSelecionado(null);
      }
    } catch (error) {
      console.error('Erro ao excluir chats de suporte:', error);
      toast.error('Erro ao excluir chats de suporte');
    } finally {
      setExcluindoChatSuporte(null);
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

  const contarMensagensNaoLidas = (chat: Chat): number => {
    if (!userData || chat.mensagens.length === 0) return 0;
    
    const ultimaLeitura = userData.tipo === 'oficina' 
      ? chat.ultimaLeituraOficina 
      : chat.ultimaLeituraAutopeca;
    
    // Se nunca leu, todas as mensagens do outro usuário são não lidas
    if (!ultimaLeitura) {
      return chat.mensagens.filter(msg => msg.remetenteId !== userData.id).length;
    }
    
    // Contar mensagens depois da última leitura que não foram enviadas por mim
    return chat.mensagens.filter(msg => 
      msg.createdAt > ultimaLeitura && msg.remetenteId !== userData.id
    ).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-3 sm:p-6 relative">
      {/* Elementos decorativos de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Círculos grandes desfocados */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-cyan-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-indigo-400 rounded-full opacity-20 blur-3xl"></div>
        
        {/* Raios de luz diagonais */}
        <div className="absolute top-0 left-1/4 w-1 h-full bg-gradient-to-b from-transparent via-cyan-400 to-transparent opacity-20 animate-beam"></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-gradient-to-b from-transparent via-blue-400 to-transparent opacity-30 animate-beam-delayed"></div>
        <div className="absolute top-0 right-1/3 w-1 h-full bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-20 animate-beam-slow"></div>
        
        {/* LEDs pulsantes */}
        <div className="absolute top-20 left-20 w-2 h-2 bg-cyan-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-cyan-400"></div>
        <div className="absolute top-40 right-32 w-2 h-2 bg-yellow-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-yellow-400"></div>
        <div className="absolute bottom-32 left-40 w-2 h-2 bg-blue-400 rounded-full opacity-70 animate-led-pulse shadow-lg shadow-blue-400"></div>
        <div className="absolute bottom-20 right-20 w-2 h-2 bg-green-400 rounded-full opacity-70 animate-led-pulse-delayed shadow-lg shadow-green-400"></div>
        
        {/* Emojis de autopeças e carros flutuantes */}
        <div className="absolute top-10 left-10 text-6xl opacity-40 animate-bounce1 drop-shadow-2xl">🚗</div>
        <div className="absolute top-20 left-1/4 text-5xl opacity-35 animate-bounce2 drop-shadow-2xl">🔧</div>
        <div className="absolute top-16 left-1/2 text-6xl opacity-45 animate-bounce3 drop-shadow-2xl">🛞</div>
        <div className="absolute top-12 right-1/4 text-5xl opacity-40 animate-bounce4 drop-shadow-2xl">⚙️</div>
        <div className="absolute top-24 right-10 text-7xl opacity-35 animate-bounce5 drop-shadow-2xl">🏎️</div>
        <div className="absolute top-40 left-16 text-5xl opacity-50 animate-bounce6 drop-shadow-2xl">🔩</div>
        <div className="absolute top-48 left-1/3 text-6xl opacity-40 animate-bounce7 drop-shadow-2xl">🚙</div>
        <div className="absolute top-44 right-1/3 text-5xl opacity-45 animate-bounce8 drop-shadow-2xl">🔋</div>
        <div className="absolute top-52 right-20 text-6xl opacity-38 animate-bounce9 drop-shadow-2xl">⚡</div>
        <div className="absolute top-1/2 left-8 text-7xl opacity-30 animate-bounce10 drop-shadow-2xl">🛠️</div>
        <div className="absolute top-1/2 left-1/4 text-5xl opacity-42 animate-bounce11 drop-shadow-2xl">🏁</div>
        <div className="absolute top-1/2 left-1/2 text-6xl opacity-35 animate-bounce12 drop-shadow-2xl">🚘</div>
        <div className="absolute top-1/2 right-1/4 text-5xl opacity-48 animate-bounce13 drop-shadow-2xl">🔑</div>
        <div className="absolute top-1/2 right-12 text-6xl opacity-40 animate-bounce14 drop-shadow-2xl">🛡️</div>
        <div className="absolute bottom-48 left-20 text-5xl opacity-45 animate-bounce15 drop-shadow-2xl">🚕</div>
        <div className="absolute bottom-52 left-1/3 text-6xl opacity-38 animate-bounce16 drop-shadow-2xl">⛽</div>
        <div className="absolute bottom-44 right-1/3 text-5xl opacity-42 animate-bounce17 drop-shadow-2xl">🧰</div>
        <div className="absolute bottom-40 right-16 text-6xl opacity-36 animate-bounce18 drop-shadow-2xl">💡</div>
        <div className="absolute bottom-24 left-12 text-6xl opacity-40 animate-bounce19 drop-shadow-2xl">🚓</div>
        <div className="absolute bottom-20 left-1/4 text-5xl opacity-44 animate-bounce20 drop-shadow-2xl">🔌</div>
        <div className="absolute bottom-16 left-1/2 text-7xl opacity-32 animate-bounce21 drop-shadow-2xl">🚗</div>
        <div className="absolute bottom-20 right-1/4 text-5xl opacity-46 animate-bounce22 drop-shadow-2xl">🪛</div>
        <div className="absolute bottom-12 right-10 text-6xl opacity-40 animate-bounce23 drop-shadow-2xl">🚙</div>
        <div className="absolute top-1/3 left-1/6 text-5xl opacity-35 animate-bounce24 drop-shadow-2xl">🏆</div>
        <div className="absolute top-2/3 left-1/5 text-6xl opacity-38 animate-bounce25 drop-shadow-2xl">🔩</div>
        <div className="absolute top-1/4 right-1/6 text-5xl opacity-43 animate-bounce26 drop-shadow-2xl">⚙️</div>
        <div className="absolute bottom-1/3 right-1/5 text-6xl opacity-37 animate-bounce27 drop-shadow-2xl">🛞</div>
        <div className="absolute bottom-2/3 left-1/3 text-5xl opacity-41 animate-bounce28 drop-shadow-2xl">🔧</div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">

        {/* Mobile: Mostrar lista OU chat, não ambos */}
        {/* Desktop: Mostrar ambos lado a lado */}
        <div className={`grid lg:grid-cols-3 gap-3 sm:gap-6 ${chatSelecionado ? 'h-[calc(100vh-80px)] lg:h-[calc(100vh-140px)]' : 'h-[calc(100vh-140px)]'}`}>
          {/* Lista de Chats */}
          <div className={`lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 dark:shadow-[0_0_15px_rgba(59,130,246,0.5)] dark:ring-2 dark:ring-cyan-500/50 ${
            chatSelecionado ? 'hidden lg:block' : 'block'
          }`}>
            <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <div>
                  <h2 className="font-semibold text-white text-base sm:text-lg">Suas Conversas</h2>
                  <p className="text-blue-100 text-xs sm:text-sm mt-0.5 sm:mt-1">{chats.length} conversa{chats.length !== 1 ? 's' : ''}</p>
                </div>
                <div className="flex items-center gap-2">
                  {chats.filter(chat => chat.isSuporte).length > 0 && (
                    <button
                      onClick={excluirTodosChatsSuporte}
                      disabled={excluindoChatSuporte === 'todos'}
                      className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium flex items-center transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
                      title="Excluir todos os chats de suporte"
                    >
                      <Trash2 size={14} className="mr-1" />
                      <span className="hidden sm:inline">Excluir Suporte</span>
                      <span className="sm:hidden">Suporte</span>
                    </button>
                  )}
                  {chats.filter(c => c.encerrado && !c.isSuporte).length > 0 && (
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
            </div>
            
            <div className="overflow-y-auto" style={{ height: 'calc(100% - 90px)' }}>
              {chats.length === 0 ? (
                <div className="p-8 text-center text-gray-900 dark:text-gray-100">
                  <MessageSquare size={56} className="mx-auto mb-4 text-gray-600 dark:text-gray-400" />
                  <p className="font-medium text-gray-900 dark:text-gray-100">Nenhuma conversa ainda</p>
                  <p className="text-sm text-gray-700 mt-2 dark:text-gray-300">
                    {userData?.tipo === 'autopeca' 
                      ? 'Faça uma oferta para iniciar uma conversa'
                      : 'Aguarde ofertas em seus pedidos'}
                  </p>
                </div>
              ) : (
                chats.map((chat) => {
                  const naoLidas = temMensagensNaoLidas(chat);
                  const quantidadeNaoLidas = contarMensagensNaoLidas(chat);
                  
                  return (
                    <div
                      key={chat.id}
                      className={`relative p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-all ${
                        chat.isSuporte 
                          ? chatSelecionado?.id === chat.id
                            ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-l-blue-600 dark:border-l-blue-500'
                            : ((userData?.tipo === 'autopeca' && chat.encerrado) ||
                               (userData?.tipo === 'oficina' && chat.encerrado && !chat.aguardandoConfirmacao))
                            ? 'bg-gray-100 dark:bg-gray-700/50 opacity-70 hover:bg-gray-150 dark:hover:bg-gray-700 border-l-4 border-l-gray-400'
                            : 'bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 border-l-4 border-l-blue-500 dark:border-l-blue-400'
                          : chatSelecionado?.id === chat.id 
                          ? 'bg-green-100 dark:bg-green-900/50 border-l-4 border-l-green-600 dark:border-l-green-500' 
                          : ((userData?.tipo === 'autopeca' && chat.encerrado) ||
                             (userData?.tipo === 'oficina' && chat.encerrado && !chat.aguardandoConfirmacao))
                          ? 'bg-gray-100 dark:bg-gray-700/50 opacity-70 hover:bg-gray-150 dark:hover:bg-gray-700'
                          : 'bg-white dark:bg-gray-800 hover:bg-green-50 dark:hover:bg-green-900/30 border-l-4 border-l-green-500 dark:border-l-green-400'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!excluindoChatSuporte) {
                          console.log('🖱️ Seleção MANUAL do chat:', {
                            chatId: chat.id,
                            nomePeca: chat.nomePeca || 'Suporte',
                            pedidoId: chat.pedidoId,
                            chatSelecionadoAtual: chatSelecionado?.id
                          });
                          // Marcar como seleção manual para evitar sobrescrita pelo useEffect
                          selecaoManualRef.current = chat.id;
                          // Selecionar imediatamente
                          setChatSelecionado(chat);
                          marcarComoLido(chat);
                        }
                      }}
                    >
                      {/* Botão de excluir para chats de suporte */}
                      {chat.isSuporte && (
                        <button
                          onClick={(e) => excluirChatSuporte(chat.id, e)}
                          disabled={excluindoChatSuporte === chat.id}
                          className="absolute top-3 right-3 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed z-10"
                          title="Excluir este chat de suporte"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      {/* Nome da Loja ou Suporte */}
                      <div className="mb-1.5 flex justify-between items-center pr-8">
                        <div className="flex items-center gap-1.5 flex-wrap flex-1 min-w-0">
                          {chat.isSuporte ? (
                            <h3 className="font-bold text-xs text-blue-600 dark:text-blue-400 uppercase flex items-center gap-1">
                              🎧 Suporte
                            </h3>
                          ) : (
                            <h3 className="font-bold text-xs text-gray-900 dark:text-gray-100 uppercase">
                            {userData?.tipo === 'oficina' ? chat.autopecaNome : chat.oficinaNome}
                          </h3>
                          )}
                          {/* Plano da autopeça com coroinha (apenas para oficinas) */}
                          {userData?.tipo === 'oficina' && (() => {
                            const plano = planosAutopecas[chat.autopecaId] || 'basico';
                            const cores: {[key: string]: string} = {
                              basico: 'text-gray-600 dark:text-gray-400',
                              premium: 'text-blue-600 dark:text-blue-400',
                              gold: 'text-yellow-600 dark:text-yellow-500',
                              platinum: 'text-purple-600 dark:text-purple-400'
                            };
                            const emojis: {[key: string]: string} = {
                              basico: '',
                              premium: '💎',
                              gold: '🏆',
                              platinum: '👑'
                            };
                            const nomesPlanos: {[key: string]: string} = {
                              basico: '',
                              premium: 'Silver',
                              gold: 'Gold',
                              platinum: 'Platinum'
                            };
                            if (plano !== 'basico') {
                              return (
                                <span className={`font-bold ${cores[plano]} text-xs sm:text-sm flex items-center gap-1`}>
                                  {emojis[plano]} {nomesPlanos[plano]}
                            </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                        {chat.mensagens.length > 0 && (
                            <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            {formatDistanceToNow(
                              chat.mensagens[chat.mensagens.length - 1].createdAt,
                              { addSuffix: true, locale: ptBR }
                            )}
                          </span>
                        )}
                          {/* Círculo verde estilo WhatsApp com número de mensagens não lidas */}
                          {naoLidas && quantidadeNaoLidas > 0 && (
                            <div className="flex-shrink-0">
                              <div className="bg-green-500 rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                <span className="text-white text-[10px] font-bold">
                                  {quantidadeNaoLidas > 99 ? '99+' : quantidadeNaoLidas}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Linha neon separadora (verde para chats normais, azul para suporte) */}
                      {chat.isSuporte ? (
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent mb-1.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                      ) : (
                        <div className="h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent mb-1.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                      )}

                      {/* Informações do Pedido (ocultar para chats de suporte) */}
                      {!chat.isSuporte && (
                        <div className="mb-1.5">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-xs text-gray-900 dark:text-gray-100 uppercase">
                              {chat.nomePeca}
                            </span>
                            {/* Para autopeça: mostrar encerrado se ela fechou
                                Para oficina: mostrar encerrado apenas se não estiver aguardando confirmação */}
                            {((userData?.tipo === 'autopeca' && chat.encerrado) ||
                              (userData?.tipo === 'oficina' && chat.encerrado && !chat.aguardandoConfirmacao)) && (
                              <span className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded text-[10px] font-semibold">
                            Encerrado
                          </span>
                        )}
                            {chat.aguardandoConfirmacao && userData?.tipo === 'oficina' && (
                              <span className="px-1 py-0.5 bg-blue-200 dark:bg-blue-600 text-blue-700 dark:text-blue-200 rounded text-[10px] font-semibold">
                                Aguardando Confirmação
                              </span>
                            )}
                      </div>
                          <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase">
                        {chat.marcaCarro} {chat.modeloCarro} {chat.anoCarro}
                      </p>
                        </div>
                      )}
                      
                      {/* Linha neon separadora antes da última mensagem */}
                      {chat.mensagens.length > 0 && (
                        chat.isSuporte ? (
                          <div className="h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent my-1.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                        ) : (
                          <div className="h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent my-1.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                        )
                      )}

                      {/* Última Mensagem */}
                      {chat.mensagens.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate italic">
                              {chat.mensagens[chat.mensagens.length - 1].texto || '📷 Imagem'}
                            </p>
                          </div>
                      )}
                      
                      {/* Badge de mensagens não lidas */}
                      {naoLidas && quantidadeNaoLidas > 0 && (
                        <div className="mt-1">
                          <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                            {quantidadeNaoLidas === 1 ? '1 nova mensagem' : `${quantidadeNaoLidas} novas mensagens`}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Área do Chat */}
          <div className={`lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-xl flex flex-col border-2 border-gray-200 dark:border-gray-700 dark:shadow-[0_0_15px_rgba(59,130,246,0.5)] dark:ring-2 dark:ring-cyan-500/50 overflow-hidden ${
            chatSelecionado ? 'block' : 'hidden lg:block'
          }`}>
            {chatSelecionado ? (
              <>
                {/* Header do Chat */}
                <div className="p-3 sm:p-5 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-indigo-600 flex-shrink-0">
                  <div className="flex items-start gap-2 sm:gap-0">
                    {/* Botão Voltar - Apenas no Mobile */}
                    <button
                      onClick={() => setChatSelecionado(null)}
                      className="lg:hidden p-2 hover:bg-blue-700 rounded-lg transition-colors flex-shrink-0 mt-1"
                      title="Voltar para conversas"
                    >
                      <ArrowLeft size={20} className="text-white" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                        <div className="flex-1 min-w-0">
                          {/* Nome da Loja ou Suporte */}
                          <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                            {chatSelecionado.isSuporte ? (
                              <h2 className="font-black text-xs sm:text-sm text-blue-200 truncate uppercase flex items-center gap-1">
                                🎧 Suporte
                              </h2>
                            ) : (
                              <h2 className="font-black text-xs sm:text-sm text-white truncate uppercase">
                            {userData?.tipo === 'oficina' 
                              ? chatSelecionado.autopecaNome 
                              : chatSelecionado.oficinaNome}
                          </h2>
                            )}
                            {/* Plano da autopeça com coroinha (apenas para oficinas e chats normais) */}
                            {userData?.tipo === 'oficina' && !chatSelecionado.isSuporte && (() => {
                              const plano = planosAutopecas[chatSelecionado.autopecaId] || 'basico';
                              const cores: {[key: string]: string} = {
                                basico: 'text-blue-100',
                                premium: 'text-blue-200',
                                gold: 'text-yellow-200',
                                platinum: 'text-yellow-300'
                              };
                              const emojis: {[key: string]: string} = {
                                basico: '',
                                premium: '💎',
                                gold: '🏆',
                                platinum: '👑'
                              };
                              const nomesPlanos: {[key: string]: string} = {
                                basico: '',
                                premium: 'Silver',
                                gold: 'Gold',
                                platinum: 'Platinum'
                              };
                              if (plano !== 'basico') {
                                return (
                                  <span className={`font-bold ${cores[plano]} text-sm sm:text-base md:text-lg flex items-center gap-1 whitespace-nowrap`}>
                                    {emojis[plano]} {nomesPlanos[plano]}
                                  </span>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          
                          {/* Linha neon separadora (verde para chats normais, azul para suporte) */}
                          {chatSelecionado.isSuporte ? (
                            <div className="h-[1px] bg-gradient-to-r from-transparent via-blue-400 to-transparent mb-1.5 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
                          ) : (
                            <div className="h-[1px] bg-gradient-to-r from-transparent via-green-400 to-transparent mb-1.5 shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
                          )}
                          
                          {/* Informações do Pedido (ocultar para chats de suporte) */}
                          {!chatSelecionado.isSuporte && (
                            <div>
                              <p className="text-blue-100 text-xs font-bold truncate uppercase">
                                {chatSelecionado.nomePeca}
                              </p>
                              <p className="text-blue-200 text-xs font-semibold truncate mt-0.5 uppercase">
                            {chatSelecionado.marcaCarro} {chatSelecionado.modeloCarro} {chatSelecionado.anoCarro}
                          </p>
                            </div>
                          )}
                          {/* Motivo do Suporte (apenas para chats de suporte) */}
                          {chatSelecionado.isSuporte && chatSelecionado.motivoLabel && (
                            <div>
                              <p className="text-blue-200 text-xs font-semibold truncate mt-0.5">
                                {chatSelecionado.motivoLabel}
                              </p>
                            </div>
                          )}
                        </div>
                        
                        {/* Botão "Mais Informações" - Desktop e Mobile */}
                        {!chatSelecionado.isSuporte && (
                        <div className="relative w-full sm:w-auto">
                          <button
                            onClick={() => setMostrarMenuMaisInfo(!mostrarMenuMaisInfo)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center justify-center transition-all shadow-lg hover:shadow-xl text-sm whitespace-nowrap"
                            title="Mais informações"
                          >
                            <span className="mr-2">Mais informações</span>
                            <ChevronDown size={18} className={`transition-transform ${mostrarMenuMaisInfo ? 'rotate-180' : ''}`} />
                          </button>

                          {/* Menu Dropdown */}
                          {mostrarMenuMaisInfo && (
                            <>
                              <div 
                                className="fixed inset-0 z-10" 
                                onClick={() => setMostrarMenuMaisInfo(false)}
                              />
                              <div className="absolute top-full left-0 right-0 sm:right-auto sm:min-w-[200px] mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                {/* Botão Endereço da loja */}
                                <button
                                  onClick={() => {
                                    abrirModalEndereco();
                                    setMostrarMenuMaisInfo(false);
                                  }}
                                  className="w-full px-4 py-3 bg-blue-500 text-white hover:bg-blue-600 font-medium flex items-center transition-all text-sm"
                                >
                                  <MapPin size={18} className="mr-2" />
                                  <span>Endereço da loja</span>
                                </button>

                          {telefoneOutroUsuario && (
                            <button
                                    onClick={() => {
                                      abrirWhatsApp();
                                      setMostrarMenuMaisInfo(false);
                                    }}
                                    className="w-full px-4 py-3 bg-green-500 text-white hover:bg-green-600 font-medium flex items-center transition-all text-sm"
                            >
                                    <Phone size={18} className="mr-2" />
                              <span>WhatsApp</span>
                            </button>
                          )}
                          
                          <button
                                  onClick={async () => {
                                    if (chatSelecionado) {
                                      await buscarDadosParaEntregador();
                                    }
                                    setMostrarEntregadores(true);
                                    setMostrarMenuMaisInfo(false);
                                  }}
                                  className="w-full px-4 py-3 bg-yellow-500 text-white hover:bg-yellow-600 font-medium flex items-center transition-all text-sm"
                          >
                                  <Truck size={18} className="mr-2" />
                                  <span>Entregador</span>
                          </button>
                          
                                {(userData?.tipo === 'autopeca' || userData?.tipo === 'oficina') && (
                            <button
                                    onClick={async () => {
                                      await criarPedidoFreteAutomatico();
                                    }}
                                    disabled={criandoPedidoFrete}
                                    className="w-full px-4 py-3 bg-purple-500 text-white hover:bg-purple-600 font-medium flex items-center transition-all text-sm disabled:opacity-60"
                            >
                                    <Package size={18} className="mr-2" />
                                    <span>{criandoPedidoFrete ? 'Gerando pedido...' : 'Chamar frete automaticamente'}</span>
                            </button>
                          )}
                          
                                {!chatSelecionado.encerrado && !chatSelecionado.aguardandoConfirmacao && (
                          <button
                                    onClick={() => {
                                      finalizarNegociacao();
                                      setMostrarMenuMaisInfo(false);
                                    }}
                                    className="w-full px-4 py-3 bg-green-500 text-white hover:bg-green-600 font-medium flex items-center transition-all text-sm"
                                  >
                                    <CheckCircle size={18} className="mr-2" />
                                    <span>Negócio Fechado</span>
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => {
                                    excluirChat();
                                    setMostrarMenuMaisInfo(false);
                                  }}
                            disabled={excluindo}
                                  className="w-full px-4 py-3 bg-red-500 text-white hover:bg-red-600 font-medium flex items-center transition-all disabled:opacity-50 text-sm"
                          >
                                  <XCircle size={18} className="mr-2" />
                                  <span>Cancelar</span>
                          </button>
                        </div>
                            </>
                          )}
                        </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mensagens */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-900" style={{ maxHeight: 'calc(100vh - 320px)', minHeight: 0 }}>
                  {/* Card de confirmação para oficina */}
                  {(() => {
                    const condicao1 = chatSelecionado && userData?.tipo === 'oficina';
                    // Usar !! para garantir que seja tratado como booleano
                    const condicao2 = !!chatSelecionado?.aguardandoConfirmacao;
                    const condicao3 = !chatSelecionado?.confirmadoPor;
                    const condicao4 = !chatSelecionado?.negadoPor;
                    const deveMostrar = condicao1 && condicao2 && condicao3 && condicao4;
                    
                    if (userData?.tipo === 'oficina' && chatSelecionado) {
                      console.log('🔍 Verificando card de confirmação:', {
                        condicao1,
                        condicao2,
                        condicao3,
                        condicao4,
                        deveMostrar,
                        aguardandoConfirmacao: chatSelecionado.aguardandoConfirmacao,
                        tipoAguardandoConfirmacao: typeof chatSelecionado.aguardandoConfirmacao,
                        confirmadoPor: chatSelecionado.confirmadoPor,
                        negadoPor: chatSelecionado.negadoPor,
                        encerrado: chatSelecionado.encerrado,
                      });
                    }
                    
                    return deveMostrar;
                  })() && (
                    <div className="bg-blue-50 dark:bg-blue-950/50 border-2 border-blue-400 dark:border-blue-500 rounded-xl p-6 mb-4 shadow-lg">
                      <div className="flex items-start mb-4">
                        <AlertCircle className="text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0" size={28} />
                        <div className="flex-1">
                          <p className="font-bold text-lg text-blue-900 dark:text-blue-100 mb-2">
                            Confirmação de Negócio
                          </p>
                          <p className="text-base text-blue-800 dark:text-blue-200">
                            A <span className="font-bold">{chatSelecionado.autopecaNome}</span> informou que vocês fecharam negócio. Confirma?
                          </p>
                          {chatSelecionado.dataSolicitacaoConfirmacao && (
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-2">
                              Solicitado há {formatDistanceToNow(chatSelecionado.dataSolicitacaoConfirmacao, { addSuffix: true, locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={confirmarNegocio}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                        >
                          <CheckCircle size={20} className="mr-2" />
                          Sim, Negócio Fechado
                        </button>
                        <button
                          onClick={negarNegocio}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-md hover:shadow-lg flex items-center justify-center"
                        >
                          <XCircle size={20} className="mr-2" />
                          Não
                        </button>
                      </div>
                    </div>
                  )}

                  {chatSelecionado.encerrado && !chatSelecionado.aguardandoConfirmacao && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/50 border-l-4 border-yellow-400 dark:border-yellow-500 p-4 mb-4 rounded-r-lg">
                      <div className="flex items-center">
                        <AlertCircle className="text-yellow-600 dark:text-yellow-400 mr-3" size={24} />
                        <div>
                          <p className="font-medium text-yellow-800 dark:text-yellow-200">Chat Encerrado</p>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            Esta negociação foi finalizada em{' '}
                            {chatSelecionado.encerradoEm && 
                              formatDistanceToNow(chatSelecionado.encerradoEm, { addSuffix: true, locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {chatSelecionado.mensagens.length === 0 ? (
                    <div className="text-center text-gray-900 dark:text-gray-100 py-12">
                      <MessageSquare size={64} className="mx-auto mb-4 text-gray-600 dark:text-gray-300" />
                      <p className="text-lg font-medium text-gray-900 dark:text-gray-100">Nenhuma mensagem ainda</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">Envie a primeira mensagem para iniciar a conversa!</p>
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
                                : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
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
                                isMinha ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'
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
                <div className="p-3 sm:p-5 border-t border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
                  {/* Para autopeça: mostrar como encerrado se ela fechou
                      Para oficina: mostrar como encerrado apenas se não estiver aguardando confirmação */}
                  {((userData?.tipo === 'autopeca' && chatSelecionado.encerrado) ||
                    (userData?.tipo === 'oficina' && chatSelecionado.encerrado && !chatSelecionado.aguardandoConfirmacao)) ? (
                    <div className="text-center py-4 sm:py-6 text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600">
                      <XCircle size={28} className="mx-auto mb-2 sm:mb-3 text-gray-700 dark:text-gray-300" />
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-base sm:text-lg">Chat Encerrado</p>
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1">Este chat foi finalizado e não aceita mais mensagens.</p>
                    </div>
                  ) : (
                    <>
                      {imagemUpload && (
                        <div className="mb-2 sm:mb-3 flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 p-2 sm:p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                          <span className="text-xs sm:text-sm text-gray-700 dark:text-blue-200 truncate flex items-center">
                            <ImageIcon size={16} className="mr-2 text-blue-600 dark:text-blue-400" />
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
                          className="p-2 sm:p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex-shrink-0"
                          title="Enviar imagem"
                        >
                          <ImageIcon size={20} />
                        </button>
                        
                        <input
                          type="text"
                          value={mensagem}
                          onChange={(e) => setMensagem(e.target.value)}
                          placeholder="Digite sua mensagem..."
                          className="flex-1 px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                        />
                        
                        <button
                          type="submit"
                          disabled={enviando || (!mensagem.trim() && !imagemUpload)}
                          className="p-2 sm:p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          title="Enviar mensagem"
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
              <div className="flex-1 flex items-center justify-center text-gray-900 dark:text-gray-100 p-3 sm:p-4 py-8 sm:py-12">
                <div className="w-full max-w-3xl">
                  <div className="space-y-3">
                    <div className="bg-blue-50 dark:bg-blue-950/40 border-l-4 border-blue-500 dark:border-blue-400 p-3 rounded-r-lg">
                      <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-1.5 text-sm">💬 Sobre os Chats</h3>
                      <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                        Os chats são criados automaticamente quando uma autopeça faz uma oferta em um pedido que você criou, 
                        ou quando você faz uma oferta em um pedido. Use esta área para negociar diretamente com seus parceiros de negócio.
                      </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="bg-green-50 dark:bg-green-950/40 border-l-4 border-green-500 dark:border-green-400 p-3 rounded-r-lg">
                        <h4 className="font-bold text-green-900 dark:text-green-100 mb-1.5 flex items-center gap-2 text-sm">
                          <Phone size={16} />
                          WhatsApp
                        </h4>
                        <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                          Abra uma conversa no WhatsApp com o número cadastrado do outro usuário, já com uma mensagem pré-formatada pronta para enviar.
                        </p>
                      </div>

                      <div className="bg-yellow-50 dark:bg-yellow-950/40 border-l-4 border-yellow-500 dark:border-yellow-400 p-3 rounded-r-lg">
                        <h4 className="font-bold text-yellow-900 dark:text-yellow-100 mb-1.5 flex items-center gap-2 text-sm">
                          <Truck size={16} />
                          Entregador
                        </h4>
                        <p className="text-xs text-yellow-800 dark:text-yellow-200 leading-relaxed">
                          Solicite um entregador para buscar ou entregar a peça. Você pode escolher entre os entregadores disponíveis na sua região.
                        </p>
                      </div>

                      <div className="bg-green-50 dark:bg-green-950/40 border-l-4 border-green-500 dark:border-green-400 p-3 rounded-r-lg">
                        <h4 className="font-bold text-green-900 dark:text-green-100 mb-1.5 flex items-center gap-2 text-sm">
                          <CheckCircle size={16} />
                          Negócio Fechado
                        </h4>
                        <p className="text-xs text-green-800 dark:text-green-200 leading-relaxed">
                          Marque o chat como "Negócio Fechado" quando a negociação for finalizada com sucesso. Isso encerra o chat e registra o negócio.
                        </p>
                      </div>

                      <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 dark:border-red-400 p-3 rounded-r-lg">
                        <h4 className="font-bold text-red-900 dark:text-red-100 mb-1.5 flex items-center gap-2 text-sm">
                          <XCircle size={16} />
                          Cancelar
                        </h4>
                        <p className="text-xs text-red-800 dark:text-red-200 leading-relaxed">
                          Cancele e exclua o chat se a negociação não for adiante. Esta ação não pode ser desfeita.
                        </p>
                      </div>
                    </div>

                    <div className="bg-purple-50 dark:bg-purple-950/40 border-l-4 border-purple-500 dark:border-purple-400 p-3 rounded-r-lg">
                      <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-1.5 text-sm">📋 Dica</h4>
                      <p className="text-xs text-purple-800 dark:text-purple-200 leading-relaxed">
                        Chats encerrados podem ser excluídos usando o botão "Excluir Encerrados" na lista de conversas. 
                        Uma barra verde vertical indica chats ativos, facilitando a identificação das negociações em andamento.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Entregadores */}
      <EntregadoresModal 
        isOpen={mostrarEntregadores}
        onClose={() => {
          setMostrarEntregadores(false);
          setDadosEntregador(null);
        }}
        nomePeca={chatSelecionado?.nomePeca}
        nomeAutopeca={dadosEntregador?.nomeAutopeca}
        enderecoAutopeca={dadosEntregador?.enderecoAutopeca}
        nomeOficina={dadosEntregador?.nomeOficina}
        enderecoOficina={dadosEntregador?.enderecoOficina}
        onCriarPedidoFrete={async () => {
          const sucesso = await criarPedidoFreteAutomatico();
          if (sucesso) {
            setMostrarEntregadores(false);
            setDadosEntregador(null);
          }
        }}
        carregandoPedidoFrete={criandoPedidoFrete}
      />

      {/* Modal - Endereço da Loja/Oficina */}
      {mostrarModalEndereco && dadosEndereco && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setMostrarModalEndereco(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <MapPin className="text-blue-600" />
                Endereço e Contato
              </h2>
              <button
                onClick={() => setMostrarModalEndereco(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              {dadosEndereco.estado && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">Estado</p>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">{dadosEndereco.estado}</p>
                </div>
              )}
              
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider mb-1">Cidade</p>
                <p className="text-base font-bold text-gray-900 dark:text-gray-100">{dadosEndereco.cidade}</p>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">Endereço</p>
                <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  {dadosEndereco.endereco}
                  {dadosEndereco.numero && `, ${dadosEndereco.numero}`}
                  {dadosEndereco.complemento && ` - ${dadosEndereco.complemento}`}
                  {dadosEndereco.bairro && `, ${dadosEndereco.bairro}`}
                  {dadosEndereco.cep && ` - CEP: ${dadosEndereco.cep}`}
                </p>
              </div>
              
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-700">
                <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider mb-1">Telefone</p>
                <a
                  href={`tel:${dadosEndereco.telefone}`}
                  className="text-lg font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-2"
                >
                  <Phone size={18} />
                  {dadosEndereco.telefone}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
