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

    // 4) Fluxo real: buscar pagamento na API MP e ativar se aprovado
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
          if (parts.length >= 2) {
            const [autopecaId, plano] = parts;
            const mesAtual = new Date().toISOString().slice(0, 7);
            const dataFim = new Date();
            dataFim.setMonth(dataFim.getMonth() + 1);

            // Verificar se o plano já está ativo para evitar atualizações desnecessárias
            const userDoc = await adminDb.collection('users').doc(autopecaId).get();
            const userData = userDoc.data();
            
            if (!userData?.assinaturaAtiva || userData?.plano !== plano) {
              await adminDb.collection('users').doc(autopecaId).update({
                plano,
                assinaturaAtiva: true,
                ofertasUsadas: 0,
                mesReferenciaOfertas: mesAtual,
                dataProximoPagamento: Timestamp.fromDate(dataFim),
              });

              console.log(`Plano ${plano} ativado para usuário ${autopecaId}`);
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


