import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';

// Webhook do Mercado Pago (versão simplificada para testes)
// URL sugerida na MP: https://SEU_DOMINIO/api/mercadopago/webhook?secret=SEU_TOKEN

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

    // 3) Fluxo real (esqueleto): buscar pagamento na API MP e ativar se aprovado
    //    Requer accessToken salvo em Firestore: configuracoes/mercadopago { accessToken }
    //    body esperado da MP: { type: 'payment', data: { id: '123' } }
    if (body?.type === 'payment' && body?.data?.id) {
      // Buscar accessToken salvo pelo admin
      const cfgSnap = await getDoc(doc(db, 'configuracoes', 'mercadopago'));
      const accessToken = cfgSnap.exists() ? (cfgSnap.data() as any).accessToken : '';
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
      // Aqui você precisa correlacionar o pagamento ao usuário/plano.
      // Ex.: salvar o paymentId ao criar o documento em `pagamentos` e buscá-lo aqui.
      // Para fins de esqueleto, apenas retornamos o status do pagamento.

      return NextResponse.json({ ok: true, status: payment.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}


