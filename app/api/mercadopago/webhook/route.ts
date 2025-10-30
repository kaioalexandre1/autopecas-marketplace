import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, updateDoc, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';

// Webhook do Mercado Pago (versão simplificada para testes)
// URL sugerida na MP: https://SEU_DOMINIO/api/mercadopago/webhook?secret=SEU_TOKEN

export async function GET(_request: Request) {
  // Permite validação manual/automática da URL (evita 404/405 em testes)
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
    const body = await request.json().catch(() => ({}));

    // 1) Proteção simples com secret (configure na URL do webhook na MP)
    const expected = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    if (!secret || secret !== expected) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }

    // 2) Modo de teste manual (permite ativar plano sem chamar a API MP)
    //    Útil enquanto a criação real do pagamento não está 100% integrada.
    if (body?.testApprove && body?.autopecaId && body?.plano) {
      const mesAtual = new Date().toISOString().slice(0, 7);
      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 1);

      await updateDoc(doc(db, 'users', body.autopecaId), {
        plano: body.plano,
        assinaturaAtiva: true,
        ofertasUsadas: 0,
        mesReferenciaOfertas: mesAtual,
        dataProximoPagamento: Timestamp.fromDate(dataFim),
      });

      return NextResponse.json({ ok: true, mode: 'test', message: 'Plano ativado (teste)' });
    }

    // 3) Fluxo real: buscar pagamento na API MP e ativar se aprovado
    // A MP pode enviar { type: 'payment', data: { id } } ou { action: 'payment.updated', data: { id } }
    const isPaymentType = body?.type === 'payment' || body?.action?.startsWith?.('payment');
    if (isPaymentType && body?.data?.id) {
      // Usar somente variável de ambiente
      const accessToken = process.env.MP_ACCESS_TOKEN || '';
      if (!accessToken) {
        return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
      }

      // Consultar status do pagamento na API MP
      const paymentId = body.data.id;
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
      const status: string = payment?.status;
      const external_reference: string | undefined = payment?.external_reference;

      if (status === 'approved' && external_reference) {
        const [autopecaId, plano] = external_reference.split('|');
        const mesAtual = new Date().toISOString().slice(0, 7);
        const dataFim = new Date();
        dataFim.setMonth(dataFim.getMonth() + 1);

        await updateDoc(doc(db, 'users', autopecaId), {
          plano,
          assinaturaAtiva: true,
          ofertasUsadas: 0,
          mesReferenciaOfertas: mesAtual,
          dataProximoPagamento: Timestamp.fromDate(dataFim),
        });

        // Atualizar documento em pagamentos, se existir
        const pagamentosRef = collection(db, 'pagamentos');
        const snap = await getDocs(query(pagamentosRef, where('external_reference', '==', external_reference)));
        for (const d of snap.docs) {
          await updateDoc(doc(db, 'pagamentos', d.id), {
            statusPagamento: 'aprovado',
            updatedAt: Timestamp.now(),
            mercadoPagoId: String(payment.id),
          });
        }
      }

      return NextResponse.json({ ok: true, status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}


