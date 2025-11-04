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
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Pedido, Oferta, RamoVeiculo } from '@/types';
import { Plus, Search, DollarSign, Car, Radio, MessageCircle, Truck, MapPin, ArrowRight, Filter, ChevronDown, ChevronUp, Trash2, CheckCircle, ChevronRight, Image, X } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { formatarPreco } from '@/lib/utils';
import toast from 'react-hot-toast';
import OfertasFreteModal from '@/components/OfertasFreteModal';
import { excluirChatsDoPedido } from '@/lib/chatUtils';
import { estruturaBrasil, obterTodasCidades } from '@/lib/estruturaBrasil';

export default function DashboardPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarModalOferta, setMostrarModalOferta] = useState(false);
  const [mostrarModalFrete, setMostrarModalFrete] = useState(false);
  const [mostrarModalFotos, setMostrarModalFotos] = useState(false);
  const [fotosParaVisualizar, setFotosParaVisualizar] = useState<string[]>([]);
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [enderecos, setEnderecos] = useState<{[key: string]: any}>({});
  const [cidadesSelecionadas, setCidadesSelecionadas] = useState<string[]>([]);
  const [ramoSelecionado, setRamoSelecionado] = useState<RamoVeiculo | 'TODOS'>('TODOS');
  const [mostrarDropdownLocalizacao, setMostrarDropdownLocalizacao] = useState(false);
  const [mostrarDropdownRamo, setMostrarDropdownRamo] = useState(false);
  const [estadosExpandidos, setEstadosExpandidos] = useState<string[]>([]);
  const [brasilSelecionado, setBrasilSelecionado] = useState(false);
  const [planosAutopecas, setPlanosAutopecas] = useState<{[key: string]: string}>({});
  
  // Filtro de pedidos para oficinas
  const [filtroPedidos, setFiltroPedidos] = useState<'meus' | 'todos'>('todos');
  const [mostrarDropdownFiltroPedidos, setMostrarDropdownFiltroPedidos] = useState(false);

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
    const brasilSalvo = localStorage.getItem('brasilSelecionado');
    
    if (brasilSalvo === 'true') {
      setBrasilSelecionado(true);
      setCidadesSelecionadas(obterTodasCidades());
    } else if (cidadesSalvas) {
      const cidades = JSON.parse(cidadesSalvas);
      setCidadesSelecionadas(cidades);
      // Verificar se todas as cidades estão selecionadas (Brasil)
      if (cidades.length === obterTodasCidades().length) {
        setBrasilSelecionado(true);
      }
    } else if (userData?.cidade) {
      const nomeCidade = userData.cidade.split('-')[0];
      setCidadesSelecionadas([nomeCidade]);
    }

    // Carregar ramo selecionado do localStorage ou usar padrão do usuário
    const ramoSalvo = localStorage.getItem('ramoSelecionado') as RamoVeiculo | 'TODOS' | null;
    if (ramoSalvo) {
      setRamoSelecionado(ramoSalvo);
    } else if (userData?.ramo) {
      setRamoSelecionado(userData.ramo);
    }
  }, [userData]);
  
  // Funções para gerenciar localizações
  const estadoTotalmenteSelecionado = (estado: string): boolean => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    return cidadesDoEstado.every(cidade => cidadesSelecionadas.includes(cidade));
  };

  const toggleBrasil = () => {
    if (brasilSelecionado) {
      const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
      setCidadesSelecionadas([nomeCidade]);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify([nomeCidade]));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      const todasCidades = obterTodasCidades();
      setCidadesSelecionadas(todasCidades);
      setBrasilSelecionado(true);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(todasCidades));
      localStorage.setItem('brasilSelecionado', 'true');
    }
    setTimeout(() => window.location.reload(), 100);
  };

  const toggleEstadoExpansao = (estado: string) => {
    setEstadosExpandidos(prev => 
      prev.includes(estado) 
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    );
  };

  const toggleEstado = (estado: string) => {
    const cidadesDoEstado = estruturaBrasil[estado as keyof typeof estruturaBrasil];
    
    if (estadoTotalmenteSelecionado(estado)) {
      const novaSelecao = cidadesSelecionadas.filter(c => !cidadesDoEstado.includes(c));
      if (novaSelecao.length === 0) {
        const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
        novaSelecao.push(nomeCidade);
      }
      setCidadesSelecionadas(novaSelecao);
      setBrasilSelecionado(false);
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      localStorage.setItem('brasilSelecionado', 'false');
    } else {
      const novaSelecao = [...new Set([...cidadesSelecionadas, ...cidadesDoEstado])];
      setCidadesSelecionadas(novaSelecao);
      
      if (novaSelecao.length === obterTodasCidades().length) {
        setBrasilSelecionado(true);
        localStorage.setItem('brasilSelecionado', 'true');
      }
      
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
    }
    setTimeout(() => window.location.reload(), 100);
  };

  const toggleCidade = (cidade: string) => {
    setCidadesSelecionadas(prev => {
      let novaSelecao: string[];
      if (prev.includes(cidade)) {
        novaSelecao = prev.filter(c => c !== cidade);
        if (novaSelecao.length === 0) {
          const nomeCidade = userData?.cidade?.split('-')[0] || 'Maringá';
          novaSelecao.push(nomeCidade);
        }
        setBrasilSelecionado(false);
      } else {
        novaSelecao = [...prev, cidade];
        const todasCidades = obterTodasCidades();
        if (novaSelecao.length === todasCidades.length) {
          setBrasilSelecionado(true);
        }
      }
      localStorage.setItem('cidadesSelecionadas', JSON.stringify(novaSelecao));
      localStorage.setItem('brasilSelecionado', brasilSelecionado ? 'true' : 'false');
      return novaSelecao;
    });
    setTimeout(() => window.location.reload(), 100);
  };

  const handleMudarRamo = (novoRamo: RamoVeiculo | 'TODOS') => {
    setRamoSelecionado(novoRamo);
    localStorage.setItem('ramoSelecionado', novoRamo);
    setMostrarDropdownRamo(false);
    setTimeout(() => window.location.reload(), 100);
  };

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
  const [fotosProduto, setFotosProduto] = useState<File[]>([]); // Array de arquivos selecionados
  const [urlsFotosProduto, setUrlsFotosProduto] = useState<string[]>([]); // URLs das fotos após upload
  const [fazendoUploadFotos, setFazendoUploadFotos] = useState(false);

  // Form state - Nova Oferta
  const [preco, setPreco] = useState('');
  const [observacaoOferta, setObservacaoOferta] = useState('');

  // Filtro de condição da peça
  const [filtroCondicao, setFiltroCondicao] = useState<'todas' | 'Nova' | 'Usada'>('todas');
  // Modo resumido: false para "meus pedidos" (extenso), true para "todos os pedidos" (resumido)
  const [modoResumido, setModoResumido] = useState(filtroPedidos === 'todos');
  const [pedidosExpandidos, setPedidosExpandidos] = useState<string[]>([]);
  const [mostrarDropdownFiltros, setMostrarDropdownFiltros] = useState(false);

  // Ajustar modo resumido quando o filtro de pedidos mudar
  useEffect(() => {
    if (userData?.tipo === 'oficina') {
      // "meus pedidos" = modo extenso (false), "todos os pedidos" = modo resumido (true)
      setModoResumido(filtroPedidos === 'todos');
      setPedidosExpandidos([]); // Resetar expansões ao trocar filtro
    }
  }, [filtroPedidos, userData?.tipo]);

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

      // Excluir chats relacionados aos pedidos expirados
      if (pedidosExpirados.length > 0) {
        console.log(`⏰ ${pedidosExpirados.length} pedido(s) expirado(s) detectado(s) - excluindo chats relacionados...`);
        
        // Excluir chats e fotos de cada pedido expirado
        pedidosExpirados.forEach(async (pedidoId) => {
          try {
            // Buscar dados do pedido para pegar o oficinaId
            const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
            const pedidoData = pedidoDoc.exists() ? pedidoDoc.data() : null;
            const oficinaId = pedidoData?.oficinaId || null;
            
            // Excluir fotos do Storage
            if (oficinaId) {
              try {
                await excluirFotosDoPedido(pedidoId, oficinaId);
              } catch (fotoError) {
                console.error(`⚠️ Erro ao excluir fotos do pedido ${pedidoId}:`, fotoError);
              }
            }
            
            // Excluir chats
            const chatsExcluidos = await excluirChatsDoPedido(pedidoId);
            if (chatsExcluidos > 0) {
              console.log(`✅ ${chatsExcluidos} chat(s) do pedido ${pedidoId} foram excluídos`);
            }
            
            // Excluir o pedido do Firestore
            try {
              await deleteDoc(doc(db, 'pedidos', pedidoId));
              console.log(`✅ Pedido ${pedidoId} excluído (expirado após 24h)`);
            } catch (deleteError) {
              console.error(`❌ Erro ao excluir pedido ${pedidoId}:`, deleteError);
            }
          } catch (error) {
            console.error(`❌ Erro ao processar pedido expirado ${pedidoId}:`, error);
          }
        });
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

      // Aplicar filtro de pedidos para oficinas
      let pedidosFiltrados = pedidosData;
      if (userData?.tipo === 'oficina' && filtroPedidos === 'meus') {
        // Filtrar apenas os pedidos da própria oficina (ignorando filtro de cidade)
        pedidosFiltrados = pedidosData.filter(pedido => pedido.oficinaId === userData.id);
      }

      setPedidos(pedidosFiltrados);
      
      // Buscar planos das autopeças que fizeram ofertas (usar pedidosData, não filtrados)
      const autopecaIds = new Set<string>();
      pedidosData.forEach(pedido => {
        pedido.ofertas?.forEach(oferta => {
          if (oferta.autopecaId) {
            autopecaIds.add(oferta.autopecaId);
          }
        });
      });

      // Buscar planos de autopeças que ainda não estão no cache
      const novosPlanos: {[key: string]: string} = {};
      const promessasPlanos = Array.from(autopecaIds).map(async (autopecaId) => {
        // Só buscar se ainda não estiver no cache
        if (!planosAutopecas[autopecaId]) {
          try {
            const userDoc = await getDoc(doc(db, 'users', autopecaId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              novosPlanos[autopecaId] = userData.plano || 'basico';
            }
          } catch (error) {
            console.error(`Erro ao buscar plano do usuário ${autopecaId}:`, error);
          }
        }
      });
      
      await Promise.all(promessasPlanos);
      if (Object.keys(novosPlanos).length > 0) {
        setPlanosAutopecas(prev => ({ ...prev, ...novosPlanos }));
      }
      
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
  }, [cidadesSelecionadas, userData, filtroPedidos]);


  const criarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userData) return;

    // Validar campos obrigatórios
    if (!condicaoPeca) {
      toast.error('Por favor, informe se a peça é nova ou usada');
      return;
    }

    // Estado de loading
    const loadingToast = toast.loading('Criando pedido...');

    try {
      // Fazer upload das fotos se houver (opcional - não bloqueia criação do pedido)
      let fotosUrls: string[] = [];
      if (fotosProduto.length > 0) {
        try {
          setFazendoUploadFotos(true);
          toast.loading('Enviando fotos...', { id: loadingToast });
          
          const uploadPromises = fotosProduto.map(async (foto) => {
            try {
              const timestamp = Date.now();
              const nomeArquivo = `pedido-${timestamp}-${Math.random().toString(36).substring(7)}`;
              const storageRef = ref(storage, `pedidos/${userData.id}/${nomeArquivo}`);
              await uploadBytes(storageRef, foto);
              const url = await getDownloadURL(storageRef);
              return url;
            } catch (fotoError) {
              console.error('Erro ao fazer upload de uma foto:', fotoError);
              // Continua com outras fotos mesmo se uma falhar
              return null;
            }
          });
          
          const resultados = await Promise.all(uploadPromises);
          fotosUrls = resultados.filter((url): url is string => url !== null);
          
          if (fotosUrls.length < fotosProduto.length) {
            toast.error(`${fotosProduto.length - fotosUrls.length} foto(s) não puderam ser enviadas. O pedido será criado sem elas.`, { id: loadingToast });
          }
        } catch (uploadError) {
          console.error('Erro ao fazer upload das fotos:', uploadError);
          toast.error('Não foi possível enviar as fotos. O pedido será criado sem elas.', { id: loadingToast });
          // Continua criando o pedido mesmo sem as fotos
        } finally {
          setFazendoUploadFotos(false);
        }
      }

      // Criar o pedido (mesmo se o upload das fotos falhar)
      toast.loading('Finalizando pedido...', { id: loadingToast });
      
      await addDoc(collection(db, 'pedidos'), {
        oficinaId: userData.id,
        oficinaNome: userData.nome,
        ramo: userData.ramo || 'CARRO', // SEMPRE usar o ramo de cadastro da oficina
        nomePeca,
        marcaCarro,
        modeloCarro,
        anoCarro,
        condicaoPeca, // Campo obrigatório: Nova ou Usada
        ...(especificacaoMotor && { especificacaoMotor }), // Adiciona apenas se preenchido
        ...(notaFiscal && { notaFiscal }), // Adiciona apenas se preenchido
        ...(observacao && { observacao }), // Adiciona apenas se preenchido
        ...(fotosUrls.length > 0 && { fotos: fotosUrls }), // Adiciona apenas se houver fotos
        status: 'ativo',
        ofertas: [],
        cidade: userData.cidade, // SEMPRE usar a cidade de cadastro da oficina
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Pedido criado com sucesso!', { id: loadingToast });
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
      setFotosProduto([]);
      setUrlsFotosProduto([]);
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      setFazendoUploadFotos(false);
      toast.error('Erro ao criar pedido. Tente novamente.', { id: loadingToast });
    }
  };

  // Funções para manipular fotos do produto
  const handleSelecionarFotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivos = e.target.files;
    if (!arquivos) return;

    const novosArquivos: File[] = [];
    for (let i = 0; i < arquivos.length && novosArquivos.length + fotosProduto.length < 2; i++) {
      const arquivo = arquivos[i];
      // Validar se é imagem
      if (arquivo.type.startsWith('image/')) {
        // Validar tamanho (máximo 5MB)
        if (arquivo.size <= 5 * 1024 * 1024) {
          novosArquivos.push(arquivo);
        } else {
          toast.error(`A foto "${arquivo.name}" é muito grande. Máximo 5MB.`);
        }
      } else {
        toast.error(`O arquivo "${arquivo.name}" não é uma imagem.`);
      }
    }

    if (novosArquivos.length + fotosProduto.length > 2) {
      toast.error('Você pode enviar no máximo 2 fotos.');
      return;
    }

    setFotosProduto([...fotosProduto, ...novosArquivos]);
    
    // Criar preview das imagens
    novosArquivos.forEach((arquivo) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setUrlsFotosProduto((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(arquivo);
    });
  };

  const handleRemoverFoto = (index: number) => {
    const novasFotos = fotosProduto.filter((_, i) => i !== index);
    const novasUrls = urlsFotosProduto.filter((_, i) => i !== index);
    setFotosProduto(novasFotos);
    setUrlsFotosProduto(novasUrls);
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
            // Formato: https://firebasestorage.googleapis.com/v0/b/BUCKET/o/pedidos%2FuserId%2FfileName?alt=media&token=...
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
            // Continua excluindo outras fotos mesmo se uma falhar
          }
        });
        
        await Promise.all(promessasExclusao);
        console.log(`✅ ${fotos.length} foto(s) do pedido ${pedidoId} excluída(s) do Storage`);
      }
      
      // Também tentar excluir por pasta (caso haja fotos órfãs)
      try {
        const pastaRef = ref(storage, `pedidos/${oficinaId}`);
        const listaResultado = await listAll(pastaRef);
        
        // Filtrar apenas arquivos relacionados ao pedido (pelo nome do arquivo ou timestamp)
        const arquivosParaExcluir = listaResultado.items.filter(item => {
          // Verificar se o nome do arquivo contém referência ao pedido
          // Isso é uma medida de segurança caso as URLs não sejam encontradas
          return item.name.includes(pedidoId) || item.name.includes('pedido-');
        });
        
        const promessasPasta = arquivosParaExcluir.map(async (arquivoRef) => {
          try {
            await deleteObject(arquivoRef);
            console.log(`✅ Arquivo órfão excluído: ${arquivoRef.fullPath}`);
          } catch (error) {
            console.error(`⚠️ Erro ao excluir arquivo órfão:`, error);
          }
        });
        
        await Promise.all(promessasPasta);
      } catch (pastaError) {
        // Não é crítico se não conseguir listar a pasta
        console.log('ℹ️ Não foi possível verificar pasta para exclusão (pode não existir)');
      }
    } catch (error) {
      console.error(`❌ Erro ao excluir fotos do pedido ${pedidoId}:`, error);
      // Não interromper o processo de exclusão do pedido se houver erro ao excluir fotos
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
      
      // Buscar dados do pedido antes de excluir
      const pedidoDoc = await getDoc(doc(db, 'pedidos', pedidoId));
      const pedidoData = pedidoDoc.exists() ? pedidoDoc.data() : null;
      const oficinaId = pedidoData?.oficinaId || userData.id;
      
      // Primeiro excluir todas as fotos do Storage
      try {
        await excluirFotosDoPedido(pedidoId, oficinaId);
      } catch (fotoError) {
        console.error('⚠️ Erro ao excluir fotos do pedido (continuando com cancelamento):', fotoError);
        // Não interromper o cancelamento do pedido se houver erro ao excluir fotos
      }
      
      // Excluir todos os chats relacionados ao pedido
      try {
        const chatsExcluidos = await excluirChatsDoPedido(pedidoId);
        if (chatsExcluidos > 0) {
          console.log(`✅ ${chatsExcluidos} chat(s) relacionado(s) ao pedido foram excluídos`);
        }
      } catch (chatError) {
        console.error('⚠️ Erro ao excluir chats do pedido (continuando com cancelamento):', chatError);
        // Não interromper o cancelamento do pedido se houver erro ao excluir chats
      }
      
      // Por último, excluir o pedido do Firestore
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
      
      // Calcular total de ofertas disponíveis (limite + extras)
      // Se ofertasUsadas for negativo, significa que há ofertas extras
      const ofertasExtras = ofertasUsadas < 0 ? -ofertasUsadas : 0;
      const totalDisponivel = limite === -1 ? -1 : limite + ofertasExtras;
      const ofertasRealmenteUsadas = Math.max(0, ofertasUsadas);
      
      // Se não for ilimitado, verificar o limite total (incluindo extras)
      if (limite !== -1 && ofertasRealmenteUsadas >= totalDisponivel) {
        toast.error(
          `Você atingiu o limite de ${totalDisponivel} ofertas disponíveis. Faça upgrade ou compre mais ofertas extras para continuar!`,
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

      console.log('Pedido atualizado com sucesso.');
      
      // Atualizar contador de ofertas para autopeças
      if (userData.tipo === 'autopeca') {
        const mesAtual = new Date().toISOString().slice(0, 7);
        const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
        
        await updateDoc(doc(db, 'users', userData.id), {
          ofertasUsadas: ofertasUsadas + 1,
          mesReferenciaOfertas: mesAtual,
        });
      }
      
      toast.success('Oferta enviada com sucesso!');
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

  const abrirModalOferta = (pedido: Pedido) => {
    setPedidoSelecionado(pedido);
    setMostrarModalOferta(true);
  };

  const abrirModalFotos = (fotos: string[]) => {
    setFotosParaVisualizar(fotos);
    setMostrarModalFotos(true);
  };

  const abrirChat = async (pedido: Pedido, oferta: Oferta) => {
    if (!userData) return;
    
    console.log('🚀 Abrindo chat:', {
      pedidoId: pedido.id,
      autopecaId: oferta.autopecaId,
    });
    
    try {
      // Verificar se já existe um chat entre esta oficina e autopeça para este pedido
      const q = query(
        collection(db, 'chats'),
        where('pedidoId', '==', pedido.id),
        where('autopecaId', '==', oferta.autopecaId)
      );

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // Criar novo chat quando o botão "Negociar" for clicado
        const autopecaDoc = await getDoc(doc(db, 'users', oferta.autopecaId));
        const autopecaNome = autopecaDoc.exists() ? autopecaDoc.data().nome : 'Autopeça';
        
        await addDoc(collection(db, 'chats'), {
          pedidoId: pedido.id,
          oficinaId: pedido.oficinaId,
          autopecaId: oferta.autopecaId,
          oficinaNome: pedido.oficinaNome,
          autopecaNome: autopecaNome,
          nomePeca: pedido.nomePeca,
          marcaCarro: pedido.marcaCarro,
          modeloCarro: pedido.modeloCarro,
          anoCarro: pedido.anoCarro,
          mensagens: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        console.log('✅ Chat criado ao clicar em Negociar');
      }
      
      // Aguardar um pouco para o chat ser criado antes de redirecionar
      setTimeout(() => {
        router.push(`/dashboard/chats?pedidoId=${pedido.id}&autopecaId=${oferta.autopecaId}`);
      }, 500);
    } catch (error) {
      console.error('Erro ao criar/abrir chat:', error);
      toast.error('Erro ao abrir chat');
      // Mesmo assim, tentar redirecionar
      router.push(`/dashboard/chats?pedidoId=${pedido.id}&autopecaId=${oferta.autopecaId}`);
    }
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
        
        {/* Raios horizontais */}
        <div className="absolute top-1/4 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-20 animate-scan"></div>
        <div className="absolute top-2/3 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-30 animate-scan-delayed"></div>
        
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
        
        {/* Partículas flutuantes adicionais */}
        <div className="absolute top-10 left-1/4 w-3 h-3 bg-yellow-400 rounded-full opacity-40 animate-particle-float"></div>
        <div className="absolute top-1/4 right-10 w-2 h-2 bg-cyan-300 rounded-full opacity-50 animate-particle-float-delayed"></div>
        <div className="absolute bottom-1/3 left-10 w-3 h-3 bg-blue-300 rounded-full opacity-40 animate-particle-rise"></div>
        <div className="absolute top-1/2 right-1/4 w-2 h-2 bg-green-300 rounded-full opacity-50 animate-particle-float"></div>
        <div className="absolute bottom-10 left-1/3 w-3 h-3 bg-purple-300 rounded-full opacity-40 animate-particle-rise-delayed"></div>
        <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-pink-300 rounded-full opacity-50 animate-particle-float-delayed"></div>

        {/* Raios diagonais extras */}
        <div className="absolute top-0 left-1/6 w-0.5 h-full bg-gradient-to-b from-transparent via-purple-400 to-transparent opacity-15 animate-diagonal-beam rotate-12"></div>
        <div className="absolute top-0 right-1/6 w-0.5 h-full bg-gradient-to-b from-transparent via-green-400 to-transparent opacity-15 animate-diagonal-beam-delayed -rotate-12"></div>

        {/* Ondas de energia horizontais */}
        <div className="absolute top-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-10 animate-wave"></div>
        <div className="absolute bottom-1/3 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-10 animate-wave-delayed"></div>

        {/* Anéis pulsantes */}
        <div className="absolute top-1/4 left-1/3 w-40 h-40 border-2 border-cyan-400 rounded-full opacity-20 animate-ring-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-32 h-32 border-2 border-yellow-400 rounded-full opacity-20 animate-ring-pulse-delayed"></div>

        {/* Estrelas tecnológicas */}
        <div className="absolute top-16 right-16 w-1 h-1 bg-white rounded-full opacity-70 animate-twinkle shadow-sm shadow-white"></div>
        <div className="absolute top-32 right-48 w-1 h-1 bg-cyan-300 rounded-full opacity-70 animate-twinkle-delayed shadow-sm shadow-cyan-300"></div>
        <div className="absolute bottom-16 left-16 w-1 h-1 bg-yellow-300 rounded-full opacity-70 animate-twinkle shadow-sm shadow-yellow-300"></div>
        <div className="absolute bottom-48 right-32 w-1 h-1 bg-blue-300 rounded-full opacity-70 animate-twinkle-delayed shadow-sm shadow-blue-300"></div>
        <div className="absolute top-48 left-32 w-1 h-1 bg-green-300 rounded-full opacity-70 animate-twinkle shadow-sm shadow-green-300"></div>
      </div>

      {/* Conteúdo principal (com z-index para ficar acima do fundo) */}
      <div className="relative z-10 p-3 sm:p-6">
        {/* Header com Banner Horizontal */}
        <div className="flex flex-col lg:flex-row items-stretch gap-2 sm:gap-3 mb-3 sm:mb-4">
        {/* Título à Esquerda - Quadrado Moderno */}
        <div className="flex-shrink-0 w-full lg:w-auto">
          <div className="bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-xl shadow-lg border-2 border-red-300 dark:border-red-400 p-2.5 sm:p-3 relative overflow-hidden h-full">
                {/* Decoração de fundo */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 rounded-full opacity-30 -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-400 rounded-full opacity-30 -ml-12 -mb-12"></div>
            
            {/* Conteúdo */}
            <div className="relative z-10 flex flex-col justify-center h-full">
              <div className="flex items-center justify-between gap-1.5 mb-1.5">
                {/* Badge LIVE */}
                <div className="flex items-center gap-1.5 bg-red-500 px-2 py-0.5 rounded-full shadow-md">
                  <Radio className="text-white" size={12} strokeWidth={3} />
                  <span className="text-white text-[10px] font-black uppercase tracking-wider">
                    AO VIVO
                  </span>
                </div>
                
                {/* Dropdown de Filtro para Oficinas */}
                {userData?.tipo === 'oficina' && (
                  <div className="relative">
                    <button
                      onClick={() => setMostrarDropdownFiltroPedidos(!mostrarDropdownFiltroPedidos)}
                      className="bg-green-500 hover:bg-green-600 px-3 py-1.5 rounded-lg border-2 border-green-400 shadow-lg flex items-center gap-2 transition-all"
                      title="Filtrar pedidos"
                    >
                      <span className="text-white text-xs font-bold">
                        {filtroPedidos === 'meus' ? 'Meus Pedidos' : 'Todos os Pedidos'}
                      </span>
                      <ChevronDown size={14} className="text-white" />
                    </button>
                    
                    {mostrarDropdownFiltroPedidos && (
                      <>
                        {/* Overlay para fechar ao clicar fora */}
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setMostrarDropdownFiltroPedidos(false)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 min-w-[160px]">
                          <button
                            onClick={() => {
                              setFiltroPedidos('meus');
                              setMostrarDropdownFiltroPedidos(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors ${
                              filtroPedidos === 'meus' 
                                ? 'bg-green-500 text-white font-bold shadow-md' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Meus Pedidos
                          </button>
                          <button
                            onClick={() => {
                              setFiltroPedidos('todos');
                              setMostrarDropdownFiltroPedidos(false);
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors ${
                              filtroPedidos === 'todos' 
                                ? 'bg-green-500 text-white font-bold shadow-md' 
                                : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            Todos os Pedidos
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              <h1 className="text-base sm:text-lg font-black text-white mb-1 leading-tight">
                Pedidos ao Vivo
              </h1>
              
              <p className="text-xs text-white font-medium mb-2 leading-tight line-clamp-2">
                {userData?.tipo === 'autopeca' 
                  ? 'Para ver mais pedidos selecione mais localizações para ter acesso aos pedidos de outros locais'
                  : filtroPedidos === 'meus'
                  ? 'Visualizando apenas seus pedidos'
                  : 'Visualizando todos os pedidos da sua cidade'}
              </p>
              
              <div className="flex items-center gap-1.5">
                <div className="bg-white px-2 py-0.5 rounded-lg shadow-sm border border-red-100">
                  <span className="text-base font-black text-red-600">{pedidos.length}</span>
                </div>
                <p className="text-[10px] text-white font-medium">
                  pedido(s) ativo(s)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Banner Horizontal à Direita */}
        {userData?.tipo === 'autopeca' && pedidos.length > 0 && (
          <div className="flex-1 w-full lg:w-auto">
            <div className="bg-gradient-to-r from-green-500 via-emerald-600 to-teal-700 rounded-xl shadow-xl p-2.5 sm:p-3 text-white overflow-hidden relative h-full">
              {/* Decoração de Fundo */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full -mr-24 -mt-24"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full -ml-16 -mb-16"></div>
              
              {/* Conteúdo Horizontal */}
              <div className="relative z-10 flex items-center justify-between gap-3 h-full">
                {/* Lado Esquerdo - Call to Action Principal */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="bg-white bg-opacity-20 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm flex-shrink-0 shadow-lg">
                      <DollarSign size={20} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-black leading-tight mb-0.5">
                        FAÇA SUA OFERTA AGORA!
                      </h2>
                      <p className="text-xs font-bold text-green-100">
                        Conecte-se direto com oficinas da região
                      </p>
                    </div>
                  </div>
                  
                  {/* Informações Adicionais */}
                  <div className="mt-1.5 bg-white bg-opacity-10 backdrop-blur-sm rounded-lg p-2 border border-white border-opacity-20">
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
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
                  <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-lg px-3 py-2 border-2 border-white border-opacity-30 shadow-2xl">
                    <div className="text-center mb-2">
                      <p className="text-3xl font-black leading-none mb-0.5">{pedidos.length}</p>
                      <p className="text-[10px] font-bold text-green-100 uppercase tracking-wider">
                        {pedidos.length === 1 ? 'Oportunidade' : 'Oportunidades'}
                      </p>
                    </div>
                    <div className="bg-yellow-400 text-green-900 px-2 py-1 rounded-full text-center">
                      <p className="text-[10px] font-black uppercase tracking-wide">
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
                
                <div 
                  className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border-2 border-blue-200 dark:border-gray-700 py-2 w-full sm:min-w-[320px] sm:w-auto z-20 max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                    <p className="text-xs font-bold text-gray-600 dark:text-white uppercase">Opções de Filtro</p>
                  </div>
                  
                  {/* Seletor de Localização */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase mb-2">Localização</p>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMostrarDropdownLocalizacao(!mostrarDropdownLocalizacao);
                        }}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-blue-600" />
                          <span className="text-sm font-medium">
                            {brasilSelecionado 
                              ? '🇧🇷 Brasil' 
                              : cidadesSelecionadas.length === 1
                              ? cidadesSelecionadas[0]
                              : `${cidadesSelecionadas.length} cidade(s)`}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${mostrarDropdownLocalizacao ? 'rotate-180' : ''}`} />
                      </button>

                      {mostrarDropdownLocalizacao && (
                        <div 
                          className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 py-2 w-full max-h-[400px] overflow-y-auto z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Selecione Brasil, Estados ou Cidades</p>
                          </div>
                          
                          {/* BRASIL */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBrasil();
                              setMostrarDropdownLocalizacao(false);
                            }}
                            className="w-full px-4 py-2 flex items-center gap-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 font-bold"
                          >
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              brasilSelecionado
                                ? 'bg-blue-600 border-blue-600'
                                : 'border-gray-400'
                            }`}>
                              {brasilSelecionado && (
                                <CheckCircle size={14} className="text-white" />
                              )}
                            </div>
                            <span className="text-sm text-blue-900 dark:text-blue-200">🇧🇷 BRASIL</span>
                          </button>
                          
                          <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
                          
                          {/* ESTADOS */}
                          {Object.entries(estruturaBrasil).map(([estado, cidades]) => (
                            <div key={estado}>
                              <div className="flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEstadoExpansao(estado);
                                  }}
                                  className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  <ChevronRight 
                                    size={16} 
                                    className={`text-gray-600 dark:text-gray-300 transition-transform ${estadosExpandidos.includes(estado) ? 'rotate-90' : ''}`}
                                  />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleEstado(estado);
                                  }}
                                  className="flex-1 px-2 py-2 flex items-center gap-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700"
                                >
                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                    estadoTotalmenteSelecionado(estado)
                                      ? 'bg-blue-600 border-blue-600'
                                      : 'border-gray-400'
                                  }`}>
                                    {estadoTotalmenteSelecionado(estado) && (
                                      <CheckCircle size={14} className="text-white" />
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-900 dark:text-white">{estado}</span>
                                </button>
                              </div>
                              
                              {/* CIDADES */}
                              {estadosExpandidos.includes(estado) && (
                                <div className="pl-8">
                                  {cidades.map((cidade) => (
                                    <button
                                      key={cidade}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCidade(cidade);
                                      }}
                                      className="w-full px-4 py-2 flex items-center gap-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700"
                                    >
                                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                        cidadesSelecionadas.includes(cidade)
                                          ? 'bg-blue-600 border-blue-600'
                                          : 'border-gray-400'
                                      }`}>
                                        {cidadesSelecionadas.includes(cidade) && (
                                          <CheckCircle size={12} className="text-white" />
                                        )}
                                      </div>
                                      <span className="text-xs text-gray-700 dark:text-gray-300">{cidade}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  {/* Seletor de Veículo */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase mb-2">Tipo de Veículo</p>
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMostrarDropdownRamo(!mostrarDropdownRamo);
                        }}
                        className="w-full px-4 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          {ramoSelecionado === 'CARRO' && '🚗'}
                          {ramoSelecionado === 'MOTO' && '🏍️'}
                          {ramoSelecionado === 'CAMINHÃO' && '🚛'}
                          {ramoSelecionado === 'ÔNIBUS' && '🚌'}
                          {ramoSelecionado === 'TODOS' && '🚙'}
                          <span className="text-sm font-medium">
                            {ramoSelecionado === 'TODOS' ? 'Todos os Veículos' : ramoSelecionado}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`transition-transform ${mostrarDropdownRamo ? 'rotate-180' : ''}`} />
                      </button>

                      {mostrarDropdownRamo && (
                        <div 
                          className="absolute top-full left-0 mt-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-gray-200 dark:border-gray-700 py-2 w-full z-30"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {(['TODOS', 'CARRO', 'MOTO', 'CAMINHÃO', 'ÔNIBUS'] as const).map((ramo) => (
                            <button
                              key={ramo}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMudarRamo(ramo === 'TODOS' ? 'TODOS' : ramo);
                              }}
                              className={`w-full px-4 py-2 flex items-center gap-2 text-left hover:bg-blue-50 dark:hover:bg-gray-700 ${
                                ramoSelecionado === ramo ? 'bg-blue-100 dark:bg-blue-900' : ''
                              }`}
                            >
                              <span className="text-lg">
                                {ramo === 'CARRO' && '🚗'}
                                {ramo === 'MOTO' && '🏍️'}
                                {ramo === 'CAMINHÃO' && '🚛'}
                                {ramo === 'ÔNIBUS' && '🚌'}
                                {ramo === 'TODOS' && '🚙'}
                              </span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {ramo === 'TODOS' ? 'Todos os Veículos' : ramo}
                              </span>
                              {ramoSelecionado === ramo && (
                                <CheckCircle size={16} className="text-blue-600 ml-auto" />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

                  {/* Filtro de Condição */}
                  <div className="px-4 py-3 space-y-2">
                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-300 uppercase mb-2">Condição da Peça</p>
                    
                    <button
                      onClick={() => {
                        setFiltroCondicao('todas');
                        setMostrarDropdownFiltros(false);
                      }}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        filtroCondicao === 'todas'
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
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
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-lg">📋</span>
                        {modoResumido ? 'Ver pedidos completos' : 'Ver pedidos resumidos'}
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
                    <p className="text-xs text-gray-600 dark:text-white font-semibold">
                      📊 {pedidos.filter(p => {
                        if (filtroCondicao === 'todas') return true;
                        if (!p.condicaoPeca) return false;
                        return p.condicaoPeca === filtroCondicao;
                      }).filter((pedido) => {
                        // Filtrar por ramo também
                        if (ramoSelecionado === 'TODOS') return true;
                        return pedido.ramo === ramoSelecionado;
                      }).length} pedido(s) {modoResumido && '(modo compacto)'}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

      {/* Grid de Pedidos */}
      <div className="flex-1">
          {pedidos.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
              <Search size={64} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-white mb-2">
                Nenhum pedido ativo no momento
              </h3>
              <p className="text-gray-900 dark:text-gray-200">
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
                  // Verificar se é pedido da oficina atual (quando está em "todos os pedidos")
                  const isMeuPedido = userData?.tipo === 'oficina' && filtroPedidos === 'todos' && pedido.oficinaId === userData.id;
                  
                  return (
                    <div
                      key={pedido.id}
                      className={`bg-white dark:bg-gray-100 rounded-lg transition-all duration-300 ease-in-out p-1.5 border-2 cursor-pointer aspect-square flex flex-col justify-between min-h-0 relative ${
                        isMeuPedido
                          ? 'border-yellow-400 dark:border-yellow-500 shadow-[0_0_15px_4px_rgba(234,179,8,0.6)] dark:shadow-[0_0_15px_4px_rgba(234,179,8,0.5)] ring-4 ring-yellow-300 dark:ring-yellow-400/50'
                          : pedido.condicaoPeca === 'Nova' 
                          ? 'border-green-500 dark:border-green-600 shadow-[0_0_10px_2px_rgba(16,185,129,0.4)] dark:shadow-[0_0_10px_2px_rgba(16,185,129,0.3)] hover:border-green-600 dark:hover:border-green-500 hover:shadow-[0_0_15px_3px_rgba(16,185,129,0.7)] dark:hover:shadow-[0_0_15px_3px_rgba(16,185,129,0.5)]'
                          : pedido.condicaoPeca === 'Usada'
                          ? 'border-orange-500 dark:border-orange-600 shadow-[0_0_10px_2px_rgba(249,115,22,0.4)] dark:shadow-[0_0_10px_2px_rgba(249,115,22,0.3)] hover:border-orange-600 dark:hover:border-orange-500 hover:shadow-[0_0_15px_3px_rgba(249,115,22,0.7)] dark:hover:shadow-[0_0_15px_3px_rgba(249,115,22,0.5)]'
                          : pedido.condicaoPeca === 'Nova ou Usada'
                          ? 'border-green-500 dark:border-green-600 shadow-[0_0_10px_2px_rgba(16,185,129,0.3)] dark:shadow-[0_0_10px_2px_rgba(16,185,129,0.2)] hover:border-green-600 dark:hover:border-green-500 hover:shadow-[0_0_15px_3px_rgba(16,185,129,0.5)] dark:hover:shadow-[0_0_15px_3px_rgba(16,185,129,0.4)]'
                          : 'border-blue-800 dark:border-blue-600 shadow-[0_0_10px_2px_rgba(0,51,102,0.4)] dark:shadow-[0_0_10px_2px_rgba(59,130,246,0.3)] hover:border-blue-900 dark:hover:border-blue-500 hover:shadow-[0_0_15px_3px_rgba(0,51,102,0.7)] dark:hover:shadow-[0_0_15px_3px_rgba(59,130,246,0.5)]'
                      }`}
                      onClick={() => toggleExpansaoPedido(pedido.id)}
                    >
                      {/* Badge "MEU PEDIDO" no topo quando for pedido da oficina em "todos os pedidos" */}
                      {isMeuPedido && (
                        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-1.5 py-0.5 text-[7px] font-black text-center uppercase tracking-wider z-30 rounded-t-lg">
                          ⭐ MEU PEDIDO
                        </div>
                      )}
                      
                      {/* Botão de cancelar (canto superior direito) */}
                      {userData?.tipo === 'oficina' && userData?.id === pedido.oficinaId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelarPedido(pedido.id);
                          }}
                          className={`absolute ${isMeuPedido ? 'top-6' : 'top-1'} right-1 bg-red-100 text-red-600 hover:bg-red-200 rounded-full p-1 transition-colors z-20`}
                          title="Cancelar pedido"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                      
                      {/* Nome da Oficina no topo */}
                      <div className={`text-center mb-0.5 ${isMeuPedido ? 'mt-6' : ''}`}>
                        <p className="text-base font-black text-blue-600 uppercase tracking-tight line-clamp-1 px-0.5">
                          {(() => {
                            // Se for oficina ou entregador, não mostrar nome
                            if (userData?.tipo === 'oficina' || userData?.tipo === 'entregador') {
                              return 'Oficina';
                            }
                            // Se for autopeça, verificar plano
                            if (userData?.tipo === 'autopeca') {
                              const plano = userData.plano || 'basico';
                              // Apenas plano Platinum vê o nome, outros veem "Oficina"
                              if (plano === 'platinum') {
                                return pedido.oficinaNome;
                              }
                              return 'Oficina';
                            }
                            // Fallback
                            return 'Oficina';
                          })()}
                        </p>
                      </div>

                      {/* Retângulo com Nome da Peça - mesmo estilo do card completo */}
                      <div 
                        className={`rounded-lg p-1.5 mb-0.5 border shadow-sm flex-1 flex flex-col justify-center ${
                          pedido.condicaoPeca === 'Nova' 
                            ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-400'
                            : pedido.condicaoPeca === 'Usada'
                            ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-400'
                            : pedido.condicaoPeca === 'Nova ou Usada'
                            ? 'border-green-400 border-orange-400'
                            : 'bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-blue-400'
                        }`}
                        style={
                          pedido.condicaoPeca === 'Nova ou Usada'
                            ? {
                                background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.7) 0%, rgba(209, 250, 229, 0.7) 45%, rgba(254, 243, 199, 0.7) 55%, rgba(254, 243, 199, 0.7) 100%)',
                                borderColor: '#10b981',
                              }
                            : undefined
                        }
                      >
                        {/* Nome da Peça */}
                        <h3 className="font-black text-xl text-gray-900 line-clamp-2 leading-tight uppercase text-center mb-0.5 px-0.5">
                          {pedido.nomePeca}
                        </h3>
                        
                        {/* Badge de Condição */}
                        {pedido.condicaoPeca && (
                          <div className="flex justify-center">
                            {pedido.condicaoPeca === 'Nova ou Usada' ? (
                              <span 
                                className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-sm text-white relative overflow-hidden"
                                style={{
                                  background: 'linear-gradient(135deg, #10b981 0%, #10b981 45%, #f97316 55%, #f97316 100%)'
                                }}
                              >
                                NOVO/USADO
                              </span>
                            ) : (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-sm ${
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
                      <div className="bg-white dark:bg-gray-50 rounded-md p-1 mb-0.5 shadow-sm border border-gray-200 dark:border-gray-300">
                        <p className="text-base text-gray-900 dark:text-gray-900 font-black leading-tight line-clamp-1 text-center px-0.5 uppercase">
                          {pedido.marcaCarro} {pedido.modeloCarro}
                        </p>
                        <p className="text-base text-blue-700 dark:text-blue-700 font-black text-center">
                          {pedido.anoCarro}
                          {pedido.especificacaoMotor && ` | ${pedido.especificacaoMotor}`}
                        </p>
                      </div>

                      {/* Rodapé com ofertas e seta */}
                      <div className="flex flex-col items-center gap-1">
                        {pedido.ofertas && pedido.ofertas.length > 0 ? (
                          <>
                            <span className="bg-green-500 text-white px-2 py-0.5 rounded-full text-base font-bold">
                              {pedido.ofertas.length} {pedido.ofertas.length === 1 ? 'oferta' : 'ofertas'}
                            </span>
                            {/* Botão "Ver ofertas" para oficinas */}
                            {userData?.tipo === 'oficina' && userData?.id === pedido.oficinaId && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpansaoPedido(pedido.id);
                                }}
                                className="flex items-center gap-1 px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors text-xs font-semibold"
                                title="Ver ofertas"
                              >
                                <span>👁️</span>
                                <span>Ver ofertas</span>
                              </button>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-900 dark:text-gray-300 text-base font-black">
                            Sem ofertas
                          </span>
                        )}
                        <ChevronDown size={20} className="text-blue-600" />
                      </div>
                    </div>
                  );
                }
                
                // MODO COMPLETO (ou card expandido no modo resumido)
                // Verificar se é pedido da oficina atual (quando está em "todos os pedidos")
                const isMeuPedido = userData?.tipo === 'oficina' && filtroPedidos === 'todos' && pedido.oficinaId === userData.id;
                
                return (
            <div
              key={pedido.id}
              className={`bg-white dark:bg-gray-100 rounded-xl transition-all duration-300 ease-in-out p-4 border-2 relative ${
                !modoResumido && 'animate-slide-in'
              } ${modoResumido && isExpandido ? 'col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2' : ''} ${
                isMeuPedido
                  ? 'border-yellow-400 dark:border-yellow-500 shadow-[0_0_20px_6px_rgba(234,179,8,0.7)] dark:shadow-[0_0_20px_6px_rgba(234,179,8,0.6)] ring-4 ring-yellow-300 dark:ring-yellow-400/50'
                  : pedido.condicaoPeca === 'Nova' 
                  ? 'border-green-500 dark:border-green-600 shadow-[0_0_15px_3px_rgba(16,185,129,0.5)] dark:shadow-[0_0_15px_3px_rgba(16,185,129,0.4)] hover:border-green-600 dark:hover:border-green-500 hover:shadow-[0_0_20px_5px_rgba(16,185,129,0.8)] dark:hover:shadow-[0_0_20px_5px_rgba(16,185,129,0.6)]'
                  : pedido.condicaoPeca === 'Usada'
                  ? 'border-orange-500 dark:border-orange-600 shadow-[0_0_15px_3px_rgba(249,115,22,0.5)] dark:shadow-[0_0_15px_3px_rgba(249,115,22,0.4)] hover:border-orange-600 dark:hover:border-orange-500 hover:shadow-[0_0_20px_5px_rgba(249,115,22,0.8)] dark:hover:shadow-[0_0_20px_5px_rgba(249,115,22,0.6)]'
                  : pedido.condicaoPeca === 'Nova ou Usada'
                  ? 'border-green-500 dark:border-green-600 shadow-[0_0_15px_3px_rgba(16,185,129,0.4)] dark:shadow-[0_0_15px_3px_rgba(16,185,129,0.3)] hover:border-green-600 dark:hover:border-green-500 hover:shadow-[0_0_20px_5px_rgba(16,185,129,0.6)] dark:hover:shadow-[0_0_20px_5px_rgba(16,185,129,0.5)]'
                  : 'border-blue-800 dark:border-blue-600 shadow-[0_0_15px_3px_rgba(0,51,102,0.5)] dark:shadow-[0_0_15px_3px_rgba(59,130,246,0.4)] hover:border-blue-900 dark:hover:border-blue-500 hover:shadow-[0_0_20px_5px_rgba(0,51,102,0.8)] dark:hover:shadow-[0_0_20px_5px_rgba(59,130,246,0.6)]'
              }`}
            >
              {/* Badge "MEU PEDIDO" no topo quando for pedido da oficina em "todos os pedidos" */}
              {isMeuPedido && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 px-4 py-2 text-xs font-black text-center uppercase tracking-wider z-10 rounded-t-xl">
                  ⭐ MEU PEDIDO
                </div>
              )}

              {/* Botões no canto superior direito */}
              <div className={`absolute top-2 right-2 flex gap-2 z-20 ${isMeuPedido ? 'top-10' : ''}`}>
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

              {/* Informações Compactas: Dia/Cidade, Horário e Nome da Loja */}
              <div className={`mb-3 text-center ${isMeuPedido ? 'mt-8' : ''}`}>
                {diaIndicador && (
                  <p className="text-xs text-gray-900 dark:text-gray-900 font-semibold mb-1">
                    {diaIndicador} - {pedido.cidade}
                  </p>
                )}
                <p className="text-xs text-gray-900 dark:text-gray-900 font-semibold mb-2">
                  Pedido criado às {pedido.createdAt instanceof Date 
                    ? pedido.createdAt.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                    : 'Agora'}
                </p>
                <p className="text-xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                  {(() => {
                    // Se for oficina ou entregador, não mostrar nome
                    if (userData?.tipo === 'oficina' || userData?.tipo === 'entregador') {
                      return 'Oficina';
                    }
                    // Se for autopeça, verificar plano
                    if (userData?.tipo === 'autopeca') {
                      const plano = userData.plano || 'basico';
                      // Apenas plano Platinum vê o nome, outros veem "Oficina"
                      if (plano === 'platinum') {
                        return pedido.oficinaNome;
                      }
                      return 'Oficina';
                    }
                    // Fallback
                    return 'Oficina';
                  })()}
                </p>
              </div>

              {/* Retângulo com Nome da Peça */}
              <div 
                className={`rounded-xl p-5 mb-4 border-2 shadow-md hover:shadow-lg transition-shadow ${
                  pedido.condicaoPeca === 'Nova' 
                    ? 'bg-gradient-to-br from-green-50 via-green-100 to-green-50 border-green-400'
                    : pedido.condicaoPeca === 'Usada'
                    ? 'bg-gradient-to-br from-orange-50 via-orange-100 to-orange-50 border-orange-400'
                    : pedido.condicaoPeca === 'Nova ou Usada'
                    ? 'border-green-400 border-orange-400'
                    : 'bg-gradient-to-br from-blue-50 via-blue-100 to-cyan-100 border-blue-400'
                }`}
                style={
                  pedido.condicaoPeca === 'Nova ou Usada'
                    ? {
                        background: 'linear-gradient(135deg, rgba(209, 250, 229, 0.7) 0%, rgba(209, 250, 229, 0.7) 45%, rgba(254, 243, 199, 0.7) 55%, rgba(254, 243, 199, 0.7) 100%)',
                        borderColor: '#10b981',
                      }
                    : undefined
                }
              >
                {/* Nome da Peça - Destaque Principal */}
                <div className="mb-4">
                  <h3 className="font-black text-4xl sm:text-5xl text-gray-900 tracking-tight uppercase leading-tight text-center mb-3 px-2">
                    {pedido.nomePeca}
                  </h3>
                  
                  {/* Badge de Condição da Peça - Centralizado e Destacado */}
                  {pedido.condicaoPeca && (
                    <div className="flex items-center justify-center">
                      {pedido.condicaoPeca === 'Nova ou Usada' ? (
                        <span 
                          className="inline-flex items-center justify-center px-4 py-2 rounded-full font-bold text-sm shadow-xl text-white relative overflow-hidden transform hover:scale-105 transition-transform"
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #10b981 45%, #f97316 55%, #f97316 100%)'
                          }}
                        >
                          PEÇA NOVO/USADO
                        </span>
                      ) : (
                        <span className={`inline-flex items-center justify-center px-4 py-2 rounded-full font-bold text-sm shadow-xl text-white transform hover:scale-105 transition-transform ${
                          pedido.condicaoPeca === 'Nova' 
                            ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                            : 'bg-gradient-to-r from-orange-500 to-amber-600'
                        }`}>
                          PEÇA {pedido.condicaoPeca.toUpperCase()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Informações do Carro - Layout Melhorado */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 mb-4 shadow-lg border-2 border-blue-200 dark:border-blue-700">
                <div className="flex items-start gap-4">
                  <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-lg flex-shrink-0">
                    <Car size={24} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-black text-2xl sm:text-3xl text-gray-900 dark:text-gray-100 uppercase leading-tight tracking-tight mb-2">
                      {pedido.marcaCarro} {pedido.modeloCarro}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold text-base shadow-md">
                        {pedido.anoCarro}
                      </span>
                      {pedido.especificacaoMotor && (
                        <span className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 rounded-lg font-semibold text-sm border-2 border-blue-300 dark:border-blue-600">
                          ⚙️ {pedido.especificacaoMotor}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Especificações Adicionais - Layout Melhorado */}
              {(pedido.notaFiscal || pedido.observacao) && (
                <div className="bg-white dark:bg-gray-50 rounded-xl p-5 mb-4 shadow-lg border-2 border-gray-200 dark:border-gray-700">
                  <div className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    Informações Complementares
                  </div>
                  <div className="space-y-3">
                    {pedido.notaFiscal && (
                      <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                        <span className="text-2xl">📄</span>
                        <div className="flex-1">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Nota Fiscal:</span>
                          <span className="text-base text-purple-700 dark:text-purple-400 font-bold ml-2 capitalize">
                            {pedido.notaFiscal}
                          </span>
                        </div>
                      </div>
                    )}
                    {pedido.observacao && (
                      <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-2 border-yellow-300 dark:border-yellow-700">
                        <span className="text-2xl mt-0.5">💬</span>
                        <div className="flex-1">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300 block mb-1">Observação:</span>
                          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed">
                            {pedido.observacao}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Ofertas */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-900 dark:text-gray-900 font-semibold">Ofertas recebidas:</span>
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
                            idx === 0 ? 'bg-green-50 dark:bg-green-100 border border-green-200 dark:border-green-300' : 'bg-gray-50 dark:bg-gray-100'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              {(() => {
                                const plano = planosAutopecas[oferta.autopecaId] || 'basico';
                                const cores: {[key: string]: string} = {
                                  basico: 'text-gray-700 dark:text-gray-900',
                                  premium: 'text-blue-600 dark:text-blue-400',
                                  gold: 'text-yellow-600 dark:text-yellow-700',
                                  platinum: 'text-purple-600 dark:text-purple-700'
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
                                return (
                                  <>
                                    <span className={`font-bold ${cores[plano]}`}>
                                      {oferta.autopecaNome}
                                    </span>
                                    {plano !== 'basico' && (
                                      <span className={`italic ${cores[plano]} text-xs`}>
                                        - {nomesPlanos[plano]} {emojis[plano]}
                                      </span>
                                    )}
                                  </>
                                );
                              })()}
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

              {/* Melhor Oferta - Acima de "Seu Pedido" */}
              {pedido.menorPreco && userData?.tipo === 'oficina' && userData.id === pedido.oficinaId && (
                <div className="mb-3 flex justify-center">
                  <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full flex items-center gap-2 shadow-md">
                    <span className="text-xs font-semibold uppercase tracking-wide">Melhor Oferta:</span>
                    <span className="text-base font-black">{formatarPreco(pedido.menorPreco)}</span>
                  </div>
                </div>
              )}

              {/* Botão de Fotos do Produto (apenas para autopeças quando houver fotos) */}
              {userData?.tipo === 'autopeca' && userData.id !== pedido.oficinaId && pedido.fotos && pedido.fotos.length > 0 && (
                <button
                  onClick={() => abrirModalFotos(pedido.fotos || [])}
                  className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 font-semibold flex items-center justify-center shadow-md hover:shadow-lg transition-all mb-2"
                >
                  <Image size={18} className="mr-2" />
                  Fotos do Produto ({pedido.fotos.length})
                </button>
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
                          {(() => {
                            const oferta = pedido.ofertas[0];
                            const plano = planosAutopecas[oferta.autopecaId] || 'basico';
                            const cores: {[key: string]: string} = {
                              basico: 'text-gray-700 dark:text-gray-900',
                              premium: 'text-blue-600 dark:text-blue-700',
                              gold: 'text-yellow-600 dark:text-yellow-700',
                              platinum: 'text-purple-600 dark:text-purple-700'
                            };
                            const emojis: {[key: string]: string} = {
                              basico: '',
                              premium: '💎',
                              gold: '🏆',
                              platinum: '👑'
                            };
                            const nomesPlanos: {[key: string]: string} = {
                              basico: '',
                              premium: 'Premium',
                              gold: 'Gold',
                              platinum: 'Platinum'
                            };
                            return (
                              <span className="font-semibold">
                                Autopeça:{' '}
                                <span className={`font-bold ${cores[plano]}`}>
                                  {oferta.autopecaNome}
                                </span>
                                {plano !== 'basico' && (
                                  <span className={`italic ${cores[plano]} text-sm ml-1`}>
                                    - {nomesPlanos[plano]} {emojis[plano]}
                                  </span>
                                )}
                              </span>
                            );
                          })()}
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
                          <span className="font-medium">
                            Oficina: {(() => {
                              // Se for oficina ou entregador, não mostrar nome
                              if (userData?.tipo === 'oficina' || userData?.tipo === 'entregador') {
                                return 'Oficina';
                              }
                              // Se for autopeça, verificar plano
                              if (userData?.tipo === 'autopeca') {
                                const plano = userData.plano || 'basico';
                                // Apenas plano Platinum vê o nome, outros veem "Oficina"
                                if (plano === 'platinum') {
                                  return pedido.oficinaNome;
                                }
                                return 'Oficina';
                              }
                              // Fallback
                              return 'Oficina';
                            })()}
                          </span>
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
            <h2 className="text-2xl font-bold mb-4 text-gray-900">Novo Pedido</h2>
            
            {/* Informações sobre cidade e ramo */}
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100 font-semibold mb-1">
                ℹ️ Informações do Pedido:
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Cidade:</strong> {userData?.cidade || 'Não informada'}
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-200">
                <strong>Tipo de Veículo:</strong> {userData?.ramo || 'Não informado'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-2 italic">
                O pedido sempre será criado na sua cidade de cadastro e com o tipo de veículo do seu cadastro.
              </p>
            </div>
            
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
                      <option value="Nova ou Usada">Nova ou Usada</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Campos Opcionais */}
              <div className="border-2 border-blue-200 pt-5 bg-blue-50/50 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">📝</span>
                  <p className="text-base font-bold text-blue-900">Campos Opcionais</p>
                  <span className="text-xs text-gray-900 dark:text-gray-300 ml-2">(não obrigatórios)</span>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fotos do Produto (máximo 2)
                    </label>
                    <div className="space-y-3">
                      {/* Input de arquivo */}
                      <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleSelecionarFotos}
                          disabled={fotosProduto.length >= 2 || fazendoUploadFotos}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-2">
                          <Image className="w-6 h-6 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {fotosProduto.length >= 2 
                              ? 'Máximo de 2 fotos atingido' 
                              : `Clique para selecionar ${fotosProduto.length === 0 ? 'até 2 fotos' : 'mais 1 foto'}`}
                          </span>
                        </div>
                      </label>

                      {/* Preview das fotos */}
                      {urlsFotosProduto.length > 0 && (
                        <div className="grid grid-cols-2 gap-3">
                          {urlsFotosProduto.map((url, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg border border-gray-300"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemoverFoto(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover foto"
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
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
                  disabled={fazendoUploadFotos}
                  className={`flex-1 py-3.5 rounded-lg font-bold text-base shadow-lg transition-all ${
                    fazendoUploadFotos
                      ? 'bg-gray-400 text-white cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {fazendoUploadFotos ? 'Criando...' : 'Criar Pedido'}
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
              <p className="text-sm text-gray-600 uppercase">
                {pedidoSelecionado.marcaCarro} {pedidoSelecionado.modeloCarro} ({pedidoSelecionado.anoCarro}
                {pedidoSelecionado.especificacaoMotor && ` | ${pedidoSelecionado.especificacaoMotor}`})
              </p>
              {pedidoSelecionado.condicaoPeca && (
                <div className="mt-3 flex justify-center">
                  {pedidoSelecionado.condicaoPeca === 'Nova ou Usada' ? (
                    <span 
                      className="inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs shadow-md text-white relative overflow-hidden"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #10b981 45%, #f97316 55%, #f97316 100%)'
                      }}
                    >
                      PEÇA NOVO/USADO
                    </span>
                  ) : (
                    <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs shadow-md ${
                      pedidoSelecionado.condicaoPeca === 'Nova' 
                        ? 'bg-green-500 text-white' 
                        : 'bg-orange-500 text-white'
                    }`}>
                      PEÇA {pedidoSelecionado.condicaoPeca.toUpperCase()}
                    </span>
                  )}
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
                <p className="text-xs text-gray-900 dark:text-gray-300 mt-1">
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
                <p className="text-xs text-gray-900 dark:text-gray-300 mt-1">
                  💡 Adicione detalhes sobre a peça, prazo, garantia, etc. (máx. 150 caracteres)
                </p>
                <p className="text-xs text-gray-900 dark:text-gray-300 mt-1">
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

      {/* Modal - Fotos do Produto */}
      {mostrarModalFotos && fotosParaVisualizar.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-3 sm:p-4" onClick={() => setMostrarModalFotos(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Fotos do Produto</h2>
              <button
                onClick={() => setMostrarModalFotos(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title="Fechar"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fotosParaVisualizar.map((fotoUrl, index) => (
                <div key={index} className="relative group">
                  <img
                    src={fotoUrl}
                    alt={`Foto do produto ${index + 1}`}
                    className="w-full h-auto rounded-lg border border-gray-300 shadow-md"
                  />
                </div>
              ))}
            </div>
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

