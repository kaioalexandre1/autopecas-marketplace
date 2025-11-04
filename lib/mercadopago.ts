/**
 * Utilitário global para gerenciar a instância do MercadoPago SDK V2
 * Este arquivo garante que o SDK seja inicializado corretamente e que
 * o device_id seja coletado automaticamente para ganhar pontos no Mercado Pago
 */

let mpInstance: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

/**
 * Inicializa o SDK MercadoPago.JS V2
 * Retorna uma Promise que resolve quando o SDK está pronto
 */
export function initializeMercadoPago(): Promise<any> {
  // Se já está inicializado, retornar a instância
  if (mpInstance) {
    return Promise.resolve(mpInstance);
  }

  // Se já está inicializando, retornar a promise existente
  if (isInitializing && initPromise) {
    return initPromise;
  }

  isInitializing = true;

  initPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      isInitializing = false;
      reject(new Error('MercadoPago SDK só pode ser inicializado no cliente'));
      return;
    }

    const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;
    
    if (!publicKey) {
      isInitializing = false;
      reject(new Error('NEXT_PUBLIC_MP_PUBLIC_KEY não configurada'));
      return;
    }

    // Função para tentar inicializar
    const tryInit = () => {
      if ((window as any).MercadoPago) {
        try {
          // Inicializar SDK com configurações recomendadas
          mpInstance = new (window as any).MercadoPago(publicKey, {
            locale: 'pt-BR',
            advancedFraudPrevention: true, // IMPORTANTE: Ativa coleta automática do device_id
          });

          console.log('✅ MercadoPago.JS V2 SDK inicializado com sucesso');
          console.log('✅ Device ID será coletado automaticamente');
          
          isInitializing = false;
          resolve(mpInstance);
        } catch (error) {
          isInitializing = false;
          console.error('❌ Erro ao inicializar MercadoPago SDK:', error);
          reject(error);
        }
      } else {
        // SDK ainda não carregou, tentar novamente
        setTimeout(tryInit, 100);
      }
    };

    // Verificar se já está disponível
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      tryInit();
    } else {
      window.addEventListener('DOMContentLoaded', tryInit);
      window.addEventListener('load', tryInit);
    }

    // Timeout após 10 segundos
    setTimeout(() => {
      if (isInitializing) {
        isInitializing = false;
        reject(new Error('MercadoPago SDK não carregou após 10 segundos'));
      }
    }, 10000);
  });

  return initPromise;
}

/**
 * Obtém a instância do MercadoPago SDK
 * Se não estiver inicializada, inicializa automaticamente
 */
export async function getMercadoPagoInstance(): Promise<any> {
  if (mpInstance) {
    return mpInstance;
  }
  return await initializeMercadoPago();
}

/**
 * Obtém o device_id do SDK MercadoPago
 * O device_id é coletado automaticamente quando o SDK é inicializado com advancedFraudPrevention: true
 * 
 * IMPORTANTE: O device_id é necessário para ganhar 2 pontos no Mercado Pago
 * Ele é coletado automaticamente e enviado nas requisições de pagamento
 */
export async function getDeviceId(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') {
      return null;
    }

    // Primeiro, garantir que o SDK está inicializado
    const instance = await getMercadoPagoInstance().catch(() => null);
    
    if (!instance) {
      console.warn('⚠️ Instância do MercadoPago não disponível');
      return null;
    }

    // Tentar obter device_id da instância
    // O SDK V2 com advancedFraudPrevention coleta automaticamente
    // O device_id pode ser acessado através de alguns métodos:

    // Método 1: Tentar getDeviceId() se disponível
    if (typeof instance.getDeviceId === 'function') {
      try {
        const deviceId = instance.getDeviceId();
        if (deviceId) {
          console.log('✅ Device ID obtido via getDeviceId():', deviceId);
          return deviceId;
        }
      } catch (e) {
        // Método pode não estar disponível
      }
    }

    // Método 2: Verificar propriedade device_id
    if (instance.device_id) {
      console.log('✅ Device ID obtido da propriedade device_id:', instance.device_id);
      return instance.device_id;
    }

    // Método 3: Verificar objeto global MercadoPago
    if ((window as any).MercadoPago) {
      const globalMp = (window as any).MercadoPago;
      if (globalMp.device_id) {
        console.log('✅ Device ID obtido do objeto global:', globalMp.device_id);
        return globalMp.device_id;
      }
    }

    // Método 4: O device_id pode estar sendo coletado automaticamente
    // O SDK V2 envia o device_id automaticamente nos headers HTTP quando
    // advancedFraudPrevention está ativado
    console.log('ℹ️ Device ID será coletado automaticamente pelo SDK V2 via headers HTTP');
    console.log('ℹ️ O SDK V2 com advancedFraudPrevention envia o device_id automaticamente nas requisições');
    
    // Retornar null não é crítico, pois o SDK V2 coleta automaticamente
    // O backend do Mercado Pago consegue coletar o device_id dos headers HTTP
    return null;
  } catch (error) {
    console.error('❌ Erro ao obter device_id:', error);
    return null;
  }
}

/**
 * Verifica se o SDK está pronto
 */
export function isMercadoPagoReady(): boolean {
  return mpInstance !== null;
}

/**
 * Força reinicialização do SDK (útil para testes)
 */
export function resetMercadoPagoInstance(): void {
  mpInstance = null;
  isInitializing = false;
  initPromise = null;
}

