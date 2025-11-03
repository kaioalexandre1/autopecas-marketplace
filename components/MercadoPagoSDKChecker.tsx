'use client';

import { useEffect } from 'react';

/**
 * Componente que verifica se o SDK MercadoPago.JS V2 está carregado corretamente
 * Este componente deve ser usado em todas as páginas para garantir que o SDK está disponível
 */
export default function MercadoPagoSDKChecker() {
  useEffect(() => {
    const verificarSDK = () => {
      if (typeof window === 'undefined') return;

      // Verificar se o script foi carregado
      if ((window as any).MercadoPago) {
        try {
          // Tentar inicializar o SDK para verificar se está funcionando
          const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
          
          if (publicKey) {
            const mp = new (window as any).MercadoPago(publicKey, {
              locale: 'pt-BR',
              advancedFraudPrevention: true,
            });
            
            console.log('✅ MercadoPago.JS V2 SDK inicializado com sucesso!');
            console.log('✅ SDK configurado corretamente para coleta de device_id e segurança');
            console.log('✅ SDK pronto para ganhar pontos do Mercado Pago');
            
            return true;
          } else {
            console.warn('⚠️ NEXT_PUBLIC_MP_PUBLIC_KEY não configurada no .env.local');
            return false;
          }
        } catch (error) {
          console.error('❌ Erro ao inicializar MercadoPago SDK:', error);
          return false;
        }
      } else {
        // Tentar novamente após um tempo
        setTimeout(verificarSDK, 500);
        return false;
      }
    };

    // Aguardar DOM estar pronto
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      verificarSDK();
    } else {
      window.addEventListener('DOMContentLoaded', verificarSDK);
      window.addEventListener('load', verificarSDK);
    }
  }, []);

  // Este componente não renderiza nada visualmente
  return null;
}

