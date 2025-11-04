import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

// Webhook do Mercado Pago (versão simplificada para testes)
// URL sugerida na MP: https://SEU_DOMINIO/api/mercadopago/webhook?secret=SEU_TOKEN

// Evita cache e garante execução em runtime Node
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Validação de vida do endpoint
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');
  const expected = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
  if (!secret || secret !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  // Modo de teste via querystring para executar sem CORS: ?test=1&autopecaId=...&plano=premium
  const test = searchParams.get('test');
  if (test === '1') {
    const autopecaId = searchParams.get('autopecaId') || '';
    const plano = (searchParams.get('plano') as any) || 'premium';
    if (!autopecaId) {
      return NextResponse.json({ ok: false, error: 'missing_autopecaId' }, { status: 400 });
    }
    const mesAtual = new Date().toISOString().slice(0, 7);
    const dataFim = new Date();
    dataFim.setMonth(dataFim.getMonth() + 1);
    await adminDb.collection('users').doc(autopecaId).update({
      plano,
      assinaturaAtiva: true,
      ofertasUsadas: 0,
      mesReferenciaOfertas: mesAtual,
      dataProximoPagamento: Timestamp.fromDate(dataFim),
    });
    return NextResponse.json({ ok: true, mode: 'test', message: 'Plano ativado (teste)' });
  }

  return NextResponse.json({ ok: true, message: 'Webhook OK' });
}

export async function HEAD(_request: Request) {
  return new Response(null, { status: 200 });
}

