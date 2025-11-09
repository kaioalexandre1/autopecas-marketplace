import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');
    const autopecaId = searchParams.get('autopecaId');
    const plano = searchParams.get('plano');
    const tipo = searchParams.get('tipo'); // 'ofertas_extras' | 'subscription' | null

    if (!paymentId || !autopecaId) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

  // Se for consulta de assinatura (preapproval)
    if (tipo === 'subscription') {
      if (!plano) {
        return NextResponse.json({ ok: false, error: 'missing_plan' }, { status: 400 });
      }

      const preapprovalResp = await fetch(`https://api.mercadopago.com/preapproval/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!preapprovalResp.ok) {
        const errorText = await preapprovalResp.text();
        console.error(`[Status API] Erro ao buscar preapproval: ${preapprovalResp.status} - ${errorText}`);
        return NextResponse.json({ ok: false, error: 'mp_preapproval_fetch_failed' }, { status: preapprovalResp.status });
      }

      const preapproval = await preapprovalResp.json();
      const status: string = preapproval?.status || 'pending';
      console.log(`[Status API] Preapproval ${paymentId}: status=${status}`);

      if (status === 'authorized' || status === 'approved') {
        const userDoc = await adminDb.collection('users').doc(autopecaId).get();
        const userData = userDoc.data();

        const mesAtual = new Date().toISOString().slice(0, 7);
        const dataFim = new Date();
        dataFim.setMonth(dataFim.getMonth() + 1);

        await adminDb.collection('users').doc(autopecaId).update({
          plano,
          assinaturaAtiva: true,
          ofertasUsadas: 0,
          mesReferenciaOfertas: mesAtual,
          dataProximoPagamento: Timestamp.fromDate(dataFim),
          cancelamentoAgendado: false,
          dataCancelamentoAgendado: null,
          renovacaoAutomaticaAtiva: true,
          subscriptionId: String(paymentId),
        });

        console.log(`[Status API] ✅ Plano ${plano} ativado via preapproval`);

        const pagamentosSnap = await adminDb
          .collection('pagamentos')
          .where('mercadoPagoId', '==', String(paymentId))
          .limit(1)
          .get();

        if (!pagamentosSnap.empty) {
          await adminDb.collection('pagamentos').doc(pagamentosSnap.docs[0].id).update({
            statusPagamento: 'aprovado',
            updatedAt: Timestamp.now(),
          });
        }

        return NextResponse.json({
          ok: true,
          status: 'approved',
          activated: true,
          preapproval,
        });
      }

      if (status === 'paused' || status === 'cancelled' || status === 'inactive') {
        return NextResponse.json({
          ok: true,
          status,
          activated: false,
        });
      }

      return NextResponse.json({
        ok: true,
        status,
        activated: false,
      });
    }

  // Se for ofertas extras, não precisa do parâmetro plano
    if (tipo === 'ofertas_extras') {
      // Processar ofertas extras
      const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });

      if (!resp.ok) {
        return NextResponse.json({ ok: false, error: 'mp_fetch_failed' }, { status: resp.status });
      }

      const payment = await resp.json();
      const status: string = payment?.status || 'pending';

      // Se aprovado, adicionar +10 ofertas
      if (status === 'approved') {
        // Verificar se o pagamento já foi processado (evitar duplicação)
        const externalRef = payment?.external_reference || '';
        const pagamentoDoc = await adminDb.collection('pagamentos').where('external_reference', '==', externalRef).where('statusPagamento', '==', 'aprovado').get();
        
        if (!pagamentoDoc.empty) {
          console.log(`[Status API] ⚠️ Pagamento já foi processado anteriormente. Ignorando para evitar duplicação.`);
          return NextResponse.json({ ok: true, status, paymentId, tipo: 'ofertas_extras', jaProcessado: true });
        }
        
        const userDoc = await adminDb.collection('users').doc(autopecaId).get();
        const userData = userDoc.data();

        if (userData) {
          const mesAtual = new Date().toISOString().slice(0, 7);
          const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
          
          // Adicionar 10 ofertas extras (reduzir ofertasUsadas em 10, permitindo valores negativos)
          // Valores negativos representam ofertas extras disponíveis além do limite
          const novasOfertasUsadas = ofertasUsadas - 10;
          
          await adminDb.collection('users').doc(autopecaId).update({
            ofertasUsadas: novasOfertasUsadas,
            mesReferenciaOfertas: mesAtual,
          });

          console.log(`[Status API] ✅ +10 ofertas adicionadas para usuário ${autopecaId}`);

          // Atualizar registro de pagamento
          const pagamentosSnap = await adminDb
            .collection('pagamentos')
            .where('mercadoPagoId', '==', String(paymentId))
            .limit(1)
            .get();

          if (!pagamentosSnap.empty) {
            await adminDb.collection('pagamentos').doc(pagamentosSnap.docs[0].id).update({
              statusPagamento: 'aprovado',
              updatedAt: Timestamp.now(),
            });
          }
        }

        return NextResponse.json({ 
          ok: true, 
          status: 'approved',
          activated: true,
          message: '+10 ofertas adicionadas'
        });
      }

      return NextResponse.json({ 
        ok: true, 
        status,
        activated: false
      });
    }

    // Se não for ofertas extras, precisa do plano
    if (!plano) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    console.log(`[Status API] Verificando pagamento ${paymentId} para usuário ${autopecaId}, plano ${plano}`);
    
    // Consultar status do pagamento na API MP
    const resp = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error(`[Status API] Erro ao buscar pagamento: ${resp.status} - ${errorText}`);
      return NextResponse.json({ ok: false, error: 'mp_fetch_failed' }, { status: resp.status });
    }

    const payment = await resp.json();
    const status: string = payment?.status || 'pending';
    const externalRef = payment?.external_reference || '';
    
    console.log(`[Status API] Pagamento ${paymentId}: status=${status}, external_ref=${externalRef}`);

    // IMPORTANTE: Verificar se é ofertas extras antes de processar como plano
    if (externalRef && externalRef.includes('|ofertas_extras|')) {
      console.log(`[Status API] ⚠️ Pagamento detectado como ofertas extras, mas tipo não foi especificado. Verificando se já foi processado...`);
      
      if (status === 'approved') {
        // Verificar se o pagamento já foi processado (evitar duplicação)
        const pagamentoDoc = await adminDb.collection('pagamentos').where('external_reference', '==', externalRef).where('statusPagamento', '==', 'aprovado').get();
        
        if (!pagamentoDoc.empty) {
          console.log(`[Status API] ⚠️ Pagamento já foi processado anteriormente. Ignorando para evitar duplicação.`);
          return NextResponse.json({ ok: true, status, paymentId, tipo: 'ofertas_extras', jaProcessado: true });
        }
        
        const userDoc = await adminDb.collection('users').doc(autopecaId).get();
        const userData = userDoc.data();

        if (userData) {
          const mesAtual = new Date().toISOString().slice(0, 7);
          const ofertasUsadas = userData.mesReferenciaOfertas === mesAtual ? (userData.ofertasUsadas || 0) : 0;
          
          // Adicionar 10 ofertas extras (reduzir ofertasUsadas em 10, permitindo valores negativos)
          // Valores negativos representam ofertas extras disponíveis além do limite
          const novasOfertasUsadas = ofertasUsadas - 10;
          
          await adminDb.collection('users').doc(autopecaId).update({
            ofertasUsadas: novasOfertasUsadas,
            mesReferenciaOfertas: mesAtual,
          });

          console.log(`[Status API] ✅ +10 ofertas adicionadas para usuário ${autopecaId}`);

          // Atualizar registro de pagamento
          const pagamentosSnap = await adminDb
            .collection('pagamentos')
            .where('mercadoPagoId', '==', String(paymentId))
            .limit(1)
            .get();

          if (!pagamentosSnap.empty) {
            await adminDb.collection('pagamentos').doc(pagamentosSnap.docs[0].id).update({
              statusPagamento: 'aprovado',
              updatedAt: Timestamp.now(),
            });
          }
        }

        return NextResponse.json({ 
          ok: true, 
          status: 'approved',
          activated: true,
          message: '+10 ofertas adicionadas'
        });
      }

      return NextResponse.json({ 
        ok: true, 
        status,
        activated: false
      });
    }

    // Se aprovado, ativar o plano se ainda não estiver ativo
    if (status === 'approved') {
      const userDoc = await adminDb.collection('users').doc(autopecaId).get();
      const userData = userDoc.data();
      
      console.log(`[Status API] Dados atuais do usuário:`, {
        assinaturaAtiva: userData?.assinaturaAtiva,
        planoAtual: userData?.plano,
        planoEsperado: plano
      });
      
      // Verificar se o plano já está ativo para este plano específico
      if (!userData?.assinaturaAtiva || userData?.plano !== plano) {
        console.log(`[Status API] Ativando plano ${plano} para usuário ${autopecaId}...`);
        
        const mesAtual = new Date().toISOString().slice(0, 7);
        const dataFim = new Date();
        dataFim.setMonth(dataFim.getMonth() + 1);

        const updatePayload: any = {
          plano,
          assinaturaAtiva: true,
          ofertasUsadas: 0,
          mesReferenciaOfertas: mesAtual,
          dataProximoPagamento: Timestamp.fromDate(dataFim),
          cancelamentoAgendado: false,
          dataCancelamentoAgendado: null,
          renovacaoAutomaticaAtiva: !!preapprovalId,
        };

        if (preapprovalId) {
          updatePayload.subscriptionId = String(preapprovalId);
        } else {
          updatePayload.subscriptionId = null;
        }

        await adminDb.collection('users').doc(autopecaId).update(updatePayload);

        console.log(`[Status API] ✅ Plano ${plano} ativado para usuário ${autopecaId}`);

        // Atualizar registro de pagamento
        const pagamentosSnap = await adminDb
          .collection('pagamentos')
          .where('mercadoPagoId', '==', String(paymentId))
          .limit(1)
          .get();

        if (!pagamentosSnap.empty) {
          await adminDb.collection('pagamentos').doc(pagamentosSnap.docs[0].id).update({
            statusPagamento: 'aprovado',
            updatedAt: Timestamp.now(),
          });
          console.log(`[Status API] ✅ Registro de pagamento atualizado`);
        }

        return NextResponse.json({ 
          ok: true, 
          status: 'approved',
          activated: true,
          message: 'Plano ativado com sucesso'
        });
      } else {
        console.log(`[Status API] Plano já está ativo, não é necessário atualizar`);
        // Retornar activated: true mesmo que já estivesse ativo
        return NextResponse.json({ 
          ok: true, 
          status: 'approved',
          activated: true,
          alreadyActive: true,
          message: 'Plano já está ativo'
        });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      status,
      activated: false
    });
  } catch (err: any) {
    console.error('Erro ao verificar status:', err);
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}

