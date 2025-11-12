'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, getDocs, query, Timestamp, doc, updateDoc, setDoc, getDoc, onSnapshot, deleteDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { User, NegocioFechado, Pedido, PlanoAssinatura, PRECOS_PLANOS } from '@/types';
import { 
  Users, 
  Store, 
  Wrench, 
  Truck, 
  DollarSign, 
  TrendingUp, 
  ShoppingCart,
  CheckCircle,
  Calendar,
  ArrowLeft,
  Shield,
  Lock,
  Unlock,
  Crown,
  Ban,
  Headphones,
  MessageSquare,
  Trash2,
  BadgeCheck,
  UserCheck,
  UserX
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { startOfDay, startOfWeek, startOfMonth, isAfter, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import ChatSuporteAdmin from '@/components/ChatSuporteAdmin';

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  
  // Estados para dados
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [negocios, setNegocios] = useState<NegocioFechado[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [usuarioVerificando, setUsuarioVerificando] = useState<string | null>(null);
  const [usuarioBloqueando, setUsuarioBloqueando] = useState<string | null>(null);
  const [usuarioExcluindo, setUsuarioExcluindo] = useState<string | null>(null);
  
  // Estados para filtros
  const [periodoSelecionado, setPeriodoSelecionado] = useState<'hoje' | 'semana' | 'mes'>('hoje');
  const [tipoUsuarioFiltro, setTipoUsuarioFiltro] = useState<'todos' | 'oficina' | 'autopeca' | 'entregador'>('todos');
  const [statusVerificacaoFiltro, setStatusVerificacaoFiltro] = useState<'todos' | 'verificado' | 'nao-verificado'>('todos');
  
  // Estados para configuração do Mercado Pago
  const [mostrarConfigMP, setMostrarConfigMP] = useState(false);
  const [mpAccessToken, setMpAccessToken] = useState('');
  const [mpPublicKey, setMpPublicKey] = useState('');
  const [salvandoMP, setSalvandoMP] = useState(false);

  // Estados para suporte
  const [mostrarSuporte, setMostrarSuporte] = useState(false);
  const [chatsSuporte, setChatsSuporte] = useState<any[]>([]);
  const [chatSelecionado, setChatSelecionado] = useState<any>(null);
  const [excluindoChat, setExcluindoChat] = useState<string | null>(null);

  // Verificar se é admin
  useEffect(() => {
    if (!authLoading && userData) {
      if (userData.role !== 'admin') {
        toast.error('Acesso negado! Apenas administradores podem acessar esta página.');
        router.push('/dashboard');
      }
    } else if (!authLoading && !userData) {
      router.push('/login');
    }
  }, [userData, authLoading, router]);

  // Carregar todos os dados
  useEffect(() => {
    if (userData?.role === 'admin') {
      carregarDados();
      carregarConfigMP();
      carregarChatsSuporte();
    }
  }, [userData]);

  // Carregar chats de suporte (com listener em tempo real quando modal estiver aberto)
  useEffect(() => {
    if (!mostrarSuporte || userData?.role !== 'admin') return;

    // Buscar chats de suporte da coleção 'chats' onde isSuporte === true
    const suporteQuery = query(
      collection(db, 'chats'),
      where('isSuporte', '==', true)
    );
    
    const unsubscribe = onSnapshot(suporteQuery, async (snapshot) => {
      const chatsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // Verificar e excluir chats de suporte expirados (48 horas)
      const chatsSuporteExpirados: string[] = [];
      for (const chat of chatsData) {
        const criacao = chat.createdAt;
        const agora = new Date();
        const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
        
        if (horasPassadas >= 48) {
          chatsSuporteExpirados.push(chat.id);
        }
      }
      
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
      }
      
      // Filtrar chats expirados da lista
      const chatsFiltrados = chatsData.filter(c => !chatsSuporteExpirados.includes(c.id));
      setChatsSuporte(chatsFiltrados);
      
      // Se não há chat selecionado e há chats, selecionar o primeiro
      setChatSelecionado((prev: any) => {
        if (!prev && chatsFiltrados.length > 0) {
          return chatsFiltrados[0];
        }
        // Se o chat selecionado foi atualizado, atualizar o estado
        if (prev) {
          const chatAtualizado = chatsFiltrados.find(c => c.id === prev.id);
          if (chatAtualizado) {
            return chatAtualizado;
          }
          // Se o chat selecionado foi excluído, limpar seleção
          if (chatsSuporteExpirados.includes(prev.id)) {
            return null;
          }
        }
        return prev;
      });
    });

    return () => unsubscribe();
  }, [mostrarSuporte, userData]);

  const carregarChatsSuporte = async () => {
    try {
      // Buscar chats de suporte da coleção 'chats' onde isSuporte === true
      const suporteSnapshot = await getDocs(query(
        collection(db, 'chats'),
        where('isSuporte', '==', true)
      ));
      const chatsData = suporteSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
        };
      }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      
      // Verificar e excluir chats de suporte expirados (48 horas)
      const chatsSuporteExpirados: string[] = [];
      for (const chat of chatsData) {
        const criacao = chat.createdAt;
        const agora = new Date();
        const horasPassadas = (agora.getTime() - criacao.getTime()) / (1000 * 60 * 60);
        
        if (horasPassadas >= 48) {
          chatsSuporteExpirados.push(chat.id);
        }
      }
      
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
      }
      
      // Filtrar chats expirados da lista
      const chatsFiltrados = chatsData.filter(c => !chatsSuporteExpirados.includes(c.id));
      setChatsSuporte(chatsFiltrados);
      
      // Se não há chat selecionado e há chats, selecionar o primeiro
      if (!chatSelecionado && chatsFiltrados.length > 0) {
        setChatSelecionado(chatsFiltrados[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar chats de suporte:', error);
    }
  };

  // Excluir chat de suporte individual
  const excluirChatSuporte = async (chatId: string, e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.stopPropagation(); // Evitar que o clique selecione o chat
    }
    
    const chat = chatsSuporte.find(c => c.id === chatId);
    const nomeUsuario = chat?.oficinaNome || chat?.autopecaNome || 'este chat';
    
    if (!window.confirm(`Tem certeza que deseja excluir o chat de suporte de ${nomeUsuario}? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoChat(chatId);
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
      setExcluindoChat(null);
    }
  };

  // Excluir todos os chats de suporte
  const excluirTodosChatsSuporte = async () => {
    if (chatsSuporte.length === 0) {
      toast.error('Não há chats de suporte para excluir');
      return;
    }

    if (!window.confirm(`Tem certeza que deseja excluir TODOS os ${chatsSuporte.length} chat(s) de suporte? Esta ação não pode ser desfeita.`)) {
      return;
    }

    setExcluindoChat('todos');
    try {
      const promessas = chatsSuporte.map(chat => deleteDoc(doc(db, 'chats', chat.id)));
      await Promise.all(promessas);
      toast.success(`${chatsSuporte.length} chat(s) de suporte excluído(s) com sucesso!`);
      setChatSelecionado(null);
    } catch (error) {
      console.error('Erro ao excluir chats de suporte:', error);
      toast.error('Erro ao excluir chats de suporte');
    } finally {
      setExcluindoChat(null);
    }
  };

  // Carregar configuração do Mercado Pago
  const carregarConfigMP = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'configuracoes', 'mercadopago'));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setMpAccessToken(data.accessToken || '');
        setMpPublicKey(data.publicKey || '');
      }
    } catch (error) {
      console.error('Erro ao carregar config MP:', error);
    }
  };

  // Salvar configuração do Mercado Pago
  const salvarConfigMP = async () => {
    if (!mpAccessToken.trim() || !mpPublicKey.trim()) {
      toast.error('Preencha todos os campos do Mercado Pago');
      return;
    }

    setSalvandoMP(true);
    try {
      await setDoc(doc(db, 'configuracoes', 'mercadopago'), {
        accessToken: mpAccessToken.trim(),
        publicKey: mpPublicKey.trim(),
        updatedAt: Timestamp.now(),
        updatedBy: userData?.id,
      });
      
      toast.success('Configuração do Mercado Pago salva com sucesso!');
      setMostrarConfigMP(false);
    } catch (error) {
      console.error('Erro ao salvar config MP:', error);
      toast.error('Erro ao salvar configuração');
    } finally {
      setSalvandoMP(false);
    }
  };

  // Alterar plano de uma autopeça (admin pode fazer upgrade ou downgrade)
  const alterarPlanoAutopeca = async (autopecaId: string, novoPlano: PlanoAssinatura) => {
    try {
      const autopeca = usuarios.find(u => u.id === autopecaId);
      const planoAtual = autopeca?.plano || 'basico';
      
      // Verificar se é downgrade
      const ordemPlanos: Record<PlanoAssinatura, number> = {
        basico: 0,
        premium: 1,
        gold: 2,
        platinum: 3,
      };
      
      const isDowngrade = ordemPlanos[novoPlano] < ordemPlanos[planoAtual as PlanoAssinatura];
      
      const planoNome = {
        basico: 'Básico (Grátis)',
        premium: 'Premium',
        gold: 'Gold',
        platinum: 'Platinum'
      }[novoPlano];
      
      const planoAtualNome = {
        basico: 'Básico (Grátis)',
        premium: 'Premium',
        gold: 'Gold',
        platinum: 'Platinum'
      }[planoAtual as PlanoAssinatura];

      let mensagemConfirmacao = `Confirmar alteração do plano?\n\n`;
      mensagemConfirmacao += `Plano Atual: ${planoAtualNome}\n`;
      mensagemConfirmacao += `Novo Plano: ${planoNome}\n\n`;
      
      if (isDowngrade) {
        mensagemConfirmacao += `⚠️ ATENÇÃO: Você está fazendo um DOWNGRADE (redução) de plano.\n`;
        mensagemConfirmacao += `O usuário perderá benefícios do plano superior.\n\n`;
      }
      
      mensagemConfirmacao += `Como administrador, você tem permissão para fazer esta alteração.`;
      
      const confirmar = window.confirm(mensagemConfirmacao);
      if (!confirmar) return;

      const agora = new Date();
      const dataFim = new Date(agora);
      dataFim.setMonth(dataFim.getMonth() + 1);
      const mesAtual = new Date().toISOString().slice(0, 7);

      await updateDoc(doc(db, 'users', autopecaId), {
        plano: novoPlano,
        assinaturaAtiva: true,
        ofertasUsadas: 0,
        mesReferenciaOfertas: mesAtual,
        dataProximoPagamento: novoPlano === 'basico' ? null : Timestamp.fromDate(dataFim),
      });

      toast.success(`Plano alterado para ${planoNome}${isDowngrade ? ' (Downgrade realizado)' : ''}!`);
      carregarDados();
    } catch (error) {
      console.error('Erro ao alterar plano:', error);
      toast.error('Não foi possível alterar o plano');
    }
  };

  const carregarDados = async () => {
    console.log('🔄 Iniciando carregamento de dados...');
    try {
      setCarregando(true);

      // Carregar usuários
      console.log('📊 Carregando usuários...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`✅ ${usersSnapshot.docs.length} usuários encontrados`);
      const usersData: User[] = usersSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
        } as User;
      });
      setUsuarios(usersData);
      console.log('✅ Usuários carregados:', usersData.length);

      // Carregar negócios fechados
      console.log('💰 Carregando negócios fechados...');
      const negociosSnapshot = await getDocs(collection(db, 'negocios_fechados'));
      console.log(`✅ ${negociosSnapshot.docs.length} negócios encontrados`);
      const negociosData: NegocioFechado[] = negociosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          valorFinal: data.valorFinal || 0,
        } as NegocioFechado;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setNegocios(negociosData);
      console.log('✅ Negócios carregados:', negociosData.length);

      // Carregar pedidos
      console.log('📦 Carregando pedidos...');
      const pedidosSnapshot = await getDocs(collection(db, 'pedidos'));
      console.log(`✅ ${pedidosSnapshot.docs.length} pedidos encontrados`);
      const pedidosData: Pedido[] = pedidosSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
        } as Pedido;
      }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPedidos(pedidosData);
      console.log('✅ Pedidos carregados:', pedidosData.length);

      console.log('🎉 Todos os dados carregados com sucesso!');
      setCarregando(false);
    } catch (error: any) {
      console.error('❌ Erro ao carregar dados:', error);
      console.error('Detalhes do erro:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      toast.error(`Erro ao carregar dados: ${error.message || 'Erro desconhecido'}`);
      setCarregando(false);
    }
  };

  const atualizarUsuarioLocal = (id: string, dados: Partial<User>) => {
    setUsuarios((prev) => prev.map((usuario) => (usuario.id === id ? { ...usuario, ...dados } : usuario)));
  };

  const handleToggleVerificacao = async (usuario: User) => {
    const novoValor = !(usuario.verificado || usuario.dadosConfirmados);
    const confirmacao = novoValor
      ? window.confirm(`Confirmar os dados de ${usuario.nome} e aplicar o selo verificado?`)
      : window.confirm(`Remover o selo de verificado de ${usuario.nome}?`);

    if (!confirmacao) return;

    setUsuarioVerificando(usuario.id);

    try {
      await updateDoc(doc(db, 'users', usuario.id), {
        dadosConfirmados: novoValor,
        verificado: novoValor,
        verificadoEm: novoValor ? Timestamp.now() : null,
        verificadoPor: novoValor ? userData?.id || null : null,
      });

      atualizarUsuarioLocal(usuario.id, {
        dadosConfirmados: novoValor,
        verificado: novoValor,
        verificadoEm: novoValor ? new Date() : undefined,
        verificadoPor: novoValor ? userData?.id : undefined,
      });

      toast.success(novoValor ? `${usuario.nome} agora está verificado!` : `Selo removido de ${usuario.nome}.`);
    } catch (error: any) {
      console.error('Erro ao atualizar verificação do usuário:', error);
      toast.error('Não foi possível atualizar a verificação. Tente novamente.');
    } finally {
      setUsuarioVerificando(null);
    }
  };

  const handleToggleBloqueio = async (usuario: User) => {
    const novoValor = !usuario.contaBloqueada;
    const confirmacao = window.confirm(
      `Deseja ${novoValor ? 'bloquear' : 'desbloquear'} a conta de ${usuario.nome}?`
    );

    if (!confirmacao) return;

    setUsuarioBloqueando(usuario.id);

    try {
      await updateDoc(doc(db, 'users', usuario.id), {
        contaBloqueada: novoValor,
        bloqueadoEm: novoValor ? Timestamp.now() : null,
        bloqueadoPor: novoValor ? userData?.id || null : null,
      });

      atualizarUsuarioLocal(usuario.id, {
        contaBloqueada: novoValor,
        bloqueadoEm: novoValor ? new Date() : undefined,
        bloqueadoPor: novoValor ? userData?.id : undefined,
      });

      toast.success(
        novoValor
          ? `${usuario.nome} foi bloqueado e não poderá acessar a plataforma.`
          : `${usuario.nome} foi desbloqueado.`
      );
    } catch (error: any) {
      console.error('Erro ao atualizar bloqueio do usuário:', error);
      toast.error('Não foi possível atualizar o bloqueio. Tente novamente.');
    } finally {
      setUsuarioBloqueando(null);
    }
  };

  const handleRemoverUsuario = async (usuario: User) => {
    if (usuario.id === userData?.id) {
      toast.error('Você não pode remover o seu próprio cadastro.');
      return;
    }

    const confirmacao = window.confirm(
      `Tem certeza que deseja REMOVER o cadastro de ${usuario.nome}? Esta ação é permanente.`
    );

    if (!confirmacao) return;

    setUsuarioExcluindo(usuario.id);

    try {
      await deleteDoc(doc(db, 'users', usuario.id));
      setUsuarios((prev) => prev.filter((item) => item.id !== usuario.id));
      toast.success(`${usuario.nome} foi removido da plataforma.`);
    } catch (error: any) {
      console.error('Erro ao remover usuário:', error);
      toast.error('Não foi possível remover o usuário. Tente novamente.');
    } finally {
      setUsuarioExcluindo(null);
    }
  };
 
  // Filtrar negócios por período
  const negociosFiltrados = negocios.filter(negocio => {
    const hoje = startOfDay(new Date());
    const inicioSemana = startOfWeek(new Date(), { locale: ptBR });
    const inicioMes = startOfMonth(new Date());

    const dataNegocio = negocio.createdAt;

    if (periodoSelecionado === 'hoje') {
      return isAfter(dataNegocio, hoje);
    } else if (periodoSelecionado === 'semana') {
      return isAfter(dataNegocio, inicioSemana);
    } else if (periodoSelecionado === 'mes') {
      return isAfter(dataNegocio, inicioMes);
    }
    return true;
  });

  // Filtrar usuários por tipo
  const usuariosFiltrados = usuarios.filter((usuario) => {
    const correspondeTipo =
      tipoUsuarioFiltro === 'todos' || usuario.tipo === tipoUsuarioFiltro;

    const verificado = Boolean(usuario.verificado || usuario.dadosConfirmados);

    const correspondeVerificacao =
      statusVerificacaoFiltro === 'todos' ||
      (statusVerificacaoFiltro === 'verificado' && verificado) ||
      (statusVerificacaoFiltro === 'nao-verificado' && !verificado);

    return correspondeTipo && correspondeVerificacao;
  });

  // Estatísticas gerais
  const totalOficinas = usuarios.filter(u => u.tipo === 'oficina').length;
  const totalAutopecas = usuarios.filter(u => u.tipo === 'autopeca').length;
  const totalEntregadores = usuarios.filter(u => u.tipo === 'entregador').length;
  const totalPedidosAtivos = pedidos.filter(p => p.status === 'ativo').length;
  const totalNegociosFechados = negociosFiltrados.length;
  const faturamentoTotal = negociosFiltrados.reduce((acc, n) => acc + (n.valorFinal || 0), 0);

  // Faturamento por autopeça
  const faturamentoPorAutopeca = negociosFiltrados.reduce((acc, negocio) => {
    if (!acc[negocio.autopecaNome]) {
      acc[negocio.autopecaNome] = {
        nome: negocio.autopecaNome,
        id: negocio.autopecaId,
        total: 0,
        quantidade: 0
      };
    }
    acc[negocio.autopecaNome].total += negocio.valorFinal || 0;
    acc[negocio.autopecaNome].quantidade += 1;
    return acc;
  }, {} as Record<string, { nome: string; id: string; total: number; quantidade: number }>);

  const rankingAutopecas = Object.values(faturamentoPorAutopeca).sort((a, b) => b.total - a.total);

  // Early returns
  if (authLoading || carregando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Carregando dados administrativos...</p>
        </div>
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-6">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <ArrowLeft size={20} />
              Voltar ao Dashboard
            </Link>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={() => {
                  setMostrarSuporte(true);
                  carregarChatsSuporte();
                }}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-2xl transition-all font-black text-sm"
              >
                <Headphones size={24} />
                PEDIDOS DE SUPORTE
                {chatsSuporte.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {chatsSuporte.filter(c => c.status === 'aberto' || c.status === 'em_andamento').length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setMostrarConfigMP(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:shadow-2xl transition-all font-black text-sm animate-pulse hover:animate-none"
              >
                <DollarSign size={24} />
                💳 CONFIGURAR MERCADO PAGO
              </button>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-4 py-2 rounded-full shadow-lg">
                <Shield size={20} />
                <span className="font-black uppercase text-sm">Administrador</span>
              </div>
            </div>
          </div>
          <h1 className="text-4xl font-black text-blue-900 mb-2">
            🛡️ Painel Administrativo
          </h1>
          <p className="text-gray-600 text-lg">Visão completa do sistema - {userData.nome}</p>
        </div>

        {/* Cards de Estatísticas Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Oficinas */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Oficinas</p>
                <p className="text-3xl font-black text-gray-900">{totalOficinas}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Wrench className="text-orange-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Autopeças */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Autopeças</p>
                <p className="text-3xl font-black text-gray-900">{totalAutopecas}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Store className="text-blue-600" size={28} />
              </div>
            </div>
          </div>

          {/* Total Entregadores */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Entregadores</p>
                <p className="text-3xl font-black text-gray-900">{totalEntregadores}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Truck className="text-green-600" size={28} />
              </div>
            </div>
          </div>

          {/* Pedidos Ativos */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-semibold uppercase">Pedidos Ativos</p>
                <p className="text-3xl font-black text-gray-900">{totalPedidosAtivos}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <ShoppingCart className="text-purple-600" size={28} />
              </div>
            </div>
          </div>
        </div>

        {/* Seção de Negócios Fechados */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-green-600" size={28} />
              Negócios Fechados
            </h2>
            
            {/* Seletor de Período */}
            <div className="flex gap-2">
              {(['hoje', 'semana', 'mes'] as const).map((periodo) => (
                <button
                  key={periodo}
                  onClick={() => setPeriodoSelecionado(periodo)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all ${
                    periodoSelecionado === periodo
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {periodo === 'hoje' ? 'Hoje' : periodo === 'semana' ? 'Esta Semana' : 'Este Mês'}
                </button>
              ))}
            </div>
          </div>

          {/* Cards de Estatísticas de Negócios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold uppercase">Faturamento Total</p>
                  <p className="text-4xl font-black">R$ {faturamentoTotal.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <DollarSign size={32} />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold uppercase">Total de Vendas</p>
                  <p className="text-4xl font-black">{totalNegociosFechados}</p>
                </div>
                <div className="bg-white bg-opacity-20 p-3 rounded-full">
                  <CheckCircle size={32} />
                </div>
              </div>
            </div>
          </div>

          {/* Ranking de Autopeças */}
          <div className="mb-6">
            <h3 className="text-xl font-black text-gray-900 mb-4">🏆 Ranking de Autopeças por Faturamento</h3>
            <div className="space-y-3">
              {rankingAutopecas.slice(0, 5).map((autopeca, index) => (
                <div 
                  key={autopeca.id}
                  className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-l-4 border-blue-500"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}º
                    </div>
                    <div>
                      <p className="font-black text-gray-900">{autopeca.nome}</p>
                      <p className="text-sm text-gray-600">{autopeca.quantidade} venda{autopeca.quantidade > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-green-600">R$ {autopeca.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Lista de Usuários */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
              <Users className="text-blue-600" size={28} />
              Usuários Cadastrados
            </h2>
            
            {/* Filtro de Tipo de Usuário */}
            <div className="flex gap-2">
              {(['todos', 'oficina', 'autopeca', 'entregador'] as const).map((tipo) => (
                <button
                  key={tipo}
                  onClick={() => setTipoUsuarioFiltro(tipo)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-all capitalize ${
                    tipoUsuarioFiltro === tipo
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tipo === 'todos' ? 'Todos' : tipo === 'oficina' ? 'Oficinas' : tipo === 'autopeca' ? 'Autopeças' : 'Entregadores'}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro de Verificação */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(['todos', 'verificado', 'nao-verificado'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusVerificacaoFiltro(status)}
                className={`px-4 py-2 rounded-lg font-semibold transition-all uppercase text-xs sm:text-sm ${
                  statusVerificacaoFiltro === status
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'todos' ? 'Todos' : status === 'verificado' ? 'Verificados' : 'Não verificados'}
              </button>
            ))}
          </div>

          {/* Tabela de Usuários */}
          <div className="overflow-x-auto">
            <div className="max-h-[480px] overflow-y-auto rounded-xl border border-blue-100 shadow-inner">
            <table className="w-full">
              <thead>
                <tr className="bg-blue-50 border-b-2 border-blue-200">
                  <th className="text-left p-4 font-black text-gray-900">Nome</th>
                  <th className="text-left p-4 font-black text-gray-900">Tipo</th>
                  <th className="text-left p-4 font-black text-gray-900">Cidade</th>
                  <th className="text-left p-4 font-black text-gray-900">Telefone</th>
                  <th className="text-left p-4 font-black text-gray-900">Documento</th>
                  <th className="text-left p-4 font-black text-gray-900">Cadastro</th>
                  <th className="text-left p-4 font-black text-gray-900">Status</th>
                  <th className="text-right p-4 font-black text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const verificado = Boolean(usuario.verificado || usuario.dadosConfirmados);

                  return (
                    <tr key={usuario.id} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 flex items-center gap-1">
                            {usuario.nome}
                          </span>
                          {verificado && (
                            <BadgeCheck size={16} className="text-blue-500" title="Usuário verificado" />
                          )}
                          {usuario.role === 'admin' && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-black px-2 py-1 rounded-full">
                              ADMIN
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                          usuario.tipo === 'oficina' ? 'bg-orange-100 text-orange-800' :
                          usuario.tipo === 'autopeca' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {usuario.tipo}
                        </span>
                      </td>
                      <td className="p-4 text-gray-700">{usuario.cidade}</td>
                      <td className="p-4 text-gray-700">{usuario.telefone}</td>
                      <td className="p-4 text-gray-700 font-mono text-sm">{usuario.documento}</td>
                      <td className="p-4 text-gray-600 text-sm">
                        {format(usuario.createdAt, 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {verificado && (
                            <span className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full uppercase">
                              <BadgeCheck size={12} /> Loja verificada
                            </span>
                          )}
                          {usuario.contaBloqueada && (
                            <span className="flex items-center gap-1 bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full uppercase">
                              <Ban size={12} /> Bloqueado
                            </span>
                          )}
                          {!verificado && !usuario.contaBloqueada && (
                            <span className="text-xs text-gray-500 font-medium uppercase">Pendente</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            onClick={() => handleToggleVerificacao(usuario)}
                            disabled={usuarioVerificando === usuario.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                              verificado
                                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                            } ${usuarioVerificando === usuario.id ? 'opacity-70 cursor-wait' : ''}`}
                          >
                            <UserCheck size={14} />
                            {usuarioVerificando === usuario.id
                              ? 'Salvando...'
                              : verificado
                                ? 'Remover selo'
                                : 'Verificar'}
                          </button>

                          <button
                            onClick={() => handleToggleBloqueio(usuario)}
                            disabled={usuarioBloqueando === usuario.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-colors ${
                              usuario.contaBloqueada
                                ? 'bg-green-600 text-white hover:bg-green-700'
                                : 'bg-red-600 text-white hover:bg-red-700'
                            } ${usuarioBloqueando === usuario.id ? 'opacity-70 cursor-wait' : ''}`}
                          >
                            {usuario.contaBloqueada ? <Unlock size={14} /> : <Ban size={14} />}
                            {usuarioBloqueando === usuario.id
                              ? 'Processando...'
                              : usuario.contaBloqueada
                                ? 'Desbloquear'
                                : 'Bloquear'}
                          </button>

                          <button
                            onClick={() => handleRemoverUsuario(usuario)}
                            disabled={usuarioExcluindo === usuario.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors ${
                              usuarioExcluindo === usuario.id ? 'opacity-70 cursor-wait' : ''
                            }`}
                          >
                            <UserX size={14} />
                            {usuarioExcluindo === usuario.id ? 'Removendo...' : 'Remover'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {/* Gerenciamento de Assinaturas (Autopeças) */}
        <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2 mb-6">
            <Crown className="text-yellow-600" size={28} />
            Gerenciamento de Assinaturas
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-yellow-50 border-b-2 border-yellow-200">
                  <th className="text-left p-4 font-black text-gray-900">Autopeça</th>
                  <th className="text-left p-4 font-black text-gray-900">Plano</th>
                  <th className="text-left p-4 font-black text-gray-900">Trocar Plano</th>
                  <th className="text-left p-4 font-black text-gray-900">Ofertas</th>
                  <th className="text-left p-4 font-black text-gray-900">Status</th>
                  <th className="text-center p-4 font-black text-gray-900">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.filter(u => u.tipo === 'autopeca').map((autopeca) => {
                  const planoNome = {
                    basico: 'Básico (Grátis)',
                    premium: 'Premium',
                    gold: 'Gold',
                    platinum: 'Platinum'
                  }[autopeca.plano || 'basico'];

                  return (
                    <tr key={autopeca.id} className="border-b border-gray-100 hover:bg-yellow-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{autopeca.nome}</p>
                          <p className="text-xs text-gray-500">{autopeca.cidade}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          autopeca.plano === 'platinum' ? 'bg-purple-100 text-purple-800' :
                          autopeca.plano === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                          autopeca.plano === 'premium' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {planoNome}
                        </span>
                      </td>
                      <td className="p-4">
                        <select
                          className="px-3 py-2 border-2 border-gray-200 rounded-lg text-sm"
                          value={autopeca.plano || 'basico'}
                          onChange={(e) => alterarPlanoAutopeca(autopeca.id, e.target.value as PlanoAssinatura)}
                        >
                          <option value="basico">Básico (Grátis)</option>
                          <option value="premium">Premium</option>
                          <option value="gold">Gold</option>
                          <option value="platinum">Platinum</option>
                        </select>
                      </td>
                      <td className="p-4">
                        <div className="text-sm">
                          <span className="font-bold">{autopeca.ofertasUsadas || 0}</span>
                          <span className="text-gray-500"> / </span>
                          <span>{autopeca.plano === 'platinum' ? '∞' : 
                            autopeca.plano === 'gold' ? '200' :
                            autopeca.plano === 'premium' ? '100' : '20'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        {autopeca.contaBloqueada ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 flex items-center gap-1 w-fit">
                            <Ban size={14} />
                            BLOQUEADA
                          </span>
                        ) : autopeca.assinaturaAtiva ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                            <CheckCircle size={14} />
                            ATIVA
                          </span>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                            INATIVA
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={async () => {
                              const confirmar = window.confirm(
                                `Deseja ${autopeca.contaBloqueada ? 'desbloquear' : 'bloquear'} a conta de ${autopeca.nome}?`
                              );
                              if (confirmar) {
                                try {
                                  await updateDoc(doc(db, 'users', autopeca.id), {
                                    contaBloqueada: !autopeca.contaBloqueada
                                  });
                                  toast.success(`Conta ${autopeca.contaBloqueada ? 'desbloqueada' : 'bloqueada'} com sucesso!`);
                                  carregarDados();
                                } catch (error) {
                                  toast.error('Erro ao atualizar conta');
                                }
                              }
                            }}
                            className={`px-3 py-1 rounded-lg text-xs font-bold text-white ${
                              autopeca.contaBloqueada ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {autopeca.contaBloqueada ? <Unlock size={14} /> : <Lock size={14} />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal de Configuração do Mercado Pago */}
      {mostrarConfigMP && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <DollarSign size={32} className="text-white" />
                  <h2 className="text-2xl font-black text-white">
                    Configurar Mercado Pago
                  </h2>
                </div>
                <button
                  onClick={() => setMostrarConfigMP(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                >
                  <Ban size={24} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Informações */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 mb-2">ℹ️ Como obter suas credenciais:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Acesse: <a href="https://www.mercadopago.com.br/developers" target="_blank" className="font-bold underline">www.mercadopago.com.br/developers</a></li>
                  <li>Faça login com sua conta do Mercado Pago</li>
                  <li>Vá em "Suas integrações" → "Credenciais"</li>
                  <li>Escolha "Credenciais de produção" para receber pagamentos reais</li>
                  <li>Copie EXATAMENTE como aparecem na tela do Mercado Pago</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <h3 className="font-bold text-yellow-900 mb-2">⚠️ Atenção - Cole EXATAMENTE como aparece:</h3>
                <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                  <li>A <strong>Public Key</strong> pode começar com <code className="bg-yellow-200 px-1 rounded">APP_USR-</code> ou <code className="bg-yellow-200 px-1 rounded">pk_live_</code></li>
                  <li>O <strong>Access Token</strong> (oculto com pontinhos) comece com <code className="bg-yellow-200 px-1 rounded">APP_USR-</code></li>
                  <li>Use credenciais de <strong>PRODUÇÃO</strong> (não teste)</li>
                  <li>Os pagamentos cairão na conta vinculada ao Mercado Pago</li>
                </ul>
              </div>

              {/* Formulário */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    🔑 Public Key (cole EXATAMENTE como aparece no Mercado Pago)
                  </label>
                  <div className="text-xs text-gray-600 mb-2">
                    Pode começar com: <code className="bg-gray-100 px-2 py-1 rounded">APP_USR-</code> ou <code className="bg-gray-100 px-2 py-1 rounded">pk_live_</code>
                  </div>
                  <input
                    type="text"
                    value={mpPublicKey}
                    onChange={(e) => setMpPublicKey(e.target.value)}
                    placeholder="APP_USR-xxxx-xxxx-xxxx-xxxx ou pk_live_xxxxxxxx"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    🔐 Access Token (clique no "olhinho" 👁️ no Mercado Pago para revelar)
                  </label>
                  <div className="text-xs text-gray-600 mb-2">
                    Normalmente começa com: <code className="bg-gray-100 px-2 py-1 rounded">APP_USR-</code> seguido de números e letras
                  </div>
                  <textarea
                    value={mpAccessToken}
                    onChange={(e) => setMpAccessToken(e.target.value)}
                    placeholder="APP_USR-1234567890-012345-xxxxxxxxxx-xxxxxxxx"
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:border-green-500 font-mono text-sm resize-none"
                  />
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3">
                <button
                  onClick={() => setMostrarConfigMP(false)}
                  className="flex-1 py-3 px-6 bg-gray-200 text-gray-800 rounded-xl font-bold hover:bg-gray-300 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarConfigMP}
                  disabled={salvandoMP}
                  className="flex-1 py-3 px-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold hover:shadow-xl transition-all disabled:opacity-50"
                >
                  {salvandoMP ? 'Salvando...' : 'Salvar Configuração'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Suporte */}
      {mostrarSuporte && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[96vh] h-[96vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-500 to-purple-600">
              <div className="flex items-center gap-3">
                <Headphones size={32} className="text-white" />
                <div>
                  <h2 className="text-2xl font-bold text-white">Pedidos de Suporte</h2>
                  <p className="text-purple-100 text-sm">
                    {chatsSuporte.length} chat{chatsSuporte.length !== 1 ? 's' : ''} de suporte
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {chatsSuporte.length > 0 && (
                  <button
                    onClick={excluirTodosChatsSuporte}
                    disabled={excluindoChat === 'todos'}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Excluir todos os chats de suporte"
                  >
                    <Trash2 size={18} />
                    <span className="hidden sm:inline">Excluir Todos</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    setMostrarSuporte(false);
                    setChatSelecionado(null);
                  }}
                  className="text-white hover:bg-white/20 rounded-full p-2"
                >
                  <Ban size={24} />
                </button>
              </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 flex overflow-hidden">
              {/* Lista de Chats */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50 dark:bg-gray-900">
                <div className="p-4 space-y-2">
                  {chatsSuporte.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                      <MessageSquare size={48} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                      <p className="text-sm">Nenhum pedido de suporte</p>
                    </div>
                  ) : (
                    chatsSuporte.map((chat) => (
                      <div
                        key={chat.id}
                        className={`relative w-full p-4 rounded-lg border-2 transition-all ${
                          chatSelecionado?.id === chat.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 bg-white dark:bg-gray-800'
                        }`}
                      >
                        <button
                          onClick={() => setChatSelecionado(chat)}
                          className="w-full text-left pr-10"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                                {chat.usuarioNome || chat.oficinaNome || chat.autopecaNome}
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                                {chat.motivoLabel}
                              </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold ml-2 flex-shrink-0 ${
                              chat.status === 'aberto'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                : chat.status === 'em_andamento'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                : chat.status === 'resolvido'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {chat.status === 'aberto' ? 'Aberto' : 
                               chat.status === 'em_andamento' ? 'Em Andamento' :
                               chat.status === 'resolvido' ? 'Resolvido' : 'Fechado'}
                            </span>
                          </div>
                          {chat.mensagens && chat.mensagens.length > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                              {chat.mensagens[chat.mensagens.length - 1].texto || 'Mensagem'}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {format(chat.updatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </button>
                        <button
                          onClick={(e) => excluirChatSuporte(chat.id, e)}
                          disabled={excluindoChat === chat.id}
                          className="absolute top-4 right-4 p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir este chat de suporte"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Selecionado */}
              <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 overflow-hidden">
                {chatSelecionado ? (
                  <ChatSuporteAdmin chatId={chatSelecionado.id} userData={userData} />
                ) : (
                  <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                      <MessageSquare size={64} className="mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                      <p className="text-lg font-medium">Selecione um chat para visualizar</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