export async function OPTIONS(_request: Request) {
  return new Response(null, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    // A MP pode enviar JSON (application/json) ou x-www-form-urlencoded
    let body: any = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json().catch(() => ({}));
    } else {
      const raw = await request.text().catch(() => '');
      try {
        body = JSON.parse(raw);
      } catch {
        // tenta extrair id simples: id=123 ou data.id=123
        const params = new URLSearchParams(raw);
        const id = params.get('id') || params.get('data.id');
        if (id) body = { type: 'payment', data: { id } };
      }
    }

    // 1) Proteção simples com secret (configure na URL do webhook na MP)
    const expected = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    if (!secret || secret !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // 2) Modo de ativação forçada (quando o frontend detecta pagamento aprovado mas plano não foi ativado)
    const forceApprove = searchParams.get('forceApprove') === '1';
    if (forceApprove && body?.paymentId && body?.autopecaId && body?.plano) {
      // Verificar status do pagamento antes de ativar
      const accessToken = process.env.MP_ACCESS_TOKEN || '';
      if (accessToken) {
        try {
          const resp = await fetch(`https://api.mercadopago.com/v1/payments/${body.paymentId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });

          if (resp.ok) {
            const payment = await resp.json();
            if (payment?.status === 'approved') {
              const mesAtual = new Date().toISOString().slice(0, 7);
              const dataFim = new Date();
              dataFim.setMonth(dataFim.getMonth() + 1);

              await adminDb.collection('users').doc(body.autopecaId).update({
                plano: body.plano,
                assinaturaAtiva: true,
                ofertasUsadas: 0,
                mesReferenciaOfertas: mesAtual,
                dataProximoPagamento: Timestamp.fromDate(dataFim),
              });

              // Atualizar registro de pagamento
              const pagamentosSnap = await adminDb
                .collection('pagamentos')
                .where('mercadoPagoId', '==', String(body.paymentId))
                .limit(1)
                .get();

              if (!pagamentosSnap.empty) {
                await adminDb.collection('pagamentos').doc(pagamentosSnap.docs[0].id).update({
                  statusPagamento: 'aprovado',
                  updatedAt: Timestamp.now(),
                });
              }

              return NextResponse.json({ ok: true, message: 'Plano ativado com sucesso' });
            }
          }
        } catch (error) {
          console.error('Erro ao verificar pagamento no forceApprove:', error);
        }
      }
      return NextResponse.json({ ok: false, error: 'payment_not_approved' }, { status: 400 });
    }

    // 3) Modo de teste manual (permite ativar plano sem chamar a API MP)
    //    Útil enquanto a criação real do pagamento não está 100% integrada.
    if (body?.testApprove && body?.autopecaId && body?.plano) {
      const mesAtual = new Date().toISOString().slice(0, 7);
      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 1);

      await adminDb.collection('users').doc(body.autopecaId).update({
        plano: body.plano,
        assinaturaAtiva: true,
        ofertasUsadas: 0,
        mesReferenciaOfertas: mesAtual,
        dataProximoPagamento: Timestamp.fromDate(dataFim),
      });

      return NextResponse.json({ ok: true, mode: 'test', message: 'Plano ativado (teste)' });
    }

    // 4) Processar eventos de assinatura (Preapproval)
    if (body?.type === 'subscription_preapproval' || body?.action === 'subscription_preapproval.updated') {
      let preapprovalId: string | null = null;
      
      if (body?.data?.id) {
        preapprovalId = String(body.data.id);
      } else if (body?.id) {
        preapprovalId = String(body.id);
      }

      if (preapprovalId) {
        const accessToken = process.env.MP_ACCESS_TOKEN || '';
        if (!accessToken) {
          return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
        }

        try {
          const resp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            cache: 'no-store',
          });

          if (!resp.ok) {
            console.error('Erro ao buscar preapproval:', resp.status, await resp.text());
            return NextResponse.json({ ok: false, error: 'mp_fetch_failed' }, { status: resp.status });
          }

          const preapproval = await resp.json();
          const status = preapproval?.status;
          const external_reference = preapproval?.external_reference;

          console.log(`Webhook Preapproval - ID: ${preapprovalId}, Status: ${status}, External Ref: ${external_reference}`);

          // Status possíveis: pending, authorized, paused, cancelled
          if (status && external_reference) {
            const parts = external_reference.split('|');
            if (parts.length >= 2) {
              const [autopecaId, plano] = parts;

              if (status === 'authorized') {
                // Assinatura autorizada - ativar plano
                const mesAtual = new Date().toISOString().slice(0, 7);
                const dataFim = new Date();
                dataFim.setMonth(dataFim.getMonth() + 1);

                await adminDb.collection('users').doc(autopecaId).update({
                  plano,
                  assinaturaAtiva: true,
                  ofertasUsadas: 0,
                  mesReferenciaOfertas: mesAtual,
                  dataProximoPagamento: Timestamp.fromDate(dataFim),
                  subscriptionId: preapprovalId,
                  linkAprovacaoPlatinum: null, // Limpar link se existir
                });

                console.log(`Assinatura ${preapprovalId} autorizada - Plano ${plano} ativado para usuário ${autopecaId}`);
              } else if (status === 'cancelled' || status === 'paused') {
                // Assinatura cancelada/pausada - reverter para plano básico
                const mesAtual = new Date().toISOString().slice(0, 7);
                
                await adminDb.collection('users').doc(autopecaId).update({
                  plano: 'basico',
                  assinaturaAtiva: true,
                  ofertasUsadas: 0,
                  mesReferenciaOfertas: mesAtual,
                  dataProximoPagamento: null,
                  subscriptionId: null,
                });

                console.log(`Assinatura ${preapprovalId} ${status} - Usuário ${autopecaId} revertido para plano básico`);
              }
            }
          }

          return NextResponse.json({ ok: true, type: 'preapproval', status, preapprovalId });
        } catch (error: any) {
          console.error('Erro ao processar webhook preapproval:', error);
          return NextResponse.json({ ok: false, error: error?.message || 'unknown' }, { status: 500 });
        }
      }
    }

    // 5) Fluxo real: buscar pagamento na API MP e ativar se aprovado
    // A MP pode enviar diferentes formatos:
    // - { type: 'payment', data: { id: '123' } }
    // - { action: 'payment.updated', data: { id: '123' } }
    // - { id: '123' } (direto)
    let paymentId: string | null = null;
    
    if (body?.data?.id) {
      paymentId = String(body.data.id);
    } else if (body?.id) {
      paymentId = String(body.id);
    } else if (typeof body === 'string') {
      // Às vezes vem como string direta
      try {
        const parsed = JSON.parse(body);
        paymentId = parsed?.data?.id || parsed?.id || null;
      } catch {
        // Não é JSON, tentar como ID direto
        paymentId = body;
      }
    }

    if (paymentId) {
      const accessToken = process.env.MP_ACCESS_TOKEN || '';
      if (!accessToken) {
        return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
      }

      try {
        // Consultar status do pagamento na API MP
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!resp.ok) {
          console.error('Erro ao buscar pagamento:', resp.status, await resp.text());
          return NextResponse.json({ ok: false, error: 'mp_fetch_failed' }, { status: resp.status });
        }

        const payment = await resp.json();
        const status: string = payment?.status;
        const external_reference: string | undefined = payment?.external_reference;

        console.log(`Webhook recebido - Payment ID: ${paymentId}, Status: ${status}, External Ref: ${external_reference}`);

        if (status === 'approved' && external_reference) {
          const parts = external_reference.split('|');
          
          // Verificar se é ofertas extras
          if (parts.length >= 2 && parts[1] === 'ofertas_extras') {
            const autopecaId = parts[0];
            console.log(`Processando pagamento de ofertas extras aprovado - Autopeça: ${autopecaId}`);

            const userDoc = await adminDb.collection('users').doc(autopecaId).get();
            const userData = userDoc.data();

            if (userData) {
              const mesAtual = new Date().toISOString().slice(0, 7);
              const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
              
              // Adicionar 10 ofertas extras (reduzir ofertasUsadas em 10)
              const novasOfertasUsadas = Math.max(0, ofertasUsadas - 10);
              
              await adminDb.collection('users').doc(autopecaId).update({
                ofertasUsadas: novasOfertasUsadas,
                mesReferenciaOfertas: mesAtual,
              });

              console.log(`✅ +10 ofertas adicionadas para autopeça ${autopecaId}`);

              // Atualizar registro de pagamento
              const snap = await adminDb.collection('pagamentos').where('external_reference', '==', external_reference).get();
              for (const d of snap.docs) {
                await adminDb.collection('pagamentos').doc(d.id).update({
                  statusPagamento: 'aprovado',
                  updatedAt: Timestamp.now(),
                  mercadoPagoId: String(payment.id),
                });
              }
            }
            return NextResponse.json({ ok: true, status, paymentId, tipo: 'ofertas_extras' });
          }
          
          // Verificar se é teste do Platinum
          if (parts.length >= 3 && parts[2] === 'teste_platinum') {
            const autopecaId = parts[0];
            const plano = parts[1] as any;
            console.log(`Processando teste de 30 dias Platinum aprovado - Autopeça: ${autopecaId}`);

            const userDoc = await adminDb.collection('users').doc(autopecaId).get();
            const userData = userDoc.data();

            if (userData) {
              const mesAtual = new Date().toISOString().slice(0, 7);
              // Data de fim do teste: 30 dias a partir de agora
              const dataFimTeste = new Date();
              dataFimTeste.setDate(dataFimTeste.getDate() + 30);
              // Data do próximo pagamento: após o fim do teste, cobrar valor normal
              const dataProximoPagamento = new Date(dataFimTeste);
              dataProximoPagamento.setDate(dataProximoPagamento.getDate() + 1);

              await adminDb.collection('users').doc(autopecaId).update({
                plano,
                assinaturaAtiva: true,
                ofertasUsadas: 0,
                mesReferenciaOfertas: mesAtual,
                dataProximoPagamento: Timestamp.fromDate(dataProximoPagamento),
                testePlatinumUsado: true,
                dataInicioTestePlatinum: Timestamp.now(),
              });

              console.log(`✅ Teste Platinum de 30 dias ativado para autopeça ${autopecaId}. Próxima cobrança em ${dataProximoPagamento.toISOString()}`);

              // Atualizar registro de pagamento
              const snap = await adminDb.collection('pagamentos').where('external_reference', '==', external_reference).get();
              for (const d of snap.docs) {
                await adminDb.collection('pagamentos').doc(d.id).update({
                  statusPagamento: 'aprovado',
                  updatedAt: Timestamp.now(),
                  mercadoPagoId: String(payment.id),
                });
              }
            }
            return NextResponse.json({ ok: true, status, paymentId, tipo: 'teste_platinum' });
          }
          
          // Processamento normal de plano
          if (parts.length >= 2) {
            const [autopecaId, plano] = parts;
            const mesAtual = new Date().toISOString().slice(0, 7);
            const dataFim = new Date();
            dataFim.setMonth(dataFim.getMonth() + 1);

            // Verificar se este pagamento é parte de uma assinatura recorrente
            const preapprovalId = payment?.subscription_id || payment?.preapproval_id;
            
            // Buscar usuário para verificar se já tem subscription e status atual
            const userDoc = await adminDb.collection('users').doc(autopecaId).get();
            const userData = userDoc.data();
            const temSubscription = !!userData?.subscriptionId;
            const isRenovacao = temSubscription && preapprovalId && String(userData.subscriptionId) === String(preapprovalId);
            
            // Verificar se é renovação após teste Platinum (precisa atualizar para valor normal)
            const isTestePlatinum = userData?.dataInicioTestePlatinum && userData?.testePlatinumUsado;
            let precisaAtualizarValor = false;
            
            if (isTestePlatinum && isRenovacao) {
              // Verificar se já passaram 30 dias desde o início do teste
              let dataInicioTeste: Date;
              if (userData.dataInicioTestePlatinum instanceof Date) {
                dataInicioTeste = userData.dataInicioTestePlatinum;
              } else if ((userData.dataInicioTestePlatinum as any)?.toDate) {
                dataInicioTeste = (userData.dataInicioTestePlatinum as any).toDate();
              } else if ((userData.dataInicioTestePlatinum as any)?.seconds) {
                dataInicioTeste = new Date((userData.dataInicioTestePlatinum as any).seconds * 1000);
              } else {
                dataInicioTeste = new Date();
              }
              
              const diasDesdeInicio = Math.floor((new Date().getTime() - dataInicioTeste.getTime()) / (1000 * 60 * 60 * 24));
              
              // Se passaram 30 dias ou mais, precisa atualizar para valor normal
              if (diasDesdeInicio >= 30) {
                precisaAtualizarValor = true;
                console.log(`🔄 Renovação após teste Platinum detectada. Criando novo Preapproval com valor normal (R$ 990,00)`);
                
                // Buscar Preapproval antigo para obter dados do pagador
                try {
                  const accessToken = process.env.MP_ACCESS_TOKEN || '';
                  const preapprovalResp = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                    headers: {
                      Authorization: `Bearer ${accessToken}`,
                      'Content-Type': 'application/json',
                    },
                  });
                  
                  if (preapprovalResp.ok) {
                    const preapprovalAntigo = await preapprovalResp.json();
                    const payerEmail = preapprovalAntigo.payer_email || userData.email || `${autopecaId}@example.com`;
                    const payerFirstName = preapprovalAntigo.payer_first_name || userData.nome?.split(' ')[0] || '';
                    const payerLastName = preapprovalAntigo.payer_last_name || userData.nome?.split(' ').slice(1).join(' ') || '';
                    
                    // Criar novo Preapproval com valor normal (R$ 990,00)
                    const novoStartDate = new Date();
                    novoStartDate.setDate(novoStartDate.getDate() + 1); // Começar amanhã
                    
                    const novoPreapprovalBody: any = {
                      reason: `Assinatura Platinum - Grupão das Autopeças`,
                      auto_recurring: {
                        frequency: 1,
                        frequency_type: 'months',
                        transaction_amount: 990.00, // Valor normal
                        currency_id: 'BRL',
                        start_date: novoStartDate.toISOString(),
                        statement_descriptor: 'GRUPAO AUTOPECAS',
                      },
                      payer_email: payerEmail,
                      external_reference: `${autopecaId}|platinum`, // Sem flag de teste
                      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/mercadopago/webhook?secret=${process.env.MP_WEBHOOK_SECRET || 'dev-secret'}`,
                    };
                    
                    if (payerFirstName) {
                      novoPreapprovalBody.payer_first_name = payerFirstName;
                    }
                    if (payerLastName) {
                      novoPreapprovalBody.payer_last_name = payerLastName;
                    }
                    
                    // IMPORTANTE: Tentar usar o payment_method_id do Preapproval antigo
                    // Se o Preapproval antigo tiver um card token ou payment_method, podemos reutilizar
                    // Mas o Mercado Pago não permite reutilizar diretamente. 
                    // Como solução, vamos criar um Preapproval que requer aprovação do usuário
                    // O usuário receberá um link para aprovar o novo Preapproval
                    
                    const novoPreapprovalResp = await fetch('https://api.mercadopago.com/preapproval', {
                      method: 'POST',
                      headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(novoPreapprovalBody),
                    });
                    
                    if (novoPreapprovalResp.ok) {
                      const novoPreapproval = await novoPreapprovalResp.json();
                      console.log(`✅ Novo Preapproval criado: ${novoPreapproval.id} com valor R$ 990,00`);
                      
                      // Cancelar Preapproval antigo
                      await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
                        method: 'PUT',
                        headers: {
                          Authorization: `Bearer ${accessToken}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ status: 'cancelled' }),
                      });
                      
                      console.log(`✅ Preapproval antigo ${preapprovalId} cancelado`);
                      
                      // Atualizar subscriptionId no Firestore
                      updateData.subscriptionId = String(novoPreapproval.id);
                      updateData.dataProximoPagamento = Timestamp.fromDate(novoStartDate);
                      
                      // Salvar link de aprovação para o usuário (se necessário)
                      if (novoPreapproval.init_point) {
                        await adminDb.collection('users').doc(autopecaId).update({
                          linkAprovacaoPlatinum: novoPreapproval.init_point || novoPreapproval.sandbox_init_point,
                        });
                      }
                    } else {
                      const errorData = await novoPreapprovalResp.json();
                      console.error(`❌ Erro ao criar novo Preapproval:`, errorData);
                      // Continuar com o Preapproval antigo, mas registrar o erro
                    }
                  }
                } catch (error) {
                  console.error('❌ Erro ao processar atualização do Preapproval:', error);
                  // Continuar com o fluxo normal mesmo se houver erro
                }
              }
            }
            
            const updateData: any = {
              plano,
              assinaturaAtiva: true,
              mesReferenciaOfertas: mesAtual,
              dataProximoPagamento: Timestamp.fromDate(dataFim),
            };

            // Se for renovação de assinatura, manter subscriptionId e resetar ofertas
            if (isRenovacao && !precisaAtualizarValor) {
              updateData.ofertasUsadas = 0;
              updateData.subscriptionId = String(preapprovalId);
              console.log(`🔄 Renovação automática da assinatura ${preapprovalId} - Plano ${plano} renovado para usuário ${autopecaId}`);
            } else {
              // Primeira ativação ou pagamento único
              updateData.ofertasUsadas = 0;
              
              // Se for pagamento de uma assinatura, salvar o subscriptionId
              if (preapprovalId) {
                updateData.subscriptionId = String(preapprovalId);
                console.log(`✅ Primeira cobrança da assinatura ${preapprovalId} - Plano ${plano} ativado para usuário ${autopecaId}`);
              } else {
                console.log(`✅ Pagamento único aprovado - Plano ${plano} ativado para usuário ${autopecaId}`);
              }
            }

            // Atualizar apenas se necessário
            if (!userData?.assinaturaAtiva || userData?.plano !== plano || isRenovacao) {
              await adminDb.collection('users').doc(autopecaId).update(updateData);
            } else if (preapprovalId && userData.subscriptionId !== String(preapprovalId)) {
              // Atualizar subscriptionId se mudou
              await adminDb.collection('users').doc(autopecaId).update({
                subscriptionId: String(preapprovalId),
              });
            }

            // Atualizar documento em pagamentos, se existir
            const snap = await adminDb.collection('pagamentos').where('external_reference', '==', external_reference).get();
            for (const d of snap.docs) {
              await adminDb.collection('pagamentos').doc(d.id).update({
                statusPagamento: 'aprovado',
                updatedAt: Timestamp.now(),
                mercadoPagoId: String(payment.id),
              });
            }
          } else {
            console.error('External reference inválida:', external_reference);
          }
        }

        return NextResponse.json({ ok: true, status, paymentId });
      } catch (error: any) {
        console.error('Erro ao processar webhook:', error);
        return NextResponse.json({ ok: false, error: error?.message || 'unknown' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}


