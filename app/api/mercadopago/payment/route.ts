import { NextResponse } from 'next/server';
import { PRECOS_PLANOS, PlanoAssinatura } from '@/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      token, 
      plano, 
      autopecaId, 
      autopecaNome, 
      email, 
      firstName, 
      lastName, 
      deviceId,
      description,
      identificationType,
      identificationNumber,
      installments = 1,
    } = body as {
      token: string;
      plano: PlanoAssinatura;
      autopecaId: string;
      autopecaNome: string;
      email: string;
      firstName?: string;
      lastName?: string;
      deviceId?: string;
      description?: string;
      identificationType?: string;
      identificationNumber?: string;
      installments?: number;
    };

    if (!token || !plano || !autopecaId) {
      return NextResponse.json({ ok: false, error: 'params_missing' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    const amount = PRECOS_PLANOS[plano];
    const external_reference = `${autopecaId}|${plano}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const notificationUrlSecret = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    const notification_url = `${baseUrl}/api/mercadopago/webhook?secret=${notificationUrlSecret}`;

    // Criar pagamento com token do Secure Fields
    // IMPORTANTE: O payment_method_id será inferido automaticamente do token
    // Não especificar payment_method_id explicitamente evita o erro diff_param_bins
    const paymentBody: any = {
      transaction_amount: parseFloat(amount.toFixed(2)),
      token: token,
      description: description || `Assinatura ${plano} - Grupão das Autopeças`,
      installments: installments || 1,
      // NÃO especificar payment_method_id - o Mercado Pago infere do token
      payer: {
        email: email || `${autopecaId}@example.com`,
        ...(firstName && { first_name: firstName }),
        ...(lastName && { last_name: lastName }),
        identification: {
          type: identificationType || 'CPF',
          number: identificationNumber ? identificationNumber.replace(/\D/g, '') : '',
        },
      },
      statement_descriptor: 'GRUPAO AUTOPECAS', // Descrição na fatura (10 pontos)
      external_reference,
      notification_url,
      binary_mode: true,
      ...(deviceId && { device_id: deviceId }),
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
    };

    console.log('📤 Criando pagamento com token:', JSON.stringify({ ...paymentBody, token: '***' }, null, 2));

    const paymentResp = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${external_reference}-${Date.now()}`,
      },
      body: JSON.stringify(paymentBody),
    });

    const payment = await paymentResp.json();

    if (!paymentResp.ok) {
      console.error('❌ Erro ao criar pagamento:', JSON.stringify(payment, null, 2));
      
      // Extrair mensagem de erro mais detalhada
      let errorMessage = payment?.message || payment?.error || 'Erro ao processar pagamento';
      const causes = payment?.cause || [];
      
      if (causes.length > 0) {
        const causeMessages = causes.map((c: any) => {
          if (typeof c === 'string') return c;
          return c?.description || c?.message || JSON.stringify(c);
        }).filter(Boolean);
        
        if (causeMessages.length > 0) {
          errorMessage = `${errorMessage}: ${causeMessages.join(', ')}`;
        }
      }
      
      // Log detalhado para debug
      console.error('📋 Detalhes do erro:', {
        status: paymentResp.status,
        message: payment?.message,
        error: payment?.error,
        status_detail: payment?.status_detail,
        causes: causes,
      });
      
      return NextResponse.json({
        ok: false,
        error: 'mp_payment_error',
        details: payment,
        message: errorMessage,
        status_detail: payment?.status_detail,
        cause: causes,
      }, { status: paymentResp.status });
    }

    console.log('✅ Pagamento criado com sucesso:', payment.id);

    return NextResponse.json({
      ok: true,
      paymentId: payment.id,
      status: payment.status,
      status_detail: payment.status_detail,
      transaction_amount: payment.transaction_amount,
    });
  } catch (error: any) {
    console.error('❌ Erro no endpoint de pagamento:', error);
    return NextResponse.json({
      ok: false,
      error: 'unknown_error',
      message: error?.message || 'Erro desconhecido ao processar pagamento',
    }, { status: 500 });
  }
}

