import { NextResponse } from 'next/server';

/**
 * Criar pagamento PIX para compra de ofertas extras
 * Valor: R$ 29,90
 * Adiciona +10 ofertas ao cliente do plano básico
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      autopecaId, 
      autopecaNome, 
      email, 
      firstName, 
      lastName, 
      deviceId,
    } = body as {
      autopecaId: string;
      autopecaNome: string;
      email: string;
      firstName?: string;
      lastName?: string;
      deviceId?: string;
    };

    if (!autopecaId) {
      return NextResponse.json({ ok: false, error: 'params_missing' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    const valor = 29.90;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const notificationUrlSecret = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    const fullBase = String(baseUrl).startsWith('http') ? String(baseUrl) : `https://${baseUrl}`;
    const notification_url = `${fullBase}/api/mercadopago/webhook?secret=${notificationUrlSecret}`;
    const external_reference = `${autopecaId}|ofertas_extras|${Date.now()}`;

    // Criar pagamento PIX
    const idemKey = `${autopecaId}-ofertas-extras-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idemKey,
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: '10 Ofertas Extras - Grupão das Autopeças',
        payment_method_id: 'pix',
        payer: { 
          email: email || `${autopecaId}@example.com`,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
        additional_info: {
          items: [
            {
              id: `${autopecaId}-ofertas-extras-${Date.now()}`,
              title: '10 Ofertas Extras',
              description: 'Pacote de 10 ofertas extras para plano básico',
              quantity: 1,
              unit_price: valor,
              category_id: 'digital_goods',
            },
          ],
        },
        statement_descriptor: 'GRUPAO AUTOPECAS',
        notification_url,
        external_reference,
        binary_mode: true,
        ...(deviceId && { device_id: deviceId }),
      }),
    });

    const data = await resp.json();
    if (!resp.ok) {
      console.error('❌ Erro ao criar PIX de ofertas extras:', data);
      return NextResponse.json({ 
        ok: false, 
        error: 'mp_pix_error', 
        details: data,
        message: data?.message || 'Erro ao criar pagamento PIX',
      }, { status: resp.status });
    }

    const qr = data?.point_of_interaction?.transaction_data?.qr_code || '';
    const paymentId = data?.id;

    if (!qr || !paymentId) {
      console.error('❌ PIX criado mas sem QR code ou payment ID:', data);
      return NextResponse.json({ 
        ok: false, 
        error: 'invalid_pix_response',
        details: data,
      }, { status: 500 });
    }

    console.log('✅ PIX de ofertas extras criado com sucesso:', paymentId);

    return NextResponse.json({ 
      ok: true, 
      qr, 
      paymentId,
    });
  } catch (error: any) {
    console.error('❌ Erro no endpoint de ofertas extras:', error);
    return NextResponse.json({
      ok: false,
      error: 'unknown_error',
      message: error?.message || 'Erro desconhecido ao processar pagamento',
    }, { status: 500 });
  }
}

