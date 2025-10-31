import { NextResponse } from 'next/server';
// Não usamos Firestore aqui para evitar erros de permissão no server
import { PRECOS_PLANOS, PlanoAssinatura } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { metodo, plano, autopecaId, autopecaNome, email, firstName, lastName, deviceId } = body as {
      metodo: 'pix' | 'cartao';
      plano: PlanoAssinatura;
      autopecaId: string;
      autopecaNome: string;
      email: string;
      firstName?: string;
      lastName?: string;
      deviceId?: string;
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
          transaction_amount: parseFloat(amount.toFixed(2)),
          description: `Assinatura plano ${plano} - Grupão das Autopeças`, // Descrição detalhada
          payment_method_id: 'pix',
          payer: { 
            email: email || `${autopecaId}@example.com`,
            ...(firstName && { first_name: firstName }),
            ...(lastName && { last_name: lastName }),
          },
          additional_info: {
            items: [
              {
                id: `${autopecaId}-${plano}-${Date.now()}`,
                title: `Assinatura ${plano}`,
                description: `Plano de assinatura ${plano} - Grupão das Autopeças`,
                quantity: 1,
                unit_price: parseFloat(amount.toFixed(2)),
                category_id: 'subscriptions',
              },
            ],
          },
          statement_descriptor: 'GRUPAO AUTOPECAS', // Descrição na fatura do cartão (10 pontos)
          notification_url,
          external_reference,
          binary_mode: true,
          ...(deviceId && { device_id: deviceId }),
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

    // Para cartão: criar assinatura recorrente (Preapproval)
    if (metodo === 'cartao') {
      // Validar valor mínimo (R$ 1,00 é o mínimo para assinaturas)
      if (amount < 1.0) {
        return NextResponse.json({ 
          ok: false, 
          error: 'valor_minimo', 
          message: 'O valor mínimo para assinaturas é R$ 1,00' 
        }, { status: 400 });
      }

      // Calcular data de início (hoje + 1 dia para dar tempo do usuário aprovar)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1);
      
      const preapprovalBody: any = {
        reason: `Assinatura ${plano} - Grupão das Autopeças`,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: parseFloat(amount.toFixed(2)),
          currency_id: 'BRL',
          start_date: startDate.toISOString(),
        },
        payer_email: email || `${autopecaId}@example.com`,
        external_reference,
        notification_url,
        back_url: `${fullBase}/dashboard/checkout?checkout=success`,
      };

      // Adicionar campos opcionais apenas se estiverem preenchidos
      if (firstName) {
        preapprovalBody.payer_first_name = firstName;
      }
      if (lastName) {
        preapprovalBody.payer_last_name = lastName;
      }
      if (deviceId) {
        preapprovalBody.device_id = deviceId;
      }

      console.log('📤 Criando Preapproval com dados:', JSON.stringify(preapprovalBody, null, 2));

      const preapprovalResp = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preapprovalBody),
      });

      const preapproval = await preapprovalResp.json();
      
      if (!preapprovalResp.ok) {
        console.error('❌ Erro ao criar preapproval:', JSON.stringify(preapproval, null, 2));
        console.error('Status:', preapprovalResp.status);
        console.error('Request body enviado:', JSON.stringify({
          reason: `Assinatura ${plano} - Grupão das Autopeças`,
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: amount,
            currency_id: 'BRL',
            end_date: null,
          },
          payer_email: email || `${autopecaId}@example.com`,
          external_reference,
          notification_url,
          back_url: `${fullBase}/dashboard?checkout=success`,
          status: 'pending',
        }, null, 2));
        return NextResponse.json({ 
          ok: false, 
          error: 'mp_preapproval_error', 
          details: preapproval,
          message: preapproval?.message || 'Erro ao criar assinatura',
          cause: preapproval?.cause || [],
        }, { status: preapprovalResp.status });
      }

      console.log('✅ Preapproval criado com sucesso:', preapproval.id);

      // Retornar link de inscrição na assinatura
      return NextResponse.json({ 
        ok: true, 
        method: 'subscription', 
        subscriptionId: preapproval.id,
        init_point: preapproval.init_point,
        sandbox_init_point: preapproval.sandbox_init_point,
      });
    }

    // Para outros métodos: Preferência de checkout tradicional (caso não seja PIX nem cartão)
    const prefResp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            id: `${autopecaId}-${plano}-${Date.now()}`, // Código único do item (ganha 3 pontos)
            title: `Assinatura ${plano}`, // Nome do item (ganha 2 pontos)
            description: `Plano de assinatura ${plano} - Grupão das Autopeças`, // Descrição (ganha 2 pontos)
            quantity: 1, // Quantidade (ganha 2 pontos)
            unit_price: parseFloat(amount.toFixed(2)), // Preço unitário (ganha 2 pontos)
            currency_id: 'BRL',
            category_id: 'subscriptions', // Categoria (ganha 3 pontos)
          },
        ],
        payer: { 
          email: email || `${autopecaId}@example.com`,
          ...(firstName && { first_name: firstName }),
          ...(lastName && { last_name: lastName }),
        },
        notification_url,
        external_reference,
        back_urls: {
          success: `${fullBase}/dashboard?checkout=success`,
          failure: `${fullBase}/dashboard?checkout=failure`,
          pending: `${fullBase}/dashboard?checkout=pending`,
        },
        auto_return: 'approved',
        statement_descriptor: 'GRUPAO AUTOPECAS', // Descrição na fatura do cartão (10 pontos)
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


