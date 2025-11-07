import { NextResponse } from 'next/server';
import { PRECOS_PLANOS, PlanoAssinatura } from '@/types';

/**
 * Criar assinatura recorrente (Preapproval) usando token do Secure Fields
 * Isso garante renovação automática mensal
 */
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
      identificationType,
      identificationNumber,
      isTestePlatinum,
      valor: valorEnviado,
    } = body as {
      token: string;
      plano: PlanoAssinatura;
      autopecaId: string;
      autopecaNome: string;
      email: string;
      firstName?: string;
      lastName?: string;
      deviceId?: string;
      identificationType?: string;
      identificationNumber?: string;
      isTestePlatinum?: boolean;
      valor?: number;
    };

    if (!token || !plano || !autopecaId) {
      return NextResponse.json({ ok: false, error: 'params_missing' }, { status: 400 });
    }

    const accessToken = process.env.MP_ACCESS_TOKEN || '';
    if (!accessToken) {
      return NextResponse.json({ ok: false, error: 'missing_access_token' }, { status: 500 });
    }

    // Se for teste do Platinum, usar valor enviado (R$ 1,00), senão usar preço normal
    const amount = (isTestePlatinum && valorEnviado) ? valorEnviado : PRECOS_PLANOS[plano];
    const external_reference = isTestePlatinum 
      ? `${autopecaId}|${plano}|teste_platinum`
      : `${autopecaId}|${plano}`;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const notificationUrlSecret = process.env.MP_WEBHOOK_SECRET || 'dev-secret';
    const notification_url = `${baseUrl}/api/mercadopago/webhook?secret=${notificationUrlSecret}`;
    const fullBase = String(baseUrl).startsWith('http') ? String(baseUrl) : `https://${baseUrl}`;

    // Validar valor mínimo
    if (amount < 1.0) {
      return NextResponse.json({
        ok: false,
        error: 'valor_minimo',
        message: 'O valor mínimo para assinaturas é R$ 1,00'
      }, { status: 400 });
    }

    // Garantir start_date sempre no futuro (compensa diferenças de fuso/latência)
    const startDate = new Date(Date.now() + 5 * 60 * 1000); // +5 minutos
    if (!isTestePlatinum) {
      startDate.setDate(startDate.getDate() + 1);
    }

    // Criar Preapproval com token do Secure Fields
    // IMPORTANTE: O Preapproval criado com token já inclui o cartão salvo
    // e será renovado automaticamente todo mês
    const preapprovalBody: any = {
      reason: isTestePlatinum
        ? `Teste 30 dias grátis Platinum - Grupão das Autopeças`
        : `Assinatura ${plano} - Grupão das Autopeças`,
      status: 'authorized',
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: parseFloat(amount.toFixed(2)),
        currency_id: 'BRL',
        start_date: startDate.toISOString(),
        statement_descriptor: 'GRUPAO AUTOPECAS',
        // Se for teste, configurar renovação para 30 dias depois com valor normal
        ...(isTestePlatinum && {
          // Na primeira renovação após 30 dias, cobrar valor normal
          // O Mercado Pago vai renovar automaticamente, mas precisamos atualizar o valor no webhook
        }),
      },
      payer_email: email || `${autopecaId}@example.com`,
      external_reference,
      notification_url,
      back_url: `${fullBase}/dashboard/checkout?checkout=success`,
      // Token do cartão - isso permite que o Preapproval já tenha o cartão salvo
      card_token_id: token,
    };

    // Adicionar campos opcionais
    if (firstName) {
      preapprovalBody.payer_first_name = firstName;
    }
    if (lastName) {
      preapprovalBody.payer_last_name = lastName;
    }
    if (deviceId) {
      preapprovalBody.device_id = deviceId;
    }

    // Adicionar dados de identificação se disponíveis
    if (identificationType && identificationNumber) {
      preapprovalBody.payer = {
        identification: {
          type: identificationType,
          number: identificationNumber.replace(/\D/g, ''),
        },
      };
    }

    console.log('📤 Criando Preapproval com token:', JSON.stringify({ ...preapprovalBody, card_token_id: '***' }, null, 2));

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
      console.error('❌ Erro ao criar Preapproval:', JSON.stringify(preapproval, null, 2));
      
      // Extrair mensagem de erro mais detalhada
      let errorMessage = preapproval?.message || preapproval?.error || 'Erro ao criar assinatura';
      const causes = preapproval?.cause || [];
      
      if (causes.length > 0) {
        const causeMessages = causes.map((c: any) => {
          if (typeof c === 'string') return c;
          return c?.description || c?.message || JSON.stringify(c);
        }).filter(Boolean);
        
        if (causeMessages.length > 0) {
          errorMessage = `${errorMessage}: ${causeMessages.join(', ')}`;
        }
      }
      
      return NextResponse.json({ 
        ok: false, 
        error: 'mp_preapproval_error', 
        details: preapproval,
        message: errorMessage,
        status_detail: preapproval?.status_detail,
        cause: causes,
      }, { status: preapprovalResp.status });
    }

    console.log('✅ Preapproval criado com sucesso:', preapproval.id);
    console.log('✅ Assinatura configurada para renovação automática mensal');

    return NextResponse.json({
      ok: true,
      subscriptionId: preapproval.id,
      status: preapproval.status,
      init_point: preapproval.init_point,
      sandbox_init_point: preapproval.sandbox_init_point,
    });
  } catch (error: any) {
    console.error('❌ Erro no endpoint de assinatura:', error);
    return NextResponse.json({
      ok: false,
      error: 'unknown_error',
      message: error?.message || 'Erro desconhecido ao criar assinatura',
    }, { status: 500 });
  }
}

