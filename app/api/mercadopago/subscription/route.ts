import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { Timestamp } from 'firebase-admin/firestore';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Endpoint para gerenciar assinaturas (cancelar, pausar, retomar)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, subscriptionId, autopecaId } = body as {
      action: 'cancel' | 'pause' | 'resume';
      subscriptionId: string;
      autopecaId: string;
    };

    if (!action || !subscriptionId || !autopecaId) {
      return NextResponse.json({ ok: false, error: 'params_missing' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    try {
      let resp: Response;
      
      if (action === 'cancel') {
        // Cancelar assinatura
        resp = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'cancelled' }),
        });
      } else if (action === 'pause') {
        // Pausar assinatura
        resp = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'paused' }),
        });
      } else if (action === 'resume') {
        // Retomar assinatura
        resp = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'authorized' }),
        });
      } else {
        return NextResponse.json({ ok: false, error: 'invalid_action' }, { status: 400 });
      }

      if (!resp.ok) {
        const errorData = await resp.json();
        console.error('Erro ao atualizar assinatura:', errorData);
        return NextResponse.json({ ok: false, error: 'mp_api_error', details: errorData }, { status: resp.status });
      }

      const data = await resp.json();

      const userDoc = await adminDb.collection('users').doc(autopecaId).get();
      const userData = userDoc.data();
      const resolverData = (valor: any): Date | null => {
        if (!valor) return null;
        if (valor instanceof Date) return valor;
        if (valor?.toDate) return valor.toDate();
        if (valor?.seconds) return new Date(valor.seconds * 1000);
        return null;
      };

      // Atualizar status no Firestore
      if (action === 'cancel') {
        const dataFimAtual = resolverData(userData?.dataProximoPagamento);
        await adminDb.collection('users').doc(autopecaId).update({
          cancelamentoAgendado: true,
          dataCancelamentoAgendado: dataFimAtual ? Timestamp.fromDate(dataFimAtual) : null,
          renovacaoAutomaticaAtiva: false,
          subscriptionId: null,
        });
      } else if (action === 'pause') {
        await adminDb.collection('users').doc(autopecaId).update({
          assinaturaAtiva: false,
          renovacaoAutomaticaAtiva: false,
          cancelamentoAgendado: false,
          dataCancelamentoAgendado: null,
        });
      } else if (action === 'resume') {
        if (userData?.plano && userData.plano !== 'basico') {
          const mesAtual = new Date().toISOString().slice(0, 7);
          const dataFim = new Date();
          dataFim.setMonth(dataFim.getMonth() + 1);
          
          await adminDb.collection('users').doc(autopecaId).update({
            assinaturaAtiva: true,
            ofertasUsadas: 0,
            mesReferenciaOfertas: mesAtual,
            dataProximoPagamento: Timestamp.fromDate(dataFim),
            subscriptionId: subscriptionId,
            cancelamentoAgendado: false,
            dataCancelamentoAgendado: null,
            renovacaoAutomaticaAtiva: true,
          });
        }
      }

      return NextResponse.json({ ok: true, action, subscriptionId, data });
    } catch (error: any) {
      console.error('Erro ao gerenciar assinatura:', error);
      return NextResponse.json({ ok: false, error: error?.message || 'unknown' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}

// GET: Obter status da assinatura
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const subscriptionId = searchParams.get('subscriptionId');

    if (!subscriptionId) {
      return NextResponse.json({ ok: false, error: 'subscriptionId_required' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    const resp = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!resp.ok) {
      const errorData = await resp.json();
      return NextResponse.json({ ok: false, error: 'mp_api_error', details: errorData }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json({ ok: true, subscription: data });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}

