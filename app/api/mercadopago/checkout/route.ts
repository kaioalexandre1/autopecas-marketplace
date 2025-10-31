import { NextResponse } from 'next/server';
// Não usamos Firestore aqui para evitar erros de permissão no server
import { PRECOS_PLANOS, PlanoAssinatura } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metodo, plano, autopecaId, autopecaNome, email } = body as {
      metodo: 'pix' | 'cartao';
      plano: PlanoAssinatura;
      autopecaId: string;
      autopecaNome: string;
      email: string;
    };

    if (!autopecaId || !plano || !metodo) {
      return NextResponse.json({ ok: false, error: 'params_missing' }, { status: 400 });
    }

    // Usar somente variável de ambiente (seguro e sem dependência de regras)
    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    const amount = PRECOS_PLANOS[plano];
    const notificationUrlSecret = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || '';
    const fullBase = String(baseUrl).startsWith('http') ? String(baseUrl) : `https://${baseUrl}`;
    const notification_url = `${fullBase}/api/mercadopago/webhook?secret=${notificationUrlSecret}`;
    const external_reference = `${autopecaId}|${plano}`; // Para correlacionar no webhook

    if (metodo === 'pix') {
      const idemKey = `${autopecaId}-${plano}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Criar pagamento PIX
      const resp = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': idemKey,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `Assinatura plano ${plano}`,
          payment_method_id: 'pix',
          payer: { email: email || `${autopecaId}@example.com` },
          notification_url,
          external_reference,
          binary_mode: true,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        return NextResponse.json({ ok: false, error: 'mp_pix_error', details: data }, { status: resp.status });
      }

      const qr = data?.point_of_interaction?.transaction_data?.qr_code || '';
      const paymentId = data?.id;
      return NextResponse.json({ ok: true, method: 'pix', qr, paymentId });
    }

    // Preferência de checkout (cartão) - MP mostrará os métodos
    const prefResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: `Assinatura ${plano}`,
            quantity: 1,
            unit_price: amount,
            currency_id: 'BRL',
          },
        ],
        payer: { email: email || `${autopecaId}@example.com` },
        notification_url,
        external_reference,
        back_urls: {
          success: `${fullBase}/dashboard?checkout=success`,
          failure: `${fullBase}/dashboard?checkout=failure`,
          pending: `${fullBase}/dashboard?checkout=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'WRX PARTS',
        // Personalização conforme método solicitado
        payment_methods: metodo === 'cartao'
          ? { default_payment_type_id: 'credit_card' }
          : undefined,
        binary_mode: true,
      }),
    });

    const pref = await prefResp.json();
    if (!prefResp.ok) {
      return NextResponse.json({ ok: false, error: 'mp_pref_error', details: pref }, { status: prefResp.status });
    }

    return NextResponse.json({ ok: true, method: 'checkout', init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point, preferenceId: pref.id });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'unknown' }, { status: 500 });
  }
}


