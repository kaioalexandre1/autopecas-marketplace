'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAssinatura, LIMITES_PLANOS, PRECOS_PLANOS } from '@/types';
import { Check, Zap, Crown, Gem, ArrowRight, Loader, Calendar, AlertTriangle, QrCode } from 'lucide-react';
import { doc, updateDoc, Timestamp, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function PlanosPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAssinatura | null>(null);
  const [cancelandoPlano, setCancelandoPlano] = useState(false);

  // Redirecionar se não for autopeça
  useEffect(() => {
    if (userData && userData.tipo !== 'autopeca') {
      toast.error('Esta página é exclusiva para autopeças');
      router.push('/dashboard');
    }
  }, [userData, router]);

  const planosConfig = [
    {
      id: 'basico' as PlanoAssinatura,
      nome: 'Básico',
      preco: PRECOS_PLANOS.basico,
      limite: LIMITES_PLANOS.basico,
      icone: Zap,
      cor: 'from-gray-400 to-gray-600',
      corBorda: 'border-gray-400',
      corTexto: 'text-gray-700',
      corBg: 'bg-gray-100',
      corFundoInterno: 'bg-gray-50',
      features: [
        'Até 20 ofertas por mês',
        'Acesso a todos os pedidos',
        'Chat com oficinas',
        'Notificações por email',
      ],
      destaque: false,
    },
    {
      id: 'premium' as PlanoAssinatura,
      nome: 'Silver',
      preco: PRECOS_PLANOS.premium,
      limite: LIMITES_PLANOS.premium,
      icone: Crown,
      cor: 'from-blue-500 to-blue-700',
      corBorda: 'border-blue-500',
      corTexto: 'text-blue-700',
      corBg: 'bg-blue-100',
      corFundoInterno: 'bg-blue-50',
      features: [
        'Até 100 ofertas por mês',
        'Destaque em pesquisas',
        'Prioridade no chat',
        'Relatórios de vendas',
        'Suporte prioritário',
      ],
      destaque: false,
    },
    {
      id: 'gold' as PlanoAssinatura,
      nome: 'Gold',
      preco: PRECOS_PLANOS.gold,
      limite: LIMITES_PLANOS.gold,
      icone: Gem,
      cor: 'from-yellow-500 to-yellow-700',
      corBorda: 'border-yellow-500',
      corTexto: 'text-yellow-700',
      corBg: 'bg-yellow-100',
      corFundoInterno: 'bg-yellow-50',
      features: [
        'Até 200 ofertas por mês',
        'Selo Gold verificado',
        'Anúncios promocionais',
        'Analytics avançado',
        'Gerente de conta dedicado',
      ],
      destaque: false,
    },
    {
      id: 'platinum' as PlanoAssinatura,
      nome: 'Platinum',
      preco: PRECOS_PLANOS.platinum,
      limite: LIMITES_PLANOS.platinum,
      icone: Crown,
      cor: 'from-purple-500 to-purple-700',
      corBorda: 'border-purple-500',
      corTexto: 'text-purple-700',
      corBg: 'bg-purple-100',
      corFundoInterno: 'bg-purple-50',
      features: [
        'Ofertas ILIMITADAS',
        'Selo Platinum exclusivo',
        'Página personalizada',
        'API de integração',
        'Consultoria estratégica',
        'Suporte 24/7',
      ],
      destaque: true,
    },
  ];

  // Função para verificar se um plano é inferior ao atual
  const isPlanoInferior = (plano: PlanoAssinatura): boolean => {
    if (!userData?.plano || userData.plano === 'basico') return false;
    
    const ordemPlanos: Record<PlanoAssinatura, number> = {
      basico: 0,
      premium: 1,
      gold: 2,
      platinum: 3,
    };

    const planoAtual = ordemPlanos[userData.plano];
    const planoSelecionado = ordemPlanos[plano];

    return planoSelecionado < planoAtual;
  };

  const handleSelecionarPlano = async (plano: PlanoAssinatura) => {
    if (!userData) return;

    // Bloquear seleção de planos inferiores
    if (isPlanoInferior(plano)) {
      toast.error('Não é possível fazer downgrade para um plano inferior. Entre em contato com o suporte se deseja cancelar seu plano atual.', { duration: 5000 });
      return;
    }

    // Se for plano básico (grátis), ativar imediatamente
    if (plano === 'basico') {
      setLoading(true);
      try {
        const mesAtual = new Date().toISOString().slice(0, 7); // "2025-01"
        
        await updateDoc(doc(db, 'users', userData.id), {
          plano: 'basico',
          assinaturaAtiva: true,
          ofertasUsadas: 0,
          mesReferenciaOfertas: mesAtual,
          dataProximoPagamento: null,
          cancelamentoAgendado: false,
          dataCancelamentoAgendado: null,
          renovacaoAutomaticaAtiva: false,
          subscriptionId: null,
        });

        toast.success('Plano Básico ativado com sucesso!');
        router.push('/dashboard');
      } catch (error) {
        console.error('Erro ao ativar plano básico:', error);
        toast.error('Erro ao ativar plano');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Para planos pagos, redirecionar para página de pagamento
    // Se for Platinum e elegível para teste, enviar flag
    const isTestePlatinum = plano === 'platinum' && podeTestarPlatinum();
    setPlanoSelecionado(plano);
    router.push(`/dashboard/checkout?plano=${plano}${isTestePlatinum ? '&teste=1' : ''}`);
  };

  const handleCancelarPlano = async () => {
    if (!userData || userData.plano === 'basico') return;
    const confirmou = window.confirm(
      'Tem certeza de que deseja cancelar a renovação automática? Você continuará com os benefícios do plano até o fim do período já pago.'
    );
    if (!confirmou) return;

    setCancelandoPlano(true);
    try {
      if (userData.subscriptionId) {
        const resp = await fetch('/api/mercadopago/subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'cancel',
            subscriptionId: userData.subscriptionId,
            autopecaId: userData.id,
          }),
        });

        const data = await resp.json();
        if (!resp.ok || !data?.ok) {
          const errorMessage =
            data?.details?.message ||
            data?.details?.cause?.[0]?.description ||
            data?.message ||
            data?.error ||
            'Erro ao cancelar assinatura.';
          throw new Error(errorMessage);
        }
      }

      const dataFimPlano = getDataVencimento();
      await updateDoc(doc(db, 'users', userData.id), {
        cancelamentoAgendado: true,
        dataCancelamentoAgendado: dataFimPlano ? Timestamp.fromDate(dataFimPlano) : null,
        renovacaoAutomaticaAtiva: false,
        subscriptionId: null,
      });

      toast.success('Renovação automática cancelada. O plano permanecerá ativo até o fim do período atual.');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      console.error('Erro ao cancelar plano:', error);
      toast.error(error?.message || 'Não foi possível cancelar o plano. Tente novamente.');
    } finally {
      setCancelandoPlano(false);
    }
  };

  // Função para comprar ofertas extras - redireciona para checkout
  const handleComprarOfertasExtras = () => {
    if (!userData || userData.plano !== 'basico') return;
    router.push('/dashboard/checkout?ofertasExtras=1');
  };

  const getOfertasUsadas = () => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    if (userData?.mesReferenciaOfertas === mesAtual) {
      const ofertasUsadas = userData.ofertasUsadas || 0;
      // Se for negativo, significa que há ofertas extras disponíveis
      // Mas para exibição, mostramos como valor positivo (ofertas realmente usadas)
      return Math.max(0, ofertasUsadas);
    }
    return 0;
  };

  const getLimiteAtual = () => {
    if (!userData?.plano) return LIMITES_PLANOS.basico;
    return LIMITES_PLANOS[userData.plano];
  };

  // Calcular total de ofertas disponíveis (limite + extras)
  const getTotalOfertasDisponiveis = () => {
    const limite = getLimiteAtual();
    if (limite === -1) return -1; // Ilimitado
    
    const mesAtual = new Date().toISOString().slice(0, 7);
    if (userData?.mesReferenciaOfertas === mesAtual) {
      const ofertasUsadas = userData.ofertasUsadas || 0;
      // Se ofertasUsadas for negativo, significa que há ofertas extras
      // Total = limite + ofertas extras (se houver)
      const ofertasExtras = ofertasUsadas < 0 ? -ofertasUsadas : 0;
      return limite + ofertasExtras;
    }
    return limite;
  };

  const resolverDataFirestore = (valor: any): Date | null => {
    if (!valor) return null;
    if (valor instanceof Date) return valor;
    if (valor?.toDate) return valor.toDate();
    if (valor?.seconds) return new Date(valor.seconds * 1000);
    return null;
  };

  const getDataVencimento = () => {
    if (!userData?.dataProximoPagamento) return null;
    return resolverDataFirestore(userData.dataProximoPagamento);
  };

  // Verificar elegibilidade para teste de 30 dias grátis do Platinum
  const podeTestarPlatinum = () => {
    if (!userData) return false;
    
    // Já usou o teste
    if (userData.testePlatinumUsado) return false;
    
    // Verificar se cadastrou há menos de 30 dias
    const dataCadastro = userData.createdAt;
    let dataCadastroDate: Date;
    
    if (dataCadastro instanceof Date) {
      dataCadastroDate = dataCadastro;
    } else if ((dataCadastro as any)?.toDate) {
      dataCadastroDate = (dataCadastro as any).toDate();
    } else if ((dataCadastro as any)?.seconds) {
      dataCadastroDate = new Date((dataCadastro as any).seconds * 1000);
    } else {
      return false;
    }
    
    const hoje = new Date();
    const diasDesdeCadastro = Math.floor((hoje.getTime() - dataCadastroDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diasDesdeCadastro > 30) return false;
    
    // Verificar se nunca assinou nenhum plano pago (só o básico é permitido)
    const planosPagos: PlanoAssinatura[] = ['premium', 'gold', 'platinum'];
    const historicoPlano = userData.plano;
    
    // Se está no básico ou nunca teve plano, pode usar o teste
    if (!historicoPlano || historicoPlano === 'basico') {
      return true;
    }
    
    // Se já assinou algum plano pago, não pode usar o teste
    return false;
  };

  // Verificar vencimento do plano e ativar básico se necessário
  useEffect(() => {
    const verificarVencimento = async () => {
      if (!userData || userData.tipo !== 'autopeca') return;
      
      // Se for plano básico, não precisa verificar vencimento
      if (userData.plano === 'basico' || !userData.plano) return;
      
      // Se não tiver data de próximo pagamento, não há o que verificar
      if (!userData.dataProximoPagamento) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', userData.id));
        const data = userDoc.data();
        
        if (!data?.dataProximoPagamento) return;

        // Converter Timestamp do Firestore para Date
        let dataVencimento: Date;
        if (data.dataProximoPagamento instanceof Date) {
          dataVencimento = data.dataProximoPagamento;
        } else if (data.dataProximoPagamento?.toDate) {
          dataVencimento = data.dataProximoPagamento.toDate();
        } else if (data.dataProximoPagamento?.seconds) {
          dataVencimento = new Date(data.dataProximoPagamento.seconds * 1000);
        } else {
          return;
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const vencimento = new Date(dataVencimento);
        vencimento.setHours(0, 0, 0, 0);

        // Se o plano venceu, ativar plano básico
        if (vencimento < hoje && data.assinaturaAtiva && data.plano !== 'basico') {
          const mesAtual = new Date().toISOString().slice(0, 7);
          
          await updateDoc(doc(db, 'users', userData.id), {
            plano: 'basico',
            assinaturaAtiva: true,
            ofertasUsadas: 0,
            mesReferenciaOfertas: mesAtual,
            dataProximoPagamento: null,
            cancelamentoAgendado: false,
            dataCancelamentoAgendado: null,
            renovacaoAutomaticaAtiva: false,
            subscriptionId: null,
          });

          toast.error('Seu plano expirou e foi automaticamente convertido para o plano Básico.');
        }
      } catch (error) {
        console.error('Erro ao verificar vencimento:', error);
      }
    };

    verificarVencimento();
    // Verificar a cada 5 minutos
    const interval = setInterval(verificarVencimento, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userData]);

  // Verificar se está próximo de vencer (menos de 7 dias)
  const isProximoDeVencer = () => {
    const dataVenc = getDataVencimento();
    if (!dataVenc) return false;

    const hoje = new Date();
    const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    
    return diasRestantes <= 7 && diasRestantes > 0;
  };

  // Verificar se já venceu
  const isVencido = () => {
    const dataVenc = getDataVencimento();
    if (!dataVenc) return false;

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVenc);
    vencimento.setHours(0, 0, 0, 0);

    return vencimento < hoje;
  };

  const dataCancelamentoAgendado = resolverDataFirestore(userData?.dataCancelamentoAgendado);
  const dataCancelamentoTexto = dataCancelamentoAgendado
    ? format(dataCancelamentoAgendado, 'dd/MM/yyyy', { locale: ptBR })
    : null;

  if (!userData || userData.tipo !== 'autopeca') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4 relative">
      {/* Elementos decorativos de fundo - IDÊNTICOS ao dashboard */}
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
        {/* Header */}
        <div className="text-center mb-12">
          <div className="max-w-7xl mx-auto bg-gradient-to-br from-gray-900/95 via-gray-800/95 to-gray-900/95 backdrop-blur-md border-2 border-cyan-500/50 rounded-3xl shadow-2xl px-8 md:px-16 py-6 md:py-8 relative overflow-hidden">
            {/* Efeito de brilho neon nas bordas */}
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20 opacity-50 animate-pulse"></div>
            <div className="absolute -top-1 -left-1 w-32 h-32 bg-cyan-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            <div className="absolute -bottom-1 -right-1 w-32 h-32 bg-blue-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>
            
            <div className="relative z-10">
              <h1 
                className="text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 uppercase tracking-wider animate-neonGlow"
                style={{
                  textShadow: `
                    0 0 10px rgba(59, 130, 246, 0.8),
                    0 0 20px rgba(59, 130, 246, 0.8),
                    0 0 30px rgba(59, 130, 246, 0.6),
                    0 0 40px rgba(59, 130, 246, 0.4),
                    0 0 50px rgba(59, 130, 246, 0.3)
                  `,
                  WebkitTextFillColor: 'white',
                  WebkitTextStroke: 'none',
                }}
              >
                ESCOLHA SEU PLANO
              </h1>
              <div className="h-px bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-4 mx-auto max-w-4xl"></div>
              <p 
                className="text-base md:text-xl lg:text-2xl text-gray-200 max-w-5xl mx-auto uppercase tracking-wide font-bold leading-tight"
                style={{
                  textShadow: '0 0 10px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3)',
                }}
              >
                POTENCIALIZE SUAS VENDAS COM O PLANO IDEAL PARA O SEU NEGÓCIO
              </p>
            </div>
          </div>
        </div>

        {/* Cards de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {planosConfig.map((plano) => {
            const Icon = plano.icone;
            const isPlanoAtual = userData.plano === plano.id;
            const isInferior = isPlanoInferior(plano);
            
            return (
              <div
                key={plano.id}
                className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden transform transition-all duration-300 ${
                  isInferior 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:scale-105'
                } ${
                  plano.destaque ? `ring-4 ${plano.corBorda} scale-105` : ''
                } ${isPlanoAtual ? 'ring-4 ring-green-500' : ''}`}
              >
                {isInferior && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 text-xs font-bold text-center z-20">
                    PLANO INFERIOR - INDISPONÍVEL
                  </div>
                )}
                {plano.destaque && !isInferior && (
                  <div className={`absolute top-0 right-0 bg-gradient-to-r ${plano.cor} text-white px-4 py-1 text-xs font-bold rounded-bl-lg z-10`}>
                    MAIS POPULAR
                  </div>
                )}
                
                {isPlanoAtual && !isInferior && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-1 text-xs font-bold rounded-br-lg z-10">
                    PLANO ATUAL
                  </div>
                )}

                <div className={`h-32 bg-gradient-to-br ${plano.cor} flex items-center justify-center`}>
                  <Icon size={64} className="text-white" />
                </div>

                <div className={`p-6 ${plano.corFundoInterno}`}>
                  <h3 className={`text-2xl font-black ${plano.corTexto} mb-2`}>{plano.nome}</h3>
                  
                  <div className="mb-6">
                    <span className={`text-4xl font-black ${plano.corTexto}`}>
                      R$ {plano.preco.toFixed(2).replace('.', ',')}
                    </span>
                    <span className={plano.corTexto}>/mês</span>
                  </div>

                  <div className={`mb-6 px-4 py-2 ${plano.corBg} rounded-lg`}>
                    <p className={`text-sm font-bold ${plano.corTexto}`}>
                      {plano.limite === -1 ? 'Ofertas Ilimitadas' : `Até ${plano.limite} ofertas/mês`}
                    </p>
                  </div>

                  <ul className="space-y-3 mb-6">
                    {plano.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                        <span className={`text-sm ${plano.corTexto}`}>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleSelecionarPlano(plano.id)}
                    disabled={loading || isPlanoAtual || isInferior}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                      isPlanoAtual
                        ? 'bg-gray-400 cursor-not-allowed'
                        : isInferior
                        ? 'bg-gray-500 cursor-not-allowed opacity-50'
                        : `bg-gradient-to-r ${plano.cor} hover:shadow-2xl transform hover:-translate-y-1`
                    }`}
                    title={isInferior ? 'Não é possível fazer downgrade para um plano inferior' : ''}
                  >
                    {loading ? (
                      <Loader size={20} className="animate-spin" />
                    ) : isPlanoAtual ? (
                      'Plano Ativo'
                    ) : isInferior ? (
                      <>
                        <span className="line-through">Indisponível</span>
                        <AlertTriangle size={16} />
                      </>
                    ) : (
                      <>
                        {plano.preco === 0 
                          ? 'Ativar Grátis' 
                          : plano.id === 'platinum' && podeTestarPlatinum()
                          ? 'Testar 30 dias grátis'
                          : 'Assinar Agora'}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                  
                  {/* Badge de teste disponível para Platinum */}
                  {plano.id === 'platinum' && podeTestarPlatinum() && (
                    <div className="mt-2 px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-lg text-xs font-bold text-center">
                      🎁 R$ 1,00 por 30 dias, depois R$ 990,00/mês
                    </div>
                  )}

                  {/* Botão de Ofertas Extras - apenas para plano básico */}
                  {plano.id === 'basico' && userData.plano === 'basico' && (
                    <button
                      onClick={() => handleComprarOfertasExtras()}
                      disabled={loading}
                      className="w-full mt-3 py-2.5 px-4 rounded-xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span>+10 Ofertas Extras</span>
                      <span className="text-xs bg-white/20 px-2 py-0.5 rounded">R$ 29,90 (PIX)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Alert para aprovação de novo Preapproval após trial */}
        {userData.linkAprovacaoPlatinum && (
          <div className="mb-6 max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <AlertTriangle size={24} className="text-yellow-400" />
                <div className="flex-1">
                  <h3 className="text-white font-bold mb-1">Aprovação Necessária</h3>
                  <p className="text-gray-300 text-sm mb-3">
                    Seu período de teste Platinum terminou. Para continuar com o plano Platinum (R$ 990,00/mês), 
                    é necessário aprovar a nova assinatura.
                  </p>
                  <a
                    href={userData.linkAprovacaoPlatinum}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white font-bold rounded-lg transition-all"
                  >
                    Aprovar Nova Assinatura
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Card de Informações do Plano Atual - Abaixo dos Cards */}
        {userData.plano && (
          <div className="mb-12 flex flex-col items-center gap-6 max-w-7xl mx-auto">
            <div className="w-full bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm border-2 border-cyan-500/30 rounded-2xl shadow-2xl p-6 relative overflow-hidden">
              {/* Efeitos de brilho */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-cyan-500/10 opacity-50"></div>
              
              <div className="relative z-10">
                {/* Título do Plano */}
                <div className="flex items-center justify-center gap-3 mb-6">
                  <div className={`p-3 rounded-xl ${
                    isVencido() 
                      ? 'bg-red-500/20 border border-red-500/50'
                      : isProximoDeVencer()
                      ? 'bg-yellow-500/20 border border-yellow-500/50'
                      : 'bg-green-500/20 border border-green-500/50'
                  }`}>
                    <Crown size={24} className={
                      isVencido()
                        ? 'text-red-400'
                        : isProximoDeVencer()
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    } />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-400 font-medium">Plano Atual</p>
                    <h3 className={`text-2xl font-black ${
                      isVencido()
                        ? 'text-red-400'
                        : isProximoDeVencer()
                        ? 'text-yellow-400'
                        : 'text-green-400'
                    }`}>
                      {planosConfig.find(p => p.id === userData.plano)?.nome}
                    </h3>
                  </div>
                </div>

                {/* Barra de Progresso de Ofertas */}
                {getLimiteAtual() !== -1 && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300">Ofertas Disponíveis</span>
                      <span className="text-sm font-bold text-white">
                        {getTotalOfertasDisponiveis() - getOfertasUsadas()} / {getTotalOfertasDisponiveis()}
                      </span>
                    </div>
                    <div className="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out ${
                          (getOfertasUsadas() / getTotalOfertasDisponiveis()) >= 0.9
                            ? 'bg-gradient-to-r from-red-500 to-red-600'
                            : (getOfertasUsadas() / getTotalOfertasDisponiveis()) >= 0.7
                            ? 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                            : 'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ 
                          width: `${Math.min((getOfertasUsadas() / getTotalOfertasDisponiveis()) * 100, 100)}%`,
                          boxShadow: `0 0 10px ${
                            (getOfertasUsadas() / getTotalOfertasDisponiveis()) >= 0.9
                              ? 'rgba(239, 68, 68, 0.5)'
                              : (getOfertasUsadas() / getTotalOfertasDisponiveis()) >= 0.7
                              ? 'rgba(234, 179, 8, 0.5)'
                              : 'rgba(34, 197, 94, 0.5)'
                          }`
                        }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" style={{ width: '50%' }}></div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      {getTotalOfertasDisponiveis() - getOfertasUsadas()} ofertas restantes este mês
                    </p>
                  </div>
                )}

                {getLimiteAtual() === -1 && (
                  <div className="mb-6 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/20 border border-purple-500/50 rounded-full">
                      <Zap size={18} className="text-purple-400" />
                      <span className="text-sm font-bold text-purple-300">Ofertas Ilimitadas</span>
                    </div>
                  </div>
                )}

                {/* Data de Vencimento */}
                {userData.plano !== 'basico' && userData.dataProximoPagamento && (
                  <div className={`flex items-center justify-center gap-3 px-4 py-3 rounded-xl border-2 ${
                    isVencido()
                      ? 'bg-red-500/10 border-red-500/50'
                      : isProximoDeVencer()
                      ? 'bg-yellow-500/10 border-yellow-500/50'
                      : 'bg-blue-500/10 border-blue-500/50'
                  }`}>
                    <Calendar size={20} className={
                      isVencido()
                        ? 'text-red-400'
                        : isProximoDeVencer()
                        ? 'text-yellow-400'
                        : 'text-blue-400'
                    } />
                    <div className="flex-1">
                      <p className={`text-xs font-medium ${
                        isVencido()
                          ? 'text-red-400'
                          : isProximoDeVencer()
                          ? 'text-yellow-400'
                          : 'text-blue-400'
                      }`}>
                        {isVencido() ? 'Vencido em' : isProximoDeVencer() ? 'Vence em breve' : 'Próximo vencimento'}
                      </p>
                      <p className={`text-sm font-bold ${
                        isVencido()
                          ? 'text-red-300'
                          : isProximoDeVencer()
                          ? 'text-yellow-300'
                          : 'text-blue-300'
                      }`}>
                        {isVencido() ? (
                          <>
                            <AlertTriangle size={14} className="inline mr-1" />
                            {format(getDataVencimento()!, 'dd/MM/yyyy', { locale: ptBR })}
                          </>
                        ) : (
                          format(getDataVencimento()!, 'dd/MM/yyyy', { locale: ptBR })
                        )}
                      </p>
                    </div>
                  </div>
                )}

                {userData.cancelamentoAgendado && (
                  <div className="mt-6 px-4 py-3 rounded-xl border border-yellow-500/40 bg-yellow-500/10 text-yellow-100 text-center">
                    <p className="font-semibold">
                      Renovação automática cancelada
                    </p>
                    <p className="text-sm mt-1">
                      O plano permanecerá ativo até {dataCancelamentoTexto || 'o fim do ciclo atual'}. Após essa data, você voltará automaticamente para o Plano Básico.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {userData.plano !== 'basico' && (
              <div className="w-full max-w-3xl">
                <div className="bg-red-500/10 border border-red-500/40 rounded-2xl p-6 backdrop-blur-sm">
                  <h3 className="text-lg font-bold text-red-200 mb-2 flex items-center gap-2">
                    <AlertTriangle size={20} />
                    Cancelar plano atual
                  </h3>
                  <p className="text-sm text-red-100 mb-4">
                    Ao cancelar, você voltará imediatamente para o Plano Básico (grátis) e perderá os benefícios do plano atual.
                    Se estiver em uma assinatura automática, a cobrança será interrompida no Mercado Pago.
                  </p>
                  <button
                    onClick={handleCancelarPlano}
                    disabled={cancelandoPlano}
                    className="w-full md:w-auto px-5 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {cancelandoPlano ? (
                      <>
                        <Loader size={18} className="animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        Cancelar plano e voltar para o Básico
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FAQ */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-3xl shadow-xl p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-white mb-6 text-center">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-white mb-2">🔄 Como funciona a cobrança?</h3>
              <p className="text-gray-300">
                <strong>Para pagamento via cartão de crédito:</strong> A renovação é totalmente automática! 
                Você aprova a assinatura uma vez e a cobrança é feita automaticamente todo mês no mesmo dia. 
                Não precisa se preocupar em renovar manualmente. <strong>Para pagamento via PIX:</strong> 
                Cada mês você precisa realizar um novo pagamento manualmente. <strong>Quando o plano vencer:</strong> 
                Ele será automaticamente convertido para o plano Básico (gratuito) com limite de 20 ofertas/mês. 
                Você pode cancelar sua assinatura a qualquer momento nas configurações.
              </p>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">📊 O que acontece se eu exceder o limite?</h3>
              <p className="text-gray-300">Você não poderá fazer novas ofertas até o próximo mês ou até fazer upgrade do plano.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">💳 Quais formas de pagamento aceitam?</h3>
              <p className="text-gray-300">Aceitamos cartão de crédito, PIX e boleto através do Mercado Pago.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-white mb-2">🔼 Posso fazer upgrade a qualquer momento?</h3>
              <p className="text-gray-300">Sim! Você pode fazer upgrade imediatamente e o valor será proporcional.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



