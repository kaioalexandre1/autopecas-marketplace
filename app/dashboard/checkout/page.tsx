'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAssinatura, PRECOS_PLANOS } from '@/types';
import { CreditCard, ArrowLeft, Loader, CheckCircle, QrCode } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, Timestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [pagamentoAprovado, setPagamentoAprovado] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [linkPagamento, setLinkPagamento] = useState('');
  const [pixCopiaECola, setPixCopiaECola] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [escutandoAtivacao, setEscutandoAtivacao] = useState(false);

  const planoParam = searchParams?.get('plano') as PlanoAssinatura | null;
  const plano = planoParam || 'premium';
  const valor = PRECOS_PLANOS[plano];

  const planosInfo: Record<PlanoAssinatura, { nome: string; limite: string }> = {
    basico: { nome: 'Básico', limite: '20 ofertas/mês' },
    premium: { nome: 'Premium', limite: '100 ofertas/mês' },
    gold: { nome: 'Gold', limite: '200 ofertas/mês' },
    platinum: { nome: 'Platinum', limite: 'Ofertas ilimitadas' },
  };

  useEffect(() => {
    if (!userData || userData.tipo !== 'autopeca') {
      router.push('/dashboard');
    }
  }, [userData, router]);

  const simularPagamentoPix = async () => {
    setProcessando(true);
    
    // Simular chamada à API do Mercado Pago
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Gerar códigos simulados
    const pixSimulado = `00020126580014br.gov.bcb.pix0136${userData?.id || 'teste'}_${Date.now()}520400005303986540${valor.toFixed(2)}5802BR5913AUTOPECAS6009SAO PAULO62070503***6304${Math.random().toString(36).substring(7).toUpperCase()}`;
    setPixCopiaECola(pixSimulado);
    setLinkPagamento(`https://www.mercadopago.com.br/payments/${Date.now()}`);
    
    setProcessando(false);
    return pixSimulado;
  };

  const handleConfirmarPagamento = async () => {
    if (!userData) return;

    setLoading(true);
    
    try {
      // Chamar API real
      const resp = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo: metodoPagamento,
          plano,
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          email: userData?.email || `${userData.id}@example.com`,
        }),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        console.error('Erro checkout MP:', data);
        throw new Error(data?.details?.message || data?.error || 'Falha ao iniciar pagamento');
      }

      // Definir valores antes de criar o registro
      if (data.method === 'pix') {
        setPixCopiaECola(data.qr);
        setPaymentId(String(data.paymentId));
        
        // Criar registro de pagamento COM os valores corretos
        await addDoc(collection(db, 'pagamentos'), {
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          plano,
          valor,
          metodoPagamento: 'mercadopago',
          statusPagamento: 'pendente',
          pixCopiaECola: data.qr,
          mercadoPagoId: String(data.paymentId),
          external_reference: `${userData.id}|${plano}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else {
        const link = data.init_point || data.sandbox_init_point;
        setLinkPagamento(link);
        
        // Criar registro de pagamento para checkout
        await addDoc(collection(db, 'pagamentos'), {
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          plano,
          valor,
          metodoPagamento: 'cartao',
          statusPagamento: 'pendente',
          linkPagamento: link,
          external_reference: `${userData.id}|${plano}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        // Abrir automaticamente o checkout em nova aba
        try { window.open(link, '_blank'); } catch {}
      }

      // Criar assinatura
      const dataInicio = new Date();
      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 1);

      await addDoc(collection(db, 'assinaturas'), {
        autopecaId: userData.id,
        autopecaNome: userData.nome,
        plano,
        valor,
        status: 'pendente',
        dataInicio: Timestamp.fromDate(dataInicio),
        dataFim: Timestamp.fromDate(dataFim),
        renovacaoAutomatica: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

      toast.success('Aguardando confirmação do pagamento...');
      // Importante: a ativação do plano acontecerá somente após a confirmação real
      // do pagamento (via webhook do Mercado Pago atualizando o status no Firestore).
      
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Polling para verificar status do pagamento (fallback do webhook)
  useEffect(() => {
    if (!paymentId || !userData || escutandoAtivacao) return;

    setEscutandoAtivacao(true);
    let pollInterval: NodeJS.Timeout;
    let listenerUnsub: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (5 segundos * 60)

    // 1. Listener do Firestore (mais rápido se webhook funcionar)
    console.log(`[Checkout] Iniciando listener do Firestore para usuário ${userData.id}`);
    listenerUnsub = onSnapshot(doc(db, 'users', userData.id), (snap) => {
      const data: any = snap.data();
      console.log(`[Checkout] Listener Firestore - dados atualizados:`, {
        assinaturaAtiva: data?.assinaturaAtiva,
        plano: data?.plano,
        esperado: plano
      });
      
      if (data?.assinaturaAtiva && data?.plano === plano) {
        console.log(`[Checkout] ✅ Listener detectou plano ativo!`);
        setPagamentoAprovado(true);
        toast.success('🎉 Pagamento aprovado! Seu plano foi ativado!');
        if (pollInterval) clearInterval(pollInterval);
        if (listenerUnsub) listenerUnsub();
        setTimeout(() => router.push('/dashboard'), 2000);
      }
    }, (error) => {
      console.error('[Checkout] Erro no listener do Firestore:', error);
    });

    // 2. Polling via API (verificar status diretamente no Mercado Pago)
    const verificarPagamento = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        toast.error('Tempo de espera excedido. Verifique o status do pagamento manualmente.');
        return;
      }

      try {
        console.log(`[Checkout] Verificando pagamento ${paymentId} (tentativa ${attempts}/${maxAttempts})`);
        
        const resp = await fetch(`/api/mercadopago/status?paymentId=${paymentId}&autopecaId=${userData.id}&plano=${plano}`);
        
        if (!resp.ok) {
          console.error(`[Checkout] Erro na API: ${resp.status} ${resp.statusText}`);
          return;
        }
        
        const data = await resp.json();
        console.log(`[Checkout] Status do pagamento:`, data);
        
        if (data.ok && data.status === 'approved') {
          console.log(`[Checkout] Pagamento aprovado! Verificando se plano foi ativado...`);
          
          // Se o endpoint já ativou o plano (data.activated === true), aguardar e verificar
          if (data.activated) {
            console.log(`[Checkout] Plano ativado pelo endpoint. Verificando Firestore...`);
            // Aguardar um pouco para o Firestore sincronizar
            setTimeout(async () => {
              try {
                const userRef = doc(db, 'users', userData.id);
                const userDoc = await getDoc(userRef);
                const userDataCheck: any = userDoc.data();
                
                console.log(`[Checkout] Dados do usuário no Firestore:`, {
                  assinaturaAtiva: userDataCheck?.assinaturaAtiva,
                  plano: userDataCheck?.plano,
                  esperado: plano
                });
                
                if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
                  console.log(`[Checkout] ✅ Plano confirmado ativo! Redirecionando...`);
                  setPagamentoAprovado(true);
                  toast.success('🎉 Pagamento aprovado! Seu plano foi ativado!');
                  if (pollInterval) clearInterval(pollInterval);
                  if (listenerUnsub) listenerUnsub();
                  setTimeout(() => router.push('/dashboard'), 2000);
                } else {
                  console.warn(`[Checkout] ⚠️ Plano ainda não está ativo no Firestore. Aguardando listener...`);
                }
              } catch (err) {
                console.error(`[Checkout] Erro ao verificar Firestore:`, err);
              }
            }, 1000);
          } else {
            // Pagamento aprovado mas plano ainda não ativado (endpoint deve ter ativado agora)
            console.log(`[Checkout] Pagamento aprovado mas plano não foi ativado ainda. Aguardando webhook/listener...`);
            // O listener do Firestore vai pegar a mudança
            // Aguardar um pouco mais para garantir
          }
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          console.log(`[Checkout] ❌ Pagamento ${data.status}`);
          clearInterval(pollInterval);
          if (listenerUnsub) listenerUnsub();
          toast.error('Pagamento foi rejeitado ou cancelado.');
        } else if (data.status === 'pending') {
          console.log(`[Checkout] ⏳ Pagamento ainda pendente...`);
        } else {
          console.log(`[Checkout] ⚠️ Status desconhecido: ${data.status}`);
        }
      } catch (error) {
        console.error('[Checkout] Erro ao verificar pagamento:', error);
        // Não parar o polling por causa de um erro temporário
      }
    };

    // Verificar imediatamente e depois a cada 5 segundos
    verificarPagamento();
    pollInterval = setInterval(verificarPagamento, 5000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (listenerUnsub) listenerUnsub();
    };
  }, [paymentId, userData, plano, escutandoAtivacao, router]);

  if (!userData || userData.tipo !== 'autopeca') {
    return null;
  }

  if (pagamentoAprovado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md">
          <div className="mb-6">
            <CheckCircle size={80} className="text-green-500 mx-auto" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-4">
            Pagamento Aprovado!
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Seu plano {planosInfo[plano].nome} foi ativado com sucesso!
          </p>
          <p className="text-sm text-gray-500">
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Botão Voltar */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold mb-6"
        >
          <ArrowLeft size={20} />
          Voltar para planos
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Resumo do Plano */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Resumo do Pedido
            </h2>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Plano {planosInfo[plano].nome}
              </h3>
              <p className="text-gray-600 mb-4">{planosInfo[plano].limite}</p>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Valor mensal:</span>
                <span className="text-3xl font-black text-gray-900">
                  R$ {valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>Renovação automática mensal</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>Cancele a qualquer momento</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>Suporte via chat</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-green-500" />
                <span>Sem taxas adicionais</span>
              </div>
            </div>
          </div>

          {/* Forma de Pagamento */}
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <h2 className="text-2xl font-black text-gray-900 mb-6">
              Forma de Pagamento
            </h2>

            {!pixCopiaECola ? (
              <>
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => setMetodoPagamento('pix')}
                    className={`w-full p-4 rounded-xl border-2 font-semibold flex items-center gap-3 transition-all ${
                      metodoPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <QrCode size={24} />
                    <div className="text-left">
                      <div>PIX</div>
                      <div className="text-xs text-gray-500">Aprovação instantânea</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMetodoPagamento('cartao')}
                    className={`w-full p-4 rounded-xl border-2 font-semibold flex items-center gap-3 transition-all ${
                      metodoPagamento === 'cartao'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <CreditCard size={24} />
                    <div className="text-left">
                      <div>Cartão de Crédito</div>
                      <div className="text-xs text-gray-500">Parcelamento disponível</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setMetodoPagamento('boleto')}
                    className={`w-full p-4 rounded-xl border-2 font-semibold flex items-center gap-3 transition-all ${
                      metodoPagamento === 'boleto'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <CreditCard size={24} />
                    <div className="text-left">
                      <div>Boleto Bancário</div>
                      <div className="text-xs text-gray-500">Vencimento em 3 dias</div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={handleConfirmarPagamento}
                  disabled={loading || processando}
                  className="w-full py-4 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading || processando ? (
                    <>
                      <Loader size={24} className="animate-spin" />
                      Processando...
                    </>
                  ) : (
                    `Pagar R$ ${valor.toFixed(2).replace('.', ',')}`
                  )}
                </button>

                {/* Link do checkout (fallback para reabrir) */}
                {metodoPagamento !== 'pix' && linkPagamento && (
                  <div className="mt-6">
                    <a
                      href={linkPagamento}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-700 underline"
                    >
                      Reabrir checkout do Mercado Pago
                    </a>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-2xl p-6 text-center">
                  <QrCode size={48} className="text-green-600 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">
                    Pague com PIX
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Escaneie o QR Code ou copie o código PIX
                  </p>
                  
                  <div className="bg-white rounded-lg p-4 mb-4">
                    <div className="text-xs text-gray-500 break-all font-mono">
                      {pixCopiaECola}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(pixCopiaECola);
                      toast.success('Código PIX copiado!');
                    }}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
                  >
                    Copiar código PIX
                  </button>
                </div>

                <div className="text-center">
                  <Loader size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    Aguardando confirmação do pagamento...
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500 text-center">
              🔒 Pagamento processado com segurança pelo Mercado Pago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


