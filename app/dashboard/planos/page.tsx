'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAssinatura, LIMITES_PLANOS, PRECOS_PLANOS } from '@/types';
import { Check, Zap, Crown, Gem, ArrowRight, Loader } from 'lucide-react';
import { doc, updateDoc, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function PlanosPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAssinatura | null>(null);

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

  const handleSelecionarPlano = async (plano: PlanoAssinatura) => {
    if (!userData) return;

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
    setPlanoSelecionado(plano);
    router.push(`/dashboard/checkout?plano=${plano}`);
  };

  const getOfertasUsadas = () => {
    const mesAtual = new Date().toISOString().slice(0, 7);
    if (userData?.mesReferenciaOfertas === mesAtual) {
      return userData.ofertasUsadas || 0;
    }
    return 0;
  };

  const getLimiteAtual = () => {
    if (!userData?.plano) return LIMITES_PLANOS.basico;
    return LIMITES_PLANOS[userData.plano];
  };

  if (!userData || userData.tipo !== 'autopeca') {
    return null;
  }

  return (
    <div className="min-h-screen relative py-12 px-4 overflow-hidden">
      {/* Fundo azul claro com flares neon */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 via-cyan-500 to-sky-400">
        {/* Flare neon 1 - Diagonal superior esquerda */}
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-400 opacity-30 blur-[120px] transform rotate-45 -translate-x-1/3 -translate-y-1/3"></div>
        
        {/* Flare neon 2 - Diagonal centro */}
        <div className="absolute top-1/2 left-1/2 w-[500px] h-[500px] bg-blue-400 opacity-25 blur-[100px] transform rotate-45 -translate-x-1/2 -translate-y-1/2"></div>
        
        {/* Flare neon 3 - Diagonal inferior direita */}
        <div className="absolute bottom-0 right-0 w-[700px] h-[700px] bg-cyan-300 opacity-20 blur-[140px] transform rotate-45 translate-x-1/3 translate-y-1/3"></div>
        
        {/* Flare neon 4 - Diagonal superior direita */}
        <div className="absolute top-20 right-20 w-[400px] h-[400px] bg-blue-300 opacity-25 blur-[90px] transform rotate-12"></div>
        
        {/* Flare neon 5 - Diagonal inferior esquerda */}
        <div className="absolute bottom-20 left-20 w-[450px] h-[450px] bg-cyan-500 opacity-20 blur-[110px] transform -rotate-12"></div>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-black text-white mb-4 drop-shadow-lg">
            Escolha seu Plano
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto drop-shadow-md">
            Potencialize suas vendas com o plano ideal para o seu negócio
          </p>
          
          {userData.plano && (
            <div className="mt-6 inline-block px-6 py-3 bg-green-100/95 border-2 border-green-500 rounded-full backdrop-blur-sm">
              <p className="text-green-800 font-bold">
                Plano Atual: {planosConfig.find(p => p.id === userData.plano)?.nome} • 
                {getLimiteAtual() === -1 ? ' Ilimitado' : ` ${getOfertasUsadas()}/${getLimiteAtual()} ofertas usadas`}
              </p>
            </div>
          )}
        </div>

        {/* Cards de Planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {planosConfig.map((plano) => {
            const Icon = plano.icone;
            const isPlanoAtual = userData.plano === plano.id;
            
            return (
              <div
                key={plano.id}
                className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden transform transition-all duration-300 hover:scale-105 ${
                  plano.destaque ? `ring-4 ${plano.corBorda} scale-105` : ''
                } ${isPlanoAtual ? 'ring-4 ring-green-500' : ''}`}
              >
                {plano.destaque && (
                  <div className={`absolute top-0 right-0 bg-gradient-to-r ${plano.cor} text-white px-4 py-1 text-xs font-bold rounded-bl-lg`}>
                    MAIS POPULAR
                  </div>
                )}
                
                {isPlanoAtual && (
                  <div className="absolute top-0 left-0 bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-1 text-xs font-bold rounded-br-lg">
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
                    disabled={loading || isPlanoAtual}
                    className={`w-full py-3 px-6 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                      isPlanoAtual
                        ? 'bg-gray-400 cursor-not-allowed'
                        : `bg-gradient-to-r ${plano.cor} hover:shadow-2xl transform hover:-translate-y-1`
                    }`}
                  >
                    {loading ? (
                      <Loader size={20} className="animate-spin" />
                    ) : isPlanoAtual ? (
                      'Plano Ativo'
                    ) : (
                      <>
                        {plano.preco === 0 ? 'Ativar Grátis' : 'Assinar Agora'}
                        <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-6 text-center">
            Perguntas Frequentes
          </h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">🔄 Como funciona a cobrança?</h3>
              <p className="text-gray-600 dark:text-gray-200">A cobrança é mensal e renovada automaticamente. Você pode cancelar a qualquer momento.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">📊 O que acontece se eu exceder o limite?</h3>
              <p className="text-gray-600 dark:text-gray-200">Você não poderá fazer novas ofertas até o próximo mês ou até fazer upgrade do plano.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">💳 Quais formas de pagamento aceitam?</h3>
              <p className="text-gray-600 dark:text-gray-200">Aceitamos cartão de crédito, PIX e boleto através do Mercado Pago.</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">🔼 Posso fazer upgrade a qualquer momento?</h3>
              <p className="text-gray-600 dark:text-gray-200">Sim! Você pode fazer upgrade imediatamente e o valor será proporcional.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



