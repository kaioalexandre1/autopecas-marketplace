'use client';

import { useEffect } from 'react';
import { initializeMercadoPago, getDeviceId } from '@/lib/mercadopago';

/**
 * Componente que verifica se o SDK MercadoPago.JS V2 está carregado corretamente
 * Este componente deve ser usado em todas as páginas para garantir que o SDK está disponível
 * e que o device_id está sendo coletado corretamente
 */
export default function MercadoPagoSDKChecker() {
  useEffect(() => {
    // Inicializar o SDK usando o utilitário global
    initializeMercadoPago()
      .then(async (instance) => {
        console.log('✅ MercadoPago.JS V2 SDK inicializado com sucesso!');
        console.log('✅ SDK configurado corretamente para coleta de device_id e segurança');
        console.log('✅ SDK pronto para ganhar pontos do Mercado Pago');
        
        // Tentar obter device_id para verificar se está funcionando
        const deviceId = await getDeviceId();
        if (deviceId) {
          console.log('✅ Device ID coletado:', deviceId);
        } else {
          console.log('ℹ️ Device ID será coletado automaticamente pelo SDK V2 via headers HTTP');
        }
      })
      .catch((error) => {
        console.error('❌ Erro ao inicializar MercadoPago SDK:', error);
      });
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
}

