'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PlanoAssinatura, PRECOS_PLANOS } from '@/types';
import { CreditCard, ArrowLeft, Loader, CheckCircle, QrCode } from 'lucide-react';
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
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
      let pixCode = '';
      // Simulação separada por método (sem aprovação automática)
      if (metodoPagamento === 'pix') {
        pixCode = await simularPagamentoPix();
      } else {
        // Simular criação de preferência/link de pagamento para cartão/boleto
        await new Promise(resolve => setTimeout(resolve, 1200));
        const fakeLink = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${Date.now()}`;
        setLinkPagamento(fakeLink);
        // opcional: abrir o link em nova aba
        try { window.open(fakeLink, '_blank'); } catch {}
      }
      
      // Criar registro de pagamento
      const pagamentoRef = await addDoc(collection(db, 'pagamentos'), {
        autopecaId: userData.id,
        autopecaNome: userData.nome,
        plano,
        valor,
        metodoPagamento: metodoPagamento === 'pix' ? 'mercadopago' : 'cartao',
        statusPagamento: 'pendente',
        ...(metodoPagamento === 'pix' ? { pixCopiaECola: pixCode } : {}),
        ...(linkPagamento ? { linkPagamento } : {}),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });

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


