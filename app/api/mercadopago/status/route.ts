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

    if (!paymentId || !autopecaId || !plano) {
      return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
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

        await adminDb.collection('users').doc(autopecaId).update({
          plano,
          assinaturaAtiva: true,
          ofertasUsadas: 0,
          mesReferenciaOfertas: mesAtual,
          dataProximoPagamento: Timestamp.fromDate(dataFim),
        });

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

