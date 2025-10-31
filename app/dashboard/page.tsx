'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc,
  doc,
  orderBy,
  Timestamp,
  arrayUnion,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Pedido, Oferta, RamoVeiculo } from '@/types';
import { Plus, Search, DollarSign, Car, Radio, MessageCircle, Truck, MapPin, ArrowRight, Filter, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { formatarPreco } from '@/lib/utils';
import toast from 'react-hot-toast';
import OfertasFreteModal from '@/components/OfertasFreteModal';

export default function DashboardPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalOferta, setMostrarModalOferta] = useState(false);
  const [mostrarModalFrete, setMostrarModalFrete] = useState(false);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [enderecos, setEnderecos] = useState<{[key: string]: any}>({});
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [ramoSelecionado, setRamoSelecionado] = useState<RamoVeiculo | 'TODOS'>('TODOS');

  // Banco de emojis de peças de carro
  const emojisAutopecas = ['🔧', '⚙️', '🔩', '⛽', '🛞', '🔋', '💡', '🪛', '🛠️', '🔌'];

  // Função para obter emoji baseado no ID do pedido
  const getEmojiParaPedido = (pedidoId: string): string => {
    // Usar hash simples do ID para escolher emoji consistente
    const hash = pedidoId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return emojisAutopecas[hash % emojisAutopecas.length];
  };

  // Função para calcular horas restantes
  const calcularHorasRestantes = (createdAt: Date | Timestamp): number => {
    const agora = new Date();
    const criacao = createdAt instanceof Date ? createdAt : createdAt.toDate();
    const diferencaMs = agora.getTime() - criacao.getTime();
    const horasPassadas = diferencaMs / (1000 * 60 * 60);
    return Math.max(0, 24 - horasPassadas);
  };

  // Função para obter cor do timer
  const getCorTimer = (horasRestantes: number): string => {
    if (horasRestantes > 10) return 'text-green-600 bg-green-50 border-green-200';
    if (horasRestantes > 3) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  // Função para formatar tempo restante
  const formatarTempoRestante = (horasRestantes: number): string => {
    const horas = Math.floor(horasRestantes);
    const minutos = Math.floor((horasRestantes - horas) * 60);
    return `${horas}h ${minutos}m`;
  };

  // Função para toggle de expansão de pedido
  const toggleExpansaoPedido = (pedidoId: string) => {
    setPedidosExpandidos(prev => 
      prev.includes(pedidoId) 
        ? prev.filter(id => id !== pedidoId)
        : [...prev, pedidoId]
    );
  };

  // Carregar cidades selecionadas do localStorage
  useEffect(() => {
    const cidadesSalvas = localStorage.getItem('cidadesSelecionadas');
    if (cidadesSalvas) {
      setCidadesSelecionadas(JSON.parse(cidadesSalvas));
    } else if (userData?.cidade) {
      setCidadesSelecionadas([userData.cidade]);
    }

    // Carregar ramo selecionado do localStorage ou usar padrão do usuário
    const ramoSalvo = localStorage.getItem('ramoSelecionado') as RamoVeiculo | 'TODOS' | null;
    if (ramoSalvo) {
      setRamoSelecionado(ramoSalvo);
    } else if (userData?.ramo) {
      setRamoSelecionado(userData.ramo);
    }
  }, [userData]);

  // Atualizar timers a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      // Forçar re-render para atualizar os timers
      setPedidos(prev => [...prev]);
    }, 60000); // 60 segundos

    return () => clearInterval(interval);
  }, []);

  // Debug: verificar userData
  console.log('userData no dashboard:', userData);
  console.log('cidades selecionadas:', cidadesSelecionadas);

  // Form states - Novo Pedido
  const [nomePeca, setNomePeca] = useState('');
  const [marcaCarro, setMarcaCarro] = useState('');
  const [modeloCarro, setModeloCarro] = useState('');
  const [anoCarro, setAnoCarro] = useState('');
  const [condicaoPeca, setCondicaoPeca] = useState(''); // Nova ou Usada
  const [especificacaoMotor, setEspecificacaoMotor] = useState('');
  const [notaFiscal, setNotaFiscal] = useState('');
  const [observacao, setObservacao] = useState('');

  // Form state - Nova Oferta
  const [preco, setPreco] = useState('');
  const [observacaoOferta, setObservacaoOferta] = useState('');

  // Filtro de condição da peça
  const [filtroCondicao, setFiltroCondicao] = useState<'todas' | 'Nova' | 'Usada'>('todas');
  const [modoResumido, setModoResumido] = useState(false);
  const [pedidosExpandidos, setPedidosExpandidos] = useState<string[]>([]);
  const [mostrarDropdownFiltros, setMostrarDropdownFiltros] = useState(false);

  useEffect(() => {
    if (cidadesSelecionadas.length === 0) return;

    // Buscar pedidos ativos das cidades selecionadas em tempo real
    const q = query(
      collection(db, 'pedidos'),
      where('status', '==', 'ativo')
      // Removido orderBy e where cidade temporariamente para evitar erro de índice
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
        
        if (horasPassadas >= 24) {
          // Marcar para exclusão
          pedidosExpirados.push(docSnapshot.id);
        } else {
          // Extrair apenas o nome da cidade (sem o sufixo de estado como -PR, -SP)
          const nomeCidade = data.cidade?.split('-')[0]?.trim() || data.cidade;
          
          // Adicionar apenas pedidos válidos das cidades selecionadas
          if (cidadesSelecionadas.includes(nomeCidade)) {
            pedidosData.push({
              id: docSnapshot.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Pedido);
          }
        }
      });

      // Exclusão automática desabilitada para evitar erros de permissão
      // Os pedidos expirados podem ser removidos manualmente pelo admin
      if (pedidosExpirados.length > 0) {
        console.log(`${pedidosExpirados.length} pedido(s) expirado(s) detectado(s) - exclusão manual necessária`);
      }

      // Ordenar: primeiro por número de ofertas (maior primeiro), depois por data
      pedidosData.sort((a, b) => {
        const ofertasA = a.ofertas?.length || 0;
        const ofertasB = b.ofertas?.length || 0;
        
        if (ofertasB !== ofertasA) {
          return ofertasB - ofertasA; // Mais ofertas primeiro
        }
        return b.createdAt.getTime() - a.createdAt.getTime(); // Mais recente primeiro
      });

      setPedidos(pedidosData);
      
      // Buscar endereços para entregadores
      if (userData?.tipo === 'entregador') {
        pedidosData.forEach(pedido => {
          if (pedido.ofertas && pedido.ofertas.length > 0) {
            buscarEnderecos(pedido);
          }
        });
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [cidadesSelecionadas, userData]);

  const criarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) return;

    // Validar campos obrigatórios
    if (!condicaoPeca) {
      toast.error('Por favor, informe se a peça é nova ou usada');
      return;
    }

    try {
      await addDoc(collection(db, 'pedidos'), {
        oficinaId: userData.id,
        oficinaNome: userData.nome,
        ramo: userData.ramo || 'CARRO', // Usar ramo padrão do usuário
        nomePeca,
        marcaCarro,
        modeloCarro,
        anoCarro,
        condicaoPeca, // Campo obrigatório: Nova ou Usada
        ...(especificacaoMotor && { especificacaoMotor }), // Adiciona apenas se preenchido
        ...(notaFiscal && { notaFiscal }), // Adiciona apenas se preenchido
        ...(observacao && { observacao }), // Adiciona apenas se preenchido
        status: 'ativo',
        ofertas: [],
        cidade: cidadesSelecionadas[0] || userData.cidade, // Usar primeira cidade selecionada
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Pedido criado com sucesso!');
      setMostrarModal(false);
      
      // Limpar form
      setNomePeca('');
      setMarcaCarro('');
      setModeloCarro('');
      setAnoCarro('');
      setCondicaoPeca('');
      setEspecificacaoMotor('');
      setNotaFiscal('');
      setObservacao('');
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast.error('Erro ao criar pedido. Tente novamente.');
    }
  };

  const cancelarPedido = async (pedidoId: string) => {
    if (!userData || userData.tipo !== 'oficina') {
      toast.error('Apenas oficinas podem cancelar pedidos');
      return;
    }

    // Verificar se o pedido pertence à oficina
    const pedido = pedidos.find(p => p.id === pedidoId);
    if (pedido && pedido.oficinaId !== userData.id) {
      toast.error('Você só pode cancelar seus próprios pedidos');
      return;
    }

    const confirmacao = window.confirm(
      'Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita.'
    );

    if (!confirmacao) return;

    try {
      console.log('Tentando cancelar pedido:', pedidoId);
      console.log('User ID:', userData.id);
      console.log('Pedido:', pedido);
      
      await deleteDoc(doc(db, 'pedidos', pedidoId));
      toast.success('Pedido cancelado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error);
      console.error('Código do erro:', error.code);
      console.error('Mensagem do erro:', error.message);
      
      if (error.code === 'permission-denied') {
        toast.error('Permissão negada. Verifique as regras do Firebase.');
      } else {
        toast.error('Erro ao cancelar pedido. Tente novamente.');
      }
    }
  };

  const criarOferta = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData || !pedidoSelecionado) {
      console.log('Falta userData ou pedidoSelecionado');
      return;
    }

    // Verificar se é autopeça e se há limite de ofertas
    if (userData.tipo === 'autopeca') {
      // Verificar se a conta está bloqueada
      if (userData.contaBloqueada) {
        toast.error('Sua conta está bloqueada. Entre em contato com o administrador.');
        return;
      }

      // Verificar limite de ofertas
      const mesAtual = new Date().toISOString().slice(0, 7); // "2025-01"
      const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
      
      // Determinar limite do plano
      const limites: Record<string, number> = {
        basico: 20,
        premium: 100,
        gold: 200,
        platinum: -1, // ilimitado
      };
      
      const plano = userData.plano || 'basico';
      const limite = limites[plano];
      
      // Se não for ilimitado, verificar o limite
      if (limite !== -1 && ofertasUsadas >= limite) {
        toast.error(
          `Você atingiu o limite de ${limite} ofertas do plano ${plano}. Faça upgrade para continuar fazendo ofertas!`,
          { duration: 5000 }
        );
        setTimeout(() => {
          router.push('/dashboard/planos');
        }, 2000);
        return;
      }
    }

    const precoNumerico = parseFloat(preco.replace(',', '.'));
    
    if (isNaN(precoNumerico) || precoNumerico <= 0) {
      toast.error('Digite um preço válido');
      return;
    }

    try {
      console.log('Iniciando criação de oferta...');
      
      const novaOferta: Omit<Oferta, 'id'> = {
        pedidoId: pedidoSelecionado.id,
        autopecaId: userData.id,
        autopecaNome: userData.nome,
        preco: precoNumerico,
        observacao: observacaoOferta.trim() || undefined,
        createdAt: new Date(),
      };

      console.log('Nova oferta:', novaOferta);

      const pedidoRef = doc(db, 'pedidos', pedidoSelecionado.id);
      
      // Atualizar com a nova oferta e o menor preço
      const menorPrecoAtual = pedidoSelecionado.menorPreco || Infinity;
      const novoMenorPreco = Math.min(menorPrecoAtual, precoNumerico);

      console.log('Atualizando pedido no Firebase...');
      
      // Preparar dados da oferta para o Firebase (sem undefined)
      const ofertaParaFirebase: any = {
        id: `${Date.now()}-${userData.id}`,
        pedidoId: pedidoSelecionado.id,
        autopecaId: userData.id,
        autopecaNome: userData.nome,
        preco: precoNumerico,
        createdAt: Timestamp.now(),
      };
      
      // Adicionar observação apenas se existir
      if (observacaoOferta.trim()) {
        ofertaParaFirebase.observacao = observacaoOferta.trim();
      }
      
      await updateDoc(pedidoRef, {
        ofertas: arrayUnion(ofertaParaFirebase),
        menorPreco: novoMenorPreco,
        updatedAt: Timestamp.now(),
      });

      console.log('Pedido atualizado, criando chat...');
      
      // Criar chat automaticamente se não existir
      await criarChatSeNaoExistir(pedidoSelecionado);

      console.log('Sucesso! Oferta criada e chat criado.');
      
      // Atualizar contador de ofertas para autopeças
      if (userData.tipo === 'autopeca') {
        const mesAtual = new Date().toISOString().slice(0, 7);
        const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
        
        await updateDoc(doc(db, 'users', userData.id), {
          ofertasUsadas: ofertasUsadas + 1,
          mesReferenciaOfertas: mesAtual,
        });
      }
      
      toast.success('Oferta enviada com sucesso! Chat criado.');
      setMostrarModalOferta(false);
      setPedidoSelecionado(null);
      setPreco('');
      setObservacaoOferta('');
    } catch (error: any) {
      console.error('Erro detalhado ao criar oferta:', error);
      console.error('Mensagem:', error.message);
      console.error('Code:', error.code);
      toast.error(`Erro ao enviar oferta: ${error.message || 'Tente novamente'}`);
    }
  };

  const criarChatSeNaoExistir = async (pedido: Pedido) => {
    if (!userData) return;

    try {
      // Verificar se já existe um chat entre esta oficina e autopeça para este pedido
      const q = query(
        collection(db, 'chats'),
        where('pedidoId', '==', pedido.id),
        where('autopecaId', '==', userData.id)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Criar novo chat
        await addDoc(collection(db, 'chats'), {
          pedidoId: pedido.id,
          oficinaId: pedido.oficinaId,
          autopecaId: userData.id,
          oficinaNome: pedido.oficinaNome,
          autopecaNome: userData.nome,
          nomePeca: pedido.nomePeca,
          marcaCarro: pedido.marcaCarro,
          modeloCarro: pedido.modeloCarro,
          anoCarro: pedido.anoCarro,
          mensagens: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Erro ao criar chat:', error);
      // Não mostra erro ao usuário pois o chat não é crítico neste momento
    }
  };

  const abrirModalOferta = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setMostrarModalOferta(true);
  };

  const abrirChat = (pedido: Pedido, oferta: Oferta) => {
    console.log('🚀 Abrindo chat:', {
      pedidoId: pedido.id,
      autopecaId: oferta.autopecaId,
      url: `/dashboard/chats?pedidoId=${pedido.id}&autopecaId=${oferta.autopecaId}`
    });
    
    // Redirecionar para a página de chats com o chat específico
    router.push(`/dashboard/chats?pedidoId=${pedido.id}&autopecaId=${oferta.autopecaId}`);
  };

  const abrirModalFrete = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setMostrarModalFrete(true);
  };

  const buscarEnderecos = async (pedido: Pedido) => {
    try {
      // Buscar endereço da oficina
      const oficinaQuery = query(collection(db, 'users'), where('__name__', '==', pedido.oficinaId));
      const oficinaSnapshot = await getDocs(oficinaQuery);
      
      // Buscar endereço da autopeça (primeira oferta)
      let autopecaData = null;
      if (pedido.ofertas && pedido.ofertas.length > 0) {
        const autopecaQuery = query(collection(db, 'users'), where('__name__', '==', pedido.ofertas[0].autopecaId));
        const autopecaSnapshot = await getDocs(autopecaQuery);
        if (!autopecaSnapshot.empty) {
          autopecaData = { id: autopecaSnapshot.docs[0].id, ...autopecaSnapshot.docs[0].data() };
        }
      }

      if (!oficinaSnapshot.empty) {
        const oficinaData = { id: oficinaSnapshot.docs[0].id, ...oficinaSnapshot.docs[0].data() };
        
        setEnderecos(prev => ({
          ...prev,
          [pedido.id]: {
            oficina: oficinaData,
            autopeca: autopecaData
          }
        }));
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Elementos decorativos de fundo - IDÊNTICOS à página de cadastro */}
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
        
        {/* Emojis de autopeças e carros flutuantes - ESTILO BOLHAS! */}
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
        <div className="absolute top-1/3 right-1/3 text-6xl opacity-34 animate-bounce29 drop-shadow-2xl">⚡</div>
        <div className="absolute top-60 left-1/5 text-5xl opacity-37 animate-bounce30 drop-shadow-2xl">🚘</div>
      </div>

      {/* Conteúdo principal (com z-index para ficar acima do fundo) */}
      <div className="relative z-10 p-3 sm:p-6">
        {/* Header com Banner Horizontal */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3 sm:gap-6 mb-6 sm:mb-8">
        {/* Título à Esquerda - Quadrado Moderno */}
        <div className="flex-shrink-0 w-full lg:w-auto">
          <div className="bg-gradient-to-br from-red-50 via-pink-50 to-orange-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 rounded-2xl shadow-lg border-2 border-red-200 dark:border-gray-600 p-4 sm:p-6 relative overflow-hidden h-full">
            {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full opacity-30 -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-100 rounded-full opacity-30 -ml-12 -mb-12"></div>
            
            {/* Conteúdo */}
            <div className="relative z-10 flex flex-col justify-center h-full">
              <div className="flex items-center gap-2 mb-3">
                {/* Badge LIVE */}
                <div className="flex items-center gap-2 bg-red-500 px-3 py-1 rounded-full shadow-md">
                  <Radio className="text-white" size={16} strokeWidth={3} />
                  <span className="text-white text-xs font-black uppercase tracking-wider">
                    AO VIVO
                  </span>
                </div>
              </div>
              
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mb-2 sm:mb-3 leading-tight">
                Pedidos ao Vivo
              </h1>
              
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mb-3 leading-relaxed">
                Seu pedido já está sendo divulgado ao vivo e você logo receberá ofertas!
              </p>
              
              <div className="flex items-center gap-2">
                <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-lg shadow-sm border border-red-100 dark:border-gray-600">
                  <span className="text-xl font-black text-red-600 dark:text-red-400">{pedidos.length}</span>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  pedido(s) ativo(s)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Horizontal à Direita */}
        {userData?.tipo === 'autopeca' && pedidos.length > 0 && (
          <div className="flex-1 w-full lg:w-auto">
            <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-700 rounded-2xl shadow-xl p-4 sm:p-6 text-white overflow-hidden relative h-full">
              {/* Decoração de Fundo */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              
              {/* Conteúdo Horizontal */}
              <div className="relative z-10 flex items-center justify-between gap-6 h-full">
                {/* Lado Esquerdo - Call to Action Principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-white bg-opacity-20 w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0 shadow-lg">
                      <DollarSign size={28} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black leading-tight mb-1">
                        FAÇA SUA OFERTA AGORA!
                      </h2>
                      <p className="text-sm font-bold text-green-100">
                        Conecte-se direto com oficinas da região
                      </p>
                    </div>
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div className="mt-3 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-3 border border-white border-opacity-20">
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="bg-yellow-400 rounded-full p-1">
                          <svg className="w-3 h-3 text-green-900" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-green-50">Destaque garantido</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-blue-400 rounded-full p-1">
                          <svg className="w-3 h-3 text-blue-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="font-semibold text-green-50">Resposta em tempo real</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-purple-400 rounded-full p-1">
                          <svg className="w-3 h-3 text-purple-900" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                            <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                          </svg>
                        </div>
                        <span className="font-semibold text-green-50">Negociação direta</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-red-400 rounded-full p-1">
                          <svg className="w-3 h-3 text-red-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="font-semibold text-green-50">Zero comissão</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lado Direito - Estatística de Oportunidades */}
                <div className="flex-shrink-0">
                  <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-xl px-6 py-4 border-2 border-white border-opacity-30 shadow-2xl">
                    <div className="text-center mb-3">
                      <p className="text-5xl font-black leading-none mb-1">{pedidos.length}</p>
                      <p className="text-xs font-bold text-green-100 uppercase tracking-wider">
                        {pedidos.length === 1 ? 'Oportunidade' : 'Oportunidades'}
                      </p>
                    </div>
                    <div className="bg-yellow-400 text-green-900 px-3 py-1.5 rounded-full text-center">
                      <p className="text-xs font-black uppercase tracking-wide">
                        🔥 Ativas Agora
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Botão Novo Pedido (Oficina) */}
        {userData?.tipo === 'oficina' && (
          <button
            onClick={() => setMostrarModal(true)}
            className="w-full lg:w-auto bg-blue-600 text-white px-6 py-4 sm:py-3 rounded-lg hover:bg-blue-700 font-semibold flex items-center justify-center shadow-lg hover:shadow-xl transition-all flex-shrink-0"
          >
            <Plus size={22} className="mr-2" />
            Novo Pedido
          </button>
        )}
      </div>

      {/* Dropdown de Filtros */}
      {pedidos.length > 0 && (
        <div className="mb-6 flex justify-start px-3 sm:px-0">
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setMostrarDropdownFiltros(!mostrarDropdownFiltros)}
              className="flex items-center justify-center gap-2 px-5 py-4 sm:py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all shadow-lg w-full sm:w-auto"
            >
              <Filter size={22} />
              FILTROS
              <ChevronDown size={20} className={`transition-transform ${mostrarDropdownFiltros ? 'rotate-180' : ''}`} />
            </button>

            {mostrarDropdownFiltros && (
              <>
                {/* Overlay para fechar ao clicar fora */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMostrarDropdownFiltros(false)}
                />
                
                <div className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-200 dark:border-gray-700 py-2 w-full sm:min-w-[280px] sm:w-auto z-20">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase">Opções de Filtro</p>
                  </div>
                  
                  {/* Filtro de Condição */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Condição da Peça</p>
                    
                    <button
                      onClick={() => {
                        setFiltroCondicao('todas');
                        setMostrarDropdownFiltros(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        filtroCondicao === 'todas'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <Car size={16} />
                      Todas
                    </button>
                    
                    <button
                      onClick={() => {
                        setFiltroCondicao('Nova');
                        setMostrarDropdownFiltros(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        filtroCondicao === 'Nova'
                          ? 'bg-green-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-lg">✨</span>
                      Peças Novas
                    </button>
                    
                    <button
                      onClick={() => {
                        setFiltroCondicao('Usada');
                        setMostrarDropdownFiltros(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        filtroCondicao === 'Usada'
                          ? 'bg-orange-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="text-lg">🔄</span>
                      Peças Usadas
                    </button>
                  </div>

                  <div className="border-t border-gray-200 my-2"></div>

                  {/* Toggle de Modo Resumido */}
                  <div className="px-4 py-3">
                    <button
                      onClick={() => {
                        setModoResumido(!modoResumido);
                        setPedidosExpandidos([]); // Resetar expansões ao trocar modo
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center justify-between ${
                        modoResumido
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        Ver pedidos resumidos
                      </span>
                      <div className={`w-10 h-5 rounded-full relative transition-colors ${
                        modoResumido ? 'bg-purple-800' : 'bg-gray-400'
                      }`}>
                        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                          modoResumido ? 'translate-x-5' : 'translate-x-0'
                        }`}></div>
                      </div>
                    </button>
                  </div>

                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                      📊 {pedidos.filter(p => {
                        if (filtroCondicao === 'todas') return true;
                        if (!p.condicaoPeca) return false;
                        return p.condicaoPeca === filtroCondicao;
                      }).length} pedido(s) {modoResumido && '(modo compacto)'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Grid de Pedidos */}
      <div className="flex-1">
          {pedidos.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <Search size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">
                Nenhum pedido ativo no momento
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {userData?.tipo === 'oficina' 
                  ? 'Crie o primeiro pedido clicando no botão acima'
                  : 'Aguarde novos pedidos de oficinas'}
              </p>
            </div>
          ) : (
            <div className={`grid gap-3 sm:gap-4 px-3 sm:px-0 ${modoResumido ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {pedidos
                .filter(pedido => {
                  if (filtroCondicao === 'todas') return true;
                  if (!pedido.condicaoPeca) return false; // Pedidos antigos só aparecem em "todas"
                  return pedido.condicaoPeca === filtroCondicao;
                })
                .filter((pedido) => {
                  // Filtrar por ramo
                  if (ramoSelecionado === 'TODOS') return true;
                  return pedido.ramo === ramoSelecionado;
                })
                .sort((a, b) => {
                  const dataA = a.createdAt instanceof Date ? a.createdAt.getTime() : 0;
                  const dataB = b.createdAt instanceof Date ? b.createdAt.getTime() : 0;
                  return dataB - dataA; // Mais recente primeiro
                })
                .map((pedido) => {
                const horasRestantes = calcularHorasRestantes(pedido.createdAt);
                const corTimer = getCorTimer(horasRestantes);
                const isExpandido = pedidosExpandidos.includes(pedido.id);
                
                // Calcular se é hoje ou ontem
                let diaIndicador = '';
                if (pedido.createdAt instanceof Date) {
                  const hoje = new Date();
                  const ontem = new Date();
                  ontem.setDate(hoje.getDate() - 1);
                  
                  const dataPedido = pedido.createdAt;
                  if (dataPedido.getDate() === hoje.getDate() &&
                      dataPedido.getMonth() === hoje.getMonth() &&
                      dataPedido.getFullYear() === hoje.getFullYear()) {
                    diaIndicador = 'Hoje';
                  } else if (dataPedido.getDate() === ontem.getDate() &&
                             dataPedido.getMonth() === ontem.getMonth() &&
                             dataPedido.getFullYear() === ontem.getFullYear()) {
                    diaIndicador = 'Ontem';
                  }
                }
                
                // MODO RESUMIDO - Cards compactos em formato quadrado com estilo completo
                if (modoResumido && !isExpandido) {
                  return (
                    <div
                      key={pedido.id}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow-[0_0_10px_2px_rgba(0,51,102,0.4)] dark:shadow-[0_0_10px_2px_rgba(59,130,246,0.3)] hover:shadow-[0_0_15px_3px_rgba(0,51,102,0.7)] dark:hover:shadow-[0_0_15px_3px_rgba(59,130,246,0.5)] transition-all duration-300 ease-in-out p-1.5 border-2 border-blue-800 dark:border-blue-600 hover:border-blue-900 dark:hover:border-blue-500 cursor-pointer aspect-square flex flex-col justify-between min-h-0 relative"
                      onClick={() => toggleExpansaoPedido(pedido.id)}
                    >
                      {/* Botão de cancelar (canto superior direito) */}
                      {userData?.tipo === 'oficina' && userData?.id === pedido.oficinaId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarPedido(pedido.id);
                          }}
                          className="absolute top-1 right-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-1 transition-colors z-10"
                          title="Cancelar pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      {/* Nome da Oficina no topo */}
                      <div className="text-center mb-0.5">
                        <p className="text-base font-black text-blue-600 uppercase tracking-tight line-clamp-1 px-0.5">
                          {pedido.oficinaNome}
                        </p>
                      </div>

                      {/* Retângulo com Nome da Peça - mesmo estilo do card completo */}
                      <div className={`rounded-lg p-1.5 mb-0.5 border shadow-sm flex-1 flex flex-col justify-center ${
                        pedido.condicaoPeca === 'Nova' 
                          ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-400'
                          : pedido.condicaoPeca === 'Usada'
                          ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-400'
                          : 'bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-blue-400'
                      }`}>
                        {/* Nome da Peça */}
                        <h3 className="font-black text-xl text-gray-900 line-clamp-2 leading-tight uppercase text-center mb-0.5 px-0.5">
                          {pedido.nomePeca}
                        </h3>
                        
                        {/* Badge de Condição */}
                        {pedido.condicaoPeca && (
                          <div className="flex justify-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-sm ${
                              pedido.condicaoPeca === 'Nova' 
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                                : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                            }`}>
                              {pedido.condicaoPeca.toUpperCase()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Informações do Carro */}
                      <div className="bg-white dark:bg-gray-700 rounded-md p-1 mb-0.5 shadow-sm border border-gray-200 dark:border-gray-600">
                        <p className="text-base text-gray-900 dark:text-white font-black leading-tight line-clamp-1 text-center px-0.5">
                          {pedido.marcaCarro} {pedido.modeloCarro}
                        </p>
                        <p className="text-base text-blue-700 font-black text-center">
                          {pedido.anoCarro}
                        </p>
                      </div>

                      {/* Rodapé com ofertas e seta */}
                      <div className="flex flex-col items-center gap-0.5">
                        {pedido.ofertas && pedido.ofertas.length > 0 ? (
                          <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-base font-bold">
                            {pedido.ofertas.length} {pedido.ofertas.length === 1 ? 'oferta' : 'ofertas'}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-base font-black">
                            Sem ofertas
                          </span>
                        )}
                        <ChevronDown size={20} className="text-blue-600" />
                      </div>
                    </div>
                  );
                }
                
                // MODO COMPLETO (ou card expandido no modo resumido)
                return (
            <div
              key={pedido.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-[0_0_15px_3px_rgba(0,51,102,0.5)] dark:shadow-[0_0_15px_3px_rgba(59,130,246,0.4)] hover:shadow-[0_0_20px_5px_rgba(0,51,102,0.8)] dark:hover:shadow-[0_0_20px_5px_rgba(59,130,246,0.6)] transition-all duration-300 ease-in-out p-4 border-2 border-blue-800 dark:border-blue-600 hover:border-blue-900 dark:hover:border-blue-500 ${
                !modoResumido && 'animate-slide-in'
              } ${modoResumido && isExpandido ? 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2' : ''}`}
            >
              {/* Botões no canto superior direito */}
              <div className="float-right flex gap-2">
                {/* Botão de cancelar pedido (apenas para oficina dona do pedido) */}
                {userData?.tipo === 'oficina' && userData?.id === pedido.oficinaId && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      cancelarPedido(pedido.id);
                    }}
                    className="bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-2 transition-colors"
                    title="Cancelar pedido"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                
                {/* Botão de fechar (apenas no modo resumido quando expandido) */}
                {modoResumido && isExpandido && (
                  <button
                    onClick={() => toggleExpansaoPedido(pedido.id)}
                    className="bg-blue-100 text-blue-600 hover:bg-blue-200 rounded-full p-2 transition-colors"
                    title="Recolher"
                  >
                    <ChevronUp size={20} />
                  </button>
                )}
              </div>
              {/* Dia + Cidade */}
              <div className="mb-3">
                {diaIndicador && (
                  <p className="text-center text-sm text-gray-700 font-bold">
                    {diaIndicador} - {pedido.cidade}
                  </p>
                )}
              </div>

              {/* Horário de Criação */}
              <div className="mb-4">
                <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 border-blue-200 bg-blue-50 font-bold text-sm text-blue-700">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  <span>
                    Pedido criado às {pedido.createdAt instanceof Date 
                      ? pedido.createdAt.toLocaleTimeString('pt-BR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })
                      : 'Agora'}
                  </span>
                </div>
              </div>

              {/* Nome da Loja Centralizado */}
              <div className="text-center mb-3">
                <p className="text-2xl font-black text-blue-600 uppercase tracking-wide">{pedido.oficinaNome}</p>
              </div>

              {/* Retângulo com Nome da Peça */}
              <div className={`rounded-xl p-5 mb-4 border-2 shadow-md hover:shadow-lg transition-shadow ${
                pedido.condicaoPeca === 'Nova' 
                  ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-400'
                  : pedido.condicaoPeca === 'Usada'
                  ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-400'
                  : 'bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-blue-400'
              }`}>
                {/* Nome da Peça */}
                <div className="mb-3">
                  <h3 className="font-black text-3xl text-gray-900 tracking-tight uppercase leading-tight text-center">
                    {pedido.nomePeca}
                  </h3>
                </div>
                {/* Badge de Condição da Peça */}
                {pedido.condicaoPeca && (
                  <div className="flex items-center justify-center gap-2">
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs shadow-lg ${
                      pedido.condicaoPeca === 'Nova' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                        : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white'
                    }`}>
                      PEÇA {pedido.condicaoPeca.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Primeiro Retângulo Branco - Informações do Carro */}
              <div className="bg-white rounded-lg p-4 mb-3 shadow-md border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-600 p-2 rounded-md shadow-sm">
                    <Car size={20} className="text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-xl text-gray-900 uppercase leading-tight tracking-wide">
                      {pedido.marcaCarro} {pedido.modeloCarro}
                    </div>
                    <div className="text-base text-blue-700 font-bold mt-0.5">
                      ANO: {pedido.anoCarro}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segundo Retângulo Branco - Especificações Adicionais */}
              {(pedido.especificacaoMotor || pedido.notaFiscal || pedido.observacao) && (
                <div className="bg-white rounded-lg p-4 mb-4 shadow-md border border-gray-200">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Especificações Adicionais
                  </div>
                  <div className="space-y-2">
                    {pedido.especificacaoMotor && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚙️</span>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Motor:</span>
                          <span className="text-sm text-gray-600 ml-2">{pedido.especificacaoMotor}</span>
                        </div>
                      </div>
                    )}
                    {pedido.notaFiscal && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📄</span>
                        <div>
                          <span className="text-sm font-semibold text-gray-700">Nota Fiscal:</span>
                          <span className="text-sm text-purple-700 font-semibold ml-2 capitalize">{pedido.notaFiscal}</span>
                        </div>
                      </div>
                    )}
                    {pedido.observacao && (
                      <div className="flex items-center gap-2">
                        <span className="text-lg">💬</span>
                        <span className="text-sm font-semibold text-gray-700">Obs:</span>
                        <p className="flex-1 text-sm text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                          {pedido.observacao}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ofertas */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Ofertas recebidas:</span>
                  <span className="font-semibold text-gray-900">
                    {pedido.ofertas?.length || 0}
                  </span>
                </div>
                
                {pedido.ofertas && pedido.ofertas.length > 0 && (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {pedido.ofertas
                      .sort((a, b) => a.preco - b.preco)
                      .map((oferta, idx) => (
                        <div
                          key={oferta.id}
                          className={`text-xs p-2 rounded ${
                            idx === 0 ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">{oferta.autopecaNome}</span>
                              {userData?.tipo === 'oficina' && userData.id === pedido.oficinaId && (
                                <button
                                  onClick={() => abrirChat(pedido, oferta)}
                                  className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                  title="Abrir chat"
                                >
                                  <MessageCircle size={14} />
                                  <span className="text-xs font-medium">Negociar</span>
                                </button>
                              )}
                            </div>
                            <span className="text-green-700 font-semibold">
                              {formatarPreco(oferta.preco)}
                            </span>
                          </div>
                          {oferta.observacao && (
                            <div className="text-xs text-gray-600 italic mt-1 pl-2 border-l-2 border-gray-300">
                              💬 {oferta.observacao}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Melhor Oferta - Acima de "Seu Pedido" */}
              {pedido.menorPreco && userData?.tipo === 'oficina' && userData.id === pedido.oficinaId && (
                <div className="mb-3 flex justify-center">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                    <span className="text-xs font-semibold uppercase tracking-wide">Melhor Oferta:</span>
                    <span className="text-base font-black">{formatarPreco(pedido.menorPreco)}</span>
                  </div>
                </div>
              )}

              {/* Botão de Ação */}
              {userData?.tipo === 'autopeca' && userData.id !== pedido.oficinaId && (
                <button
                  onClick={() => abrirModalOferta(pedido)}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                >
                  <DollarSign size={20} className="mr-2" />
                  EU TENHO
                </button>
              )}

              {userData?.tipo === 'oficina' && userData.id === pedido.oficinaId && (
                <div className="text-center text-sm text-blue-600 font-medium py-2 bg-blue-50 rounded-lg">
                  Seu pedido
                </div>
              )}

              {/* Visualização para Entregador */}
              {userData?.tipo === 'entregador' && pedido.ofertas && pedido.ofertas.length > 0 && (
                <div className="space-y-3">
                  {/* Endereços */}
                  <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <MapPin size={16} className="mr-2" />
                      Rota de Entrega
                    </h4>
                    <div className="text-sm space-y-3">
                      {/* Autopeça */}
                      <div className="text-blue-700">
                        <div className="flex items-center mb-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                          <span className="font-medium">Autopeça: {pedido.ofertas[0].autopecaNome}</span>
                        </div>
                        {enderecos[pedido.id]?.autopeca && (
                          <div className="ml-4 text-xs text-blue-600">
                            <p>{enderecos[pedido.id].autopeca.endereco}</p>
                            {enderecos[pedido.id].autopeca.numero && (
                              <p>, {enderecos[pedido.id].autopeca.numero}</p>
                            )}
                            {enderecos[pedido.id].autopeca.bairro && (
                              <p> - {enderecos[pedido.id].autopeca.bairro}</p>
                            )}
                            <p>{enderecos[pedido.id].autopeca.cidade}</p>
                            {enderecos[pedido.id].autopeca.cep && (
                              <p>CEP: {enderecos[pedido.id].autopeca.cep}</p>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {/* Seta para baixo */}
                      <div className="flex justify-center text-blue-600">
                        <ArrowRight size={16} className="rotate-90" />
                      </div>
                      
                      {/* Oficina */}
                      <div className="text-blue-700">
                        <div className="flex items-center mb-1">
                          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                          <span className="font-medium">Oficina: {pedido.oficinaNome}</span>
                        </div>
                        {enderecos[pedido.id]?.oficina && (
                          <div className="ml-4 text-xs text-blue-600">
                            <p>{enderecos[pedido.id].oficina.endereco}</p>
                            {enderecos[pedido.id].oficina.numero && (
                              <p>, {enderecos[pedido.id].oficina.numero}</p>
                            )}
                            {enderecos[pedido.id].oficina.bairro && (
                              <p> - {enderecos[pedido.id].oficina.bairro}</p>
                            )}
                            <p>{enderecos[pedido.id].oficina.cidade}</p>
                            {enderecos[pedido.id].oficina.cep && (
                              <p>CEP: {enderecos[pedido.id].oficina.cep}</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Botão de Frete */}
                  <button
                    onClick={() => abrirModalFrete(pedido)}
                    className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 font-semibold flex items-center justify-center shadow-md hover:shadow-lg transition-all"
                  >
                    <Truck size={20} className="mr-2" />
                    OFERTAR FRETE
                  </button>
                </div>
              )}
            </div>
                );
              })}
            </div>
          )}
        </div>

      {/* Modal - Novo Pedido */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Novo Pedido</h2>
            
            <form onSubmit={criarPedido} className="space-y-6">
              {/* Campos Obrigatórios */}
              <div className="border-2 border-red-200 pt-5 bg-red-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">⚠️</span>
                  <p className="text-base font-bold text-red-900">Campos Obrigatórios</p>
                  <span className="text-xs text-red-600 ml-2 font-semibold">* (necessários)</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome da Peça *
                    </label>
                    <input
                      type="text"
                      value={nomePeca}
                      onChange={(e) => setNomePeca(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Filtro de óleo"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca do Carro *
                    </label>
                    <input
                      type="text"
                      value={marcaCarro}
                      onChange={(e) => setMarcaCarro(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Toyota"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo do Carro *
                    </label>
                    <input
                      type="text"
                      value={modeloCarro}
                      onChange={(e) => setModeloCarro(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: Corolla"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ano do Carro *
                    </label>
                    <input
                      type="text"
                      value={anoCarro}
                      onChange={(e) => setAnoCarro(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 2020"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condição da Peça *
                    </label>
                    <select
                      value={condicaoPeca}
                      onChange={(e) => setCondicaoPeca(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      required
                    >
                      <option value="">Selecione...</option>
                      <option value="Nova">Nova</option>
                      <option value="Usada">Usada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Campos Opcionais */}
              <div className="border-2 border-blue-200 pt-5 bg-blue-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📝</span>
                  <p className="text-base font-bold text-blue-900">Campos Opcionais</p>
                  <span className="text-xs text-gray-500 ml-2">(não obrigatórios)</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Especificação do Motor
                    </label>
                    <input
                      type="text"
                      value={especificacaoMotor}
                      onChange={(e) => setEspecificacaoMotor(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ex: 1.0, 2.0, 1.6"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nota Fiscal
                    </label>
                    <select
                      value={notaFiscal}
                      onChange={(e) => setNotaFiscal(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="">Selecione...</option>
                      <option value="com nota">Com nota</option>
                      <option value="sem nota">Sem nota</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Observação
                    </label>
                    <textarea
                      value={observacao}
                      onChange={(e) => setObservacao(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="Observação extra..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setMostrarModal(false)}
                  className="flex-1 px-4 py-3.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3.5 rounded-lg hover:bg-blue-700 font-bold text-base shadow-lg"
                >
                  Criar Pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Nova Oferta */}
      {mostrarModalOferta && pedidoSelecionado && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-4 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Fazer Oferta</h2>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-bold text-gray-900">{pedidoSelecionado.nomePeca}</h3>
              <p className="text-sm text-gray-600">
                {pedidoSelecionado.marcaCarro} {pedidoSelecionado.modeloCarro} ({pedidoSelecionado.anoCarro})
              </p>
              {pedidoSelecionado.condicaoPeca && (
                <div className="mt-3 flex justify-center">
                  <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs shadow-md ${
                    pedidoSelecionado.condicaoPeca === 'Nova' 
                      ? 'bg-green-500 text-white' 
                      : 'bg-orange-500 text-white'
                  }`}>
                    PEÇA {pedidoSelecionado.condicaoPeca.toUpperCase()}
                  </span>
                </div>
              )}
              {pedidoSelecionado.especificacaoMotor && (
                <p className="text-sm text-gray-700 mt-1">
                  <span className="font-semibold">Motor:</span> {pedidoSelecionado.especificacaoMotor}
                </p>
              )}
              {pedidoSelecionado.notaFiscal && (
                <p className="text-sm text-purple-700 mt-1 capitalize font-semibold">
                  📄 {pedidoSelecionado.notaFiscal}
                </p>
              )}
              {pedidoSelecionado.observacao && (
                <p className="text-sm text-gray-700 mt-2 bg-yellow-100 p-2 rounded">
                  <span className="font-semibold">Obs:</span> {pedidoSelecionado.observacao}
                </p>
              )}
              {pedidoSelecionado.menorPreco && (
                <p className="text-sm text-green-700 font-semibold mt-2">
                  Menor oferta atual: {formatarPreco(pedidoSelecionado.menorPreco)}
                </p>
              )}
            </div>

            <form onSubmit={criarOferta} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Seu Preço (R$) *
                </label>
                <input
                  type="text"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-semibold"
                  placeholder="0.00"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite apenas números. Ex: 150 ou 150.50
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observação (Opcional)
                </label>
                <textarea
                  value={observacaoOferta}
                  onChange={(e) => setObservacaoOferta(e.target.value)}
                  maxLength={150}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  placeholder="Ex: Produto original, entrega em 2 dias, garantia de 6 meses..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Adicione detalhes sobre a peça, prazo, garantia, etc. (máx. 150 caracteres)
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {observacaoOferta.length}/150 caracteres
                </p>
              </div>

              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setMostrarModalOferta(false);
                    setPedidoSelecionado(null);
                    setPreco('');
                    setObservacaoOferta('');
                  }}
                  className="flex-1 px-4 py-3.5 border-2 border-gray-300 rounded-lg hover:bg-gray-50 font-semibold text-base"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white py-3.5 rounded-lg hover:bg-green-700 font-bold text-base shadow-lg"
                >
                  Enviar Oferta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Ofertas de Frete */}
      {mostrarModalFrete && pedidoSelecionado && userData?.tipo === 'entregador' && (
        <OfertasFreteModal
          isOpen={mostrarModalFrete}
          onClose={() => {
            setMostrarModalFrete(false);
            setPedidoSelecionado(null);
          }}
          chatId={`${pedidoSelecionado.id}-${pedidoSelecionado.ofertas?.[0]?.autopecaId || 'default'}`}
          pedidoId={pedidoSelecionado.id}
          entregadorId={userData.id}
          entregadorNome={userData.nome}
        />
      )}
      </div>
    </div>
  );
}

