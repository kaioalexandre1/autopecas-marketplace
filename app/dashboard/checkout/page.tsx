'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAssinatura, PRECOS_PLANOS } from '@/types';
import { CreditCard, ArrowLeft, Loader, CheckCircle, QrCode } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, Timestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import toast from 'react-hot-toast';
import SecureCardForm from '@/components/SecureCardForm';
import { getMercadoPagoInstance, getDeviceId } from '@/lib/mercadopago';

export default function CheckoutPage() {
  const { userData } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [pagamentoAprovado, setPagamentoAprovado] = useState(false);
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao'>('pix');
  const [linkPagamento, setLinkPagamento] = useState('');
  const [pixCopiaECola, setPixCopiaECola] = useState('');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [escutandoAtivacao, setEscutandoAtivacao] = useState(false);
  const [usandoSecureFields, setUsandoSecureFields] = useState(false); // Nova opção para Secure Fields
  const [processandoSecureFields, setProcessandoSecureFields] = useState(false);

  const planoParam = searchParams?.get('plano') as PlanoAssinatura | null;
  const isTestePlatinum = searchParams?.get('teste') === '1';
  const isOfertasExtras = searchParams?.get('ofertasExtras') === '1';
  const plano = planoParam || 'premium';
  // Se for teste do Platinum, cobrar R$ 1,00 ao invés de R$ 990,00
  // Se for ofertas extras, cobrar R$ 29,90
  const valor = isOfertasExtras ? 29.90 : (isTestePlatinum && plano === 'platinum' ? 1.00 : PRECOS_PLANOS[plano]);

  const planosInfo: Record<PlanoAssinatura, { nome: string; limite: string }> = {
    basico: { nome: 'Básico', limite: '20 ofertas/mês' },
    premium: { nome: 'Silver', limite: '100 ofertas/mês' },
    gold: { nome: 'Gold', limite: '200 ofertas/mês' },
    platinum: { nome: 'Platinum', limite: 'Ofertas ilimitadas' },
  };

  useEffect(() => {
    if (!userData || userData.tipo !== 'autopeca') {
      router.push('/dashboard');
    }
  }, [userData, router]);

  // Estado para armazenar instância do MercadoPago
  const [mpInstance, setMpInstance] = useState<any>(null);

  // Inicializar MercadoPago SDK V2 quando o componente carregar
  // Usar o utilitário global para garantir inicialização correta
  useEffect(() => {
    getMercadoPagoInstance()
      .then((instance) => {
        setMpInstance(instance);
        console.log('✅ MercadoPago.JS V2 SDK inicializado com sucesso no checkout');
      })
      .catch((error) => {
        console.error('❌ Erro ao inicializar MercadoPago SDK:', error);
      });
  }, []);

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

  // Função para obter Device ID do MercadoPago SDK V2
  // Usar o utilitário global para garantir coleta correta do device_id
  const obterDeviceId = async (): Promise<string | null> => {
    try {
      const deviceId = await getDeviceId();
      return deviceId;
    } catch (error) {
      console.error('Erro ao obter device_id:', error);
      return null;
    }
  };

  // Função para extrair primeiro e último nome
  const extrairNomeCompleto = (nomeCompleto: string) => {
    const partes = nomeCompleto.trim().split(' ');
    const firstName = partes[0] || '';
    const lastName = partes.slice(1).join(' ') || '';
    return { firstName, lastName };
  };

  // Flag para garantir que o toast apareça apenas uma vez
  const toastAprovadoRef = useRef(false);

  // Função centralizada para notificar pagamento aprovado
  const notificarPagamentoAprovado = () => {
    // Garantir que o toast apareça apenas uma vez
    if (toastAprovadoRef.current) {
      return;
    }
    toastAprovadoRef.current = true;

    // Mostrar toast apenas uma vez
    toast.success('🎉 Pagamento aprovado! Seu plano foi ativado!', { 
      duration: 3000,
      id: 'pagamento-aprovado-unico'
    });

    // Fazer refresh forçado após 1 segundo para mostrar o plano atualizado
    setTimeout(() => {
      console.log('🔄 Fazendo refresh forçado da página...');
      window.location.reload(); // F5 forçado
    }, 1000);
  };

  // Função para iniciar verificação de pagamento (usada por PIX e Secure Fields)
  const iniciarVerificacaoPagamento = (paymentIdToCheck: string) => {
    if (!userData || escutandoAtivacao) return;
    setEscutandoAtivacao(true);
    setUsandoSecureFields(false); // Esconder formulário Secure Fields após iniciar verificação
    toastAprovadoRef.current = false; // Resetar flag quando iniciar nova verificação

    let pollInterval: NodeJS.Timeout;
    let listenerUnsub: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 120; // 10 minutos (120 * 5s)

    // 1. Listener Firestore (real-time)
    const userRef = doc(db, 'users', userData.id);
    getDoc(userRef).then((currentSnap) => {
      const currentData: any = currentSnap.data();
      if (currentData?.assinaturaAtiva && currentData?.plano === plano) {
        console.log(`[Checkout] ✅ Plano já está ativo!`);
        setPagamentoAprovado(true);
        notificarPagamentoAprovado();
        return;
      }
    });

    listenerUnsub = onSnapshot(userRef, (snap) => {
      const data: any = snap.data();
      if (data?.assinaturaAtiva && data?.plano === plano) {
        console.log(`[Checkout] ✅ Listener detectou plano ativo!`);
        setPagamentoAprovado(true);
        if (pollInterval) clearInterval(pollInterval);
        if (listenerUnsub) {
          listenerUnsub();
          listenerUnsub = null;
        }
        notificarPagamentoAprovado();
        setEscutandoAtivacao(false);
      }
    });

    // 2. Polling via API
    const verificarPagamento = async () => {
      attempts++;
      if (attempts > maxAttempts) {
        clearInterval(pollInterval);
        if (listenerUnsub) listenerUnsub();
        toast.error('Tempo de espera excedido. Verifique o status do pagamento manualmente.');
        setEscutandoAtivacao(false);
        return;
      }

      try {
        const resp = await fetch(`/api/mercadopago/status?paymentId=${paymentIdToCheck}&autopecaId=${userData.id}&plano=${plano}`);
        if (!resp.ok) return;

        const data = await resp.json();
        if (data.ok && data.status === 'approved') {
          // Verificar se plano foi ativado
          const userDoc = await getDoc(userRef);
          const userDataCheck: any = userDoc.data();
          if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
            clearInterval(pollInterval);
            if (listenerUnsub) listenerUnsub();
            setPagamentoAprovado(true);
            notificarPagamentoAprovado();
            setEscutandoAtivacao(false);
          }
        } else if (data.status === 'rejected' || data.status === 'cancelled') {
          clearInterval(pollInterval);
          if (listenerUnsub) listenerUnsub();
          toast.error('Pagamento foi rejeitado ou cancelado.');
          setEscutandoAtivacao(false);
        }
      } catch (error) {
        console.error('[Checkout] Erro ao verificar pagamento:', error);
      }
    };

    verificarPagamento();
    pollInterval = setInterval(verificarPagamento, 5000);
  };

  const handleConfirmarPagamento = async () => {
    if (!userData) return;

    setLoading(true);
    
    try {
      console.log('[Checkout] 🚀 Iniciando processo de pagamento...');
      console.log('[Checkout] Método:', metodoPagamento);
      console.log('[Checkout] É Ofertas Extras?', isOfertasExtras);
      console.log('[Checkout] Plano:', plano);
      console.log('[Checkout] User ID:', userData.id);
      
      // Obter device_id do SDK MercadoPago (agora é async)
      const deviceId = await obterDeviceId();
      console.log('[Checkout] Device ID:', deviceId || 'será coletado automaticamente pelo SDK V2');
      
      // Extrair primeiro e último nome
      const { firstName, lastName } = extrairNomeCompleto(userData.nome);
      console.log('[Checkout] Nome completo:', { firstName, lastName });
      
      // Se for ofertas extras, usar API específica
      if (isOfertasExtras) {
        console.log('[Checkout] 📤 Enviando requisição para /api/mercadopago/ofertas-extras...');
        const resp = await fetch('/api/mercadopago/ofertas-extras', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            autopecaId: userData.id,
            autopecaNome: userData.nome,
            email: userData?.email || `${userData.id}@example.com`,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            deviceId: deviceId || undefined,
          }),
        });

        const data = await resp.json();

        if (!resp.ok || !data.ok) {
          console.error('[Checkout] ❌ Erro ao criar pagamento de ofertas extras:', data);
          const errorMessage = data?.message || data?.details?.message || data?.error || 'Falha ao criar pagamento';
          toast.error(errorMessage);
          setLoading(false);
          return;
        }

        console.log('[Checkout] ✅ Pagamento PIX de ofertas extras criado:', data);
        const paymentIdStr = String(data.paymentId);
        setPixCopiaECola(data.qr);
        setPaymentId(paymentIdStr);

        // Criar registro de pagamento
        await addDoc(collection(db, 'pagamentos'), {
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          tipo: 'ofertas_extras',
          quantidadeOfertas: 10,
          valor: 29.90,
          metodoPagamento: 'pix',
          statusPagamento: 'pendente',
          pixCopiaECola: data.qr,
          mercadoPagoId: paymentIdStr,
          external_reference: `${userData.id}|ofertas_extras|${Date.now()}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        toast.success('PIX gerado! Aguarde a confirmação...');
        setLoading(false);
        
        // Iniciar verificação do pagamento
        iniciarVerificacaoOfertasExtras(paymentIdStr);
        return;
      }
      
      // Chamar API real para planos normais
      console.log('[Checkout] 📤 Enviando requisição para /api/mercadopago/checkout...');
      const resp = await fetch('/api/mercadopago/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metodo: metodoPagamento,
          plano,
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          email: userData?.email || `${userData.id}@example.com`,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          deviceId: deviceId || undefined,
          isTestePlatinum: isTestePlatinum && plano === 'platinum', // Flag para teste
          valor: valor, // Enviar valor específico (pode ser 1.00 para teste)
        }),
      });
      
      console.log('[Checkout] 📥 Resposta recebida. Status:', resp.status, resp.statusText);
      
      const data = await resp.json();
      console.log('[Checkout] 📦 Dados da resposta:', data);
      
      if (!resp.ok || !data.ok) {
        console.error('[Checkout] ❌ Erro checkout MP:', data);
        console.error('[Checkout] Status HTTP:', resp.status);
        console.error('[Checkout] Response OK:', resp.ok);
        console.error('[Checkout] Data OK:', data.ok);
        
        const errorMessage = data?.message || data?.details?.message || data?.error || 'Falha ao iniciar pagamento';
        const errorDetails = data?.details?.cause || data?.cause || [];
        
        // Mensagem mais detalhada para o usuário
        let mensagemUsuario = errorMessage;
        if (Array.isArray(errorDetails) && errorDetails.length > 0) {
          const detalhes = errorDetails.map((c: any) => c?.description || c?.message || JSON.stringify(c)).join(', ');
          mensagemUsuario = `${errorMessage}. Detalhes: ${detalhes}`;
        }
        
        console.error('[Checkout] ❌ Mensagem de erro final:', mensagemUsuario);
        toast.error(mensagemUsuario);
        setLoading(false);
        return;
      }

      // Definir valores antes de criar o registro
      if (data.method === 'pix') {
        const paymentIdStr = String(data.paymentId);
        console.log(`[Checkout] ✅ PIX criado com sucesso! Payment ID: ${paymentIdStr}`);
        setPixCopiaECola(data.qr);
        setPaymentId(paymentIdStr);
        
        // Criar registro de pagamento COM os valores corretos
        await addDoc(collection(db, 'pagamentos'), {
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          plano,
          valor,
          metodoPagamento: 'pix',
          statusPagamento: 'pendente',
          pixCopiaECola: data.qr,
          mercadoPagoId: String(data.paymentId),
          external_reference: `${userData.id}|${plano}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      } else if (data.method === 'subscription') {
        // Assinatura recorrente criada - redirecionar para página de aprovação
        console.log(`[Checkout] ✅ Assinatura criada com sucesso! Subscription ID: ${data.subscriptionId}`);
        
        // Salvar subscriptionId no Firestore
        await addDoc(collection(db, 'pagamentos'), {
          autopecaId: userData.id,
          autopecaNome: userData.nome,
          plano,
          valor,
          metodoPagamento: 'cartao',
          statusPagamento: 'pendente',
          mercadoPagoId: String(data.subscriptionId),
          subscriptionId: String(data.subscriptionId),
          external_reference: `${userData.id}|${plano}`,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Redirecionar para página de aprovação da assinatura
        const initPoint = data.init_point || data.sandbox_init_point;
        if (initPoint) {
          console.log('🔗 Redirecionando para:', initPoint);
          toast.success('Redirecionando para aprovar assinatura...');
          // Pequeno delay para garantir que o toast apareça
          setTimeout(() => {
            window.location.href = initPoint;
          }, 500);
          return;
        } else {
          console.error('❌ Link de aprovação não encontrado na resposta:', data);
          toast.error('Erro: Link de aprovação não encontrado. Verifique o console para mais detalhes.');
        }
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
        
        // Criar assinatura para checkout tradicional (pagamento único)
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
          renovacaoAutomatica: false, // Checkout tradicional não é automático
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        toast.success('Aguardando confirmação do pagamento...');
      }

      // Para subscriptions, a assinatura será criada após aprovação via webhook
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
    if (!paymentId || !userData || escutandoAtivacao) {
      if (paymentId && userData) {
        console.log(`[Checkout] ⚠️ Polling não iniciado - paymentId: ${paymentId}, userData: ${userData?.id}, escutandoAtivacao: ${escutandoAtivacao}`);
      }
      return;
    }

    console.log(`[Checkout] 🚀 Iniciando polling para paymentId: ${paymentId}, plano: ${plano}`);
    setEscutandoAtivacao(true);
    toastAprovadoRef.current = false; // Resetar flag quando iniciar nova verificação
    let pollInterval: NodeJS.Timeout;
    let listenerUnsub: (() => void) | null = null;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutos (5 segundos * 60)

    // 1. Listener do Firestore (mais rápido se webhook funcionar)
    console.log(`[Checkout] Iniciando listener do Firestore para usuário ${userData.id}, aguardando plano: ${plano}`);
    
    // Verificar estado atual antes de iniciar o listener
    const userRef = doc(db, 'users', userData.id);
    getDoc(userRef).then((currentSnap) => {
      const currentData: any = currentSnap.data();
      console.log(`[Checkout] Estado inicial do usuário:`, {
        assinaturaAtiva: currentData?.assinaturaAtiva,
        plano: currentData?.plano,
        esperado: plano
      });
      
      // Se já estiver ativo, não precisa iniciar o listener
      if (currentData?.assinaturaAtiva && currentData?.plano === plano) {
        console.log(`[Checkout] ✅ Plano já está ativo!`);
        setPagamentoAprovado(true);
        notificarPagamentoAprovado();
        if (pollInterval) clearInterval(pollInterval);
        return;
      }
    });
    
    listenerUnsub = onSnapshot(userRef, (snap) => {
      const data: any = snap.data();
      console.log(`[Checkout] 🔔 Listener Firestore - mudança detectada:`, {
        assinaturaAtiva: data?.assinaturaAtiva,
        plano: data?.plano,
        esperado: plano,
        match: data?.assinaturaAtiva && data?.plano === plano
      });
      
      // Verificar se o plano foi ativado (mais flexível)
      const planoAtivo = data?.assinaturaAtiva === true;
      const planoCorreto = data?.plano === plano;
      
      if (planoAtivo && planoCorreto) {
        console.log(`[Checkout] ✅✅✅ Listener detectou plano ativo! Atualizando estado e redirecionando...`);
        
        // Atualizar estado primeiro
        setPagamentoAprovado(true);
        
        // Parar polling e listener IMEDIATAMENTE
        if (pollInterval) {
          clearInterval(pollInterval);
          pollInterval = undefined as any;
        }
        if (listenerUnsub) {
          listenerUnsub();
          listenerUnsub = null;
        }
        
        // Notificar pagamento aprovado (mostra toast apenas uma vez e faz refresh)
        notificarPagamentoAprovado();
        
        // Retornar para não continuar executando
        return;
      } else {
        console.log(`[Checkout] ⏳ Plano ainda não está ativo. Aguardando...`, {
          assinaturaAtiva: planoAtivo,
          planoCorreto,
          planoAtual: data?.plano,
          planoEsperado: plano
        });
      }
    }, (error) => {
      console.error('[Checkout] ❌ Erro no listener do Firestore:', error);
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
          console.log(`[Checkout] ✅ Pagamento aprovado! Status:`, data);
          
          // Se o endpoint ativou o plano agora
          if (data.activated) {
            console.log(`[Checkout] Plano foi ativado pelo endpoint. Aguardando Firestore sincronizar...`);
            
            // Aguardar e verificar no Firestore
            setTimeout(async () => {
              try {
                const userRef = doc(db, 'users', userData.id);
                const userDoc = await getDoc(userRef);
                const userDataCheck: any = userDoc.data();
                
                console.log(`[Checkout] Verificando Firestore após ativação:`, {
                  assinaturaAtiva: userDataCheck?.assinaturaAtiva,
                  plano: userDataCheck?.plano,
                  esperado: plano
                });
                
                if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
                  console.log(`[Checkout] ✅✅✅ Plano confirmado ativo no Firestore!`);
                  setPagamentoAprovado(true);
                  if (pollInterval) {
                    clearInterval(pollInterval);
                    pollInterval = undefined as any;
                  }
                  if (listenerUnsub) {
                    listenerUnsub();
                    listenerUnsub = null;
                  }
                  notificarPagamentoAprovado();
                } else {
                  console.warn(`[Checkout] ⚠️ Firestore ainda não atualizou. Tentando novamente em 2 segundos...`);
                  // Tentar mais uma vez após 2 segundos
                  setTimeout(async () => {
                    const userDocRetry = await getDoc(userRef);
                    const userDataRetry: any = userDocRetry.data();
                    if (userDataRetry?.assinaturaAtiva && userDataRetry?.plano === plano) {
                      console.log(`[Checkout] ✅✅✅ Plano ativo no retry!`);
                      setPagamentoAprovado(true);
                      if (pollInterval) {
                        clearInterval(pollInterval);
                        pollInterval = undefined as any;
                      }
                      if (listenerUnsub) {
                        listenerUnsub();
                        listenerUnsub = null;
                      }
                      notificarPagamentoAprovado();
                    }
                  }, 2000);
                }
              } catch (err) {
                console.error(`[Checkout] Erro ao verificar Firestore:`, err);
              }
            }, 1500);
          } else {
            // Pagamento aprovado, mas plano pode já estar ativo ou será ativado
            // Verificar diretamente no Firestore
            console.log(`[Checkout] Pagamento aprovado. Verificando se plano já está ativo...`);
            try {
              const userRef = doc(db, 'users', userData.id);
              const userDoc = await getDoc(userRef);
              const userDataCheck: any = userDoc.data();
              
              if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
                console.log(`[Checkout] ✅✅✅ Plano já está ativo no Firestore!`);
                setPagamentoAprovado(true);
                if (pollInterval) {
                  clearInterval(pollInterval);
                  pollInterval = undefined as any;
                }
                if (listenerUnsub) {
                  listenerUnsub();
                  listenerUnsub = null;
                }
                notificarPagamentoAprovado();
                return; // Parar a execução aqui
              } else {
                console.log(`[Checkout] ⏳ Plano ainda não está ativo. Aguardando próximo ciclo de polling...`, {
                  assinaturaAtiva: userDataCheck?.assinaturaAtiva,
                  planoAtual: userDataCheck?.plano,
                  planoEsperado: plano
                });
              }
            } catch (err) {
              console.error(`[Checkout] Erro ao verificar Firestore:`, err);
            }
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
    
    // Verificação extra: a cada 2 segundos, verificar diretamente no Firestore se o plano foi ativado
    // Isso garante que mesmo se o listener falhar, ainda detectaremos
    let checkInterval: NodeJS.Timeout;
    checkInterval = setInterval(async () => {
      try {
        const userRefCheck = doc(db, 'users', userData.id);
        const userDocCheck = await getDoc(userRefCheck);
        const userDataCheck: any = userDocCheck.data();
        
        if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
          console.log(`[Checkout] ✅✅✅ Verificação extra detectou plano ativo!`);
          clearInterval(checkInterval);
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = undefined as any;
          }
          if (listenerUnsub) {
            listenerUnsub();
            listenerUnsub = null;
          }
          setPagamentoAprovado(true);
          notificarPagamentoAprovado();
        }
      } catch (err) {
        console.error(`[Checkout] Erro na verificação extra:`, err);
      }
    }, 2000);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (listenerUnsub) listenerUnsub();
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [paymentId, userData, plano, escutandoAtivacao, router]);

  if (!userData || userData.tipo !== 'autopeca') {
    return null;
  }

  if (pagamentoAprovado) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 text-center max-w-md border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <CheckCircle size={80} className="text-green-500 mx-auto" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">
            Pagamento Aprovado!
          </h1>
          <p className="text-lg text-gray-600 dark:text-white mb-6">
            {isOfertasExtras ? '+10 ofertas foram adicionadas com sucesso!' : `Seu plano ${planosInfo[plano].nome} foi ativado com sucesso!`}
          </p>
          <p className="text-sm text-gray-900 dark:text-gray-300">
            Redirecionando para o dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
              Resumo do Pedido
            </h2>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-600">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {isOfertasExtras ? '+10 Ofertas Extras' : `Plano ${planosInfo[plano].nome}`}
              </h3>
              <p className="text-gray-600 dark:text-white mb-4">
                {isOfertasExtras ? 'Recarga de ofertas para seu plano' : planosInfo[plano].limite}
              </p>
              <div className="flex justify-between items-center">
                <span className="text-gray-600 dark:text-white">{isOfertasExtras ? 'Valor:' : 'Valor mensal:'}</span>
                <span className="text-3xl font-black text-gray-900 dark:text-white">
                  R$ {valor.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-600 dark:text-white">
              {!isOfertasExtras && (
                <div className="flex items-center gap-2">
                  <CheckCircle size={16} className="text-green-500" />
                  <span>Renovação automática mensal</span>
                </div>
              )}
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">
              Forma de Pagamento
            </h2>

            {pixCopiaECola ? (
              // Tela de confirmação PIX
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-gray-700 dark:to-gray-700 rounded-2xl p-6 text-center border border-gray-200 dark:border-gray-600">
                  <QrCode size={48} className="text-green-600 dark:text-green-400 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                    Pague com PIX
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-white mb-4">
                    Escaneie o QR Code ou copie o código PIX
                  </p>
                  
                  <div className="bg-white dark:bg-gray-700 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-600">
                    <div className="text-xs text-gray-900 dark:text-gray-100 break-all font-mono">
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

                <div className="text-center space-y-4">
                  <Loader size={32} className="animate-spin text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-white">
                    Aguardando confirmação do pagamento...
                  </p>
                  <p className="text-xs text-gray-900 dark:text-gray-200 mb-4">
                    Após realizar o pagamento PIX, clique no botão abaixo para confirmar
                  </p>
                  <button
                    onClick={async () => {
                      if (!paymentId || !userData) return;
                      toast.loading('Verificando pagamento...', { id: 'check-payment' });
                      try {
                        const resp = await fetch(`/api/mercadopago/status?paymentId=${paymentId}&autopecaId=${userData.id}&plano=${plano}`);
                        const data = await resp.json();
                        
                        if (data.ok && data.status === 'approved') {
                          const userRef = doc(db, 'users', userData.id);
                          const userDoc = await getDoc(userRef);
                          const userDataCheck: any = userDoc.data();
                          
                          if (userDataCheck?.assinaturaAtiva && userDataCheck?.plano === plano) {
                            toast.dismiss('check-payment');
                            setPagamentoAprovado(true);
                            notificarPagamentoAprovado();
                          } else {
                            toast.error('Pagamento aprovado, mas plano ainda não foi ativado. Aguarde alguns segundos.', { id: 'check-payment' });
                          }
                        } else if (data.status === 'pending') {
                          toast('⏳ Pagamento ainda pendente. Verifique se o PIX foi pago e tente novamente.', { id: 'check-payment', icon: '⏳', duration: 4000 });
                        } else {
                          toast.error(`Status: ${data.status || 'desconhecido'}`, { id: 'check-payment' });
                        }
                      } catch (error) {
                        console.error('Erro ao verificar pagamento:', error);
                        toast.error('Erro ao verificar pagamento', { id: 'check-payment' });
                      }
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-bold text-base shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    ✓ Já Paguei o PIX - Confirmar Pagamento
                  </button>
                  <p className="text-xs text-gray-900 dark:text-gray-300 mt-2">
                    O sistema também verifica automaticamente, mas você pode confirmar manualmente
                  </p>
                </div>
              </div>
            ) : usandoSecureFields && mpInstance ? (
              // Formulário Secure Fields (PCI)
              <div>
                <button
                  onClick={() => {
                    setUsandoSecureFields(false);
                    setMetodoPagamento('pix');
                  }}
                  className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft size={18} />
                  <span className="text-sm font-medium">Voltar para métodos de pagamento</span>
                </button>
                <SecureCardForm
                  mpInstance={mpInstance}
                  amount={valor}
                  loading={processandoSecureFields}
                  onTokenGenerated={async (token, identificationType, identificationNumber) => {
                    if (!userData) return;
                    
                    setProcessandoSecureFields(true);
                    
                    try {
                      // Obter device_id (agora é async)
                      const deviceId = await obterDeviceId();
                      
                      // Extrair nome completo
                      const { firstName, lastName } = extrairNomeCompleto(userData.nome);
                      
                      // Chamar API de assinatura recorrente com token
                      // Isso cria um Preapproval que renova automaticamente todo mês
                      const resp = await fetch('/api/mercadopago/subscription-with-token', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          token,
                          plano,
                          autopecaId: userData.id,
                          autopecaNome: userData.nome,
                          email: userData?.email || `${userData.id}@example.com`,
                          firstName: firstName || undefined,
                          lastName: lastName || undefined,
                          deviceId: deviceId || undefined,
                          identificationType: identificationType || 'CPF',
                          identificationNumber: identificationNumber ? identificationNumber.replace(/\D/g, '') : undefined,
                          isTestePlatinum: isTestePlatinum && plano === 'platinum', // Flag para teste
                          valor: valor, // Enviar valor específico (pode ser 1.00 para teste)
                        }),
                      });
                      
                      const data = await resp.json();
                      
                      if (!resp.ok || !data.ok) {
                        console.error('❌ Erro no pagamento:', data);
                        const errorMessage = data?.message || data?.details?.message || data?.error || 'Erro ao processar pagamento';
                        toast.error(errorMessage);
                        setProcessandoSecureFields(false);
                        return;
                      }
                      
                      console.log('✅ Assinatura criada:', data);
                      
                      // Criar registro de assinatura
                      const subscriptionIdStr = String(data.subscriptionId);
                      
                      await addDoc(collection(db, 'pagamentos'), {
                        autopecaId: userData.id,
                        autopecaNome: userData.nome,
                        plano,
                        valor,
                        metodoPagamento: 'cartao',
                        statusPagamento: 'pendente',
                        mercadoPagoId: subscriptionIdStr,
                        subscriptionId: subscriptionIdStr,
                        external_reference: isTestePlatinum && plano === 'platinum'
                          ? `${userData.id}|${plano}|teste_platinum`
                          : `${userData.id}|${plano}`,
                        createdAt: Timestamp.now(),
                        updatedAt: Timestamp.now(),
                      });

                      // A assinatura será processada pelo webhook quando aprovada
                      // O Preapproval criado com token já inclui o cartão salvo
                      // e será renovado automaticamente todo mês
                      toast.success('🎉 Assinatura criada! Aguardando aprovação...');
                      toast.success('✅ Renovação automática mensal configurada!', { duration: 5000 });
                      
                      // Redirecionar para página de aprovação se houver init_point
                      const initPoint = data.init_point || data.sandbox_init_point;
                      if (initPoint) {
                        console.log('🔗 Redirecionando para aprovação da assinatura...');
                        setTimeout(() => {
                          window.location.href = initPoint;
                        }, 2000);
                      } else {
                        // Se não houver init_point, a assinatura pode já estar autorizada
                        // Aguardar webhook processar
                        iniciarVerificacaoPagamento(subscriptionIdStr);
                      }
                    } catch (error: any) {
                      console.error('Erro ao processar pagamento:', error);
                      toast.error(error?.message || 'Erro ao processar pagamento');
                      setProcessandoSecureFields(false);
                    }
                  }}
                />
              </div>
            ) : (
              // Botões de seleção de método de pagamento
              <>
                <div className="space-y-3 mb-6">
                  <button
                    onClick={() => {
                      setMetodoPagamento('pix');
                      setUsandoSecureFields(false);
                    }}
                    className={`w-full p-4 rounded-xl border-2 font-semibold flex items-center gap-3 transition-all ${
                      metodoPagamento === 'pix'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500'
                    } dark:text-white`}
                  >
                    <QrCode size={24} />
                    <div className="text-left">
                      <div>PIX</div>
                      <div className="text-xs text-gray-900 dark:text-gray-300">Aprovação instantânea</div>
                    </div>
                  </button>

                  {mpInstance && !isOfertasExtras && (
                    <button
                      onClick={() => {
                        setMetodoPagamento('cartao');
                        setUsandoSecureFields(true);
                      }}
                      className="w-full p-4 rounded-xl border-2 font-semibold flex items-center gap-3 transition-all border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:border-green-600 dark:hover:border-green-400"
                    >
                      <CreditCard size={24} />
                      <div className="text-left flex-1">
                        <div className="flex items-center gap-2">
                          <span>Cartão de Crédito (PCI Secure Fields)</span>
                          <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded">NOVO</span>
                        </div>
                        <div className="text-xs text-gray-900 dark:text-gray-300">Pagamento direto e seguro</div>
                      </div>
                    </button>
                  )}

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

              </>
            )}

            <div className="mt-6 text-xs text-gray-900 dark:text-gray-300 text-center">
              🔒 Pagamento processado com segurança pelo Mercado Pago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


