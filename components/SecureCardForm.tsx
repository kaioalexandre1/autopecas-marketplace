'use client';

import { useState, useEffect, useRef } from 'react';
import { CreditCard, Lock, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface SecureCardFormProps {
  mpInstance: any;
  amount: number;
  onTokenGenerated: (token: string) => void;
  loading?: boolean;
}

export default function SecureCardForm({ mpInstance, amount, onTokenGenerated, loading: externalLoading }: SecureCardFormProps) {
  const [loading, setLoading] = useState(false);
  const [cardNumberError, setCardNumberError] = useState('');
  const [expirationDateError, setExpirationDateError] = useState('');
  const [securityCodeError, setSecurityCodeError] = useState('');
  const [cardholderNameError, setCardholderNameError] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [identificationType, setIdentificationType] = useState('CPF');
  const [identificationNumber, setIdentificationNumber] = useState('');

  // Referências para os containers dos Secure Fields
  const cardNumberRef = useRef<HTMLDivElement>(null);
  const expirationDateRef = useRef<HTMLDivElement>(null);
  const securityCodeRef = useRef<HTMLDivElement>(null);
  const installmentsRef = useRef<HTMLSelectElement>(null);

  // Referências para os objetos Secure Fields
  const cardNumberFieldRef = useRef<any>(null);
  const expirationDateFieldRef = useRef<any>(null);
  const securityCodeFieldRef = useRef<any>(null);

  // Inicializar Secure Fields quando o SDK estiver pronto
  useEffect(() => {
    if (!mpInstance || !cardNumberRef.current) return;

    try {
      // Card Number Field
      if (cardNumberRef.current && !cardNumberFieldRef.current) {
        cardNumberFieldRef.current = mpInstance.fields.create('cardNumber', {
          placeholder: 'Número do cartão',
        });
        cardNumberFieldRef.current.mount(cardNumberRef.current);
        cardNumberFieldRef.current.on('validityChange', (event: any) => {
          setCardNumberError(event.error ? event.error.message : '');
        });
      }

      // Expiration Date Field
      if (expirationDateRef.current && !expirationDateFieldRef.current) {
        expirationDateFieldRef.current = mpInstance.fields.create('expirationDate', {
          placeholder: 'MM/AA',
        });
        expirationDateFieldRef.current.mount(expirationDateRef.current);
        expirationDateFieldRef.current.on('validityChange', (event: any) => {
          setExpirationDateError(event.error ? event.error.message : '');
        });
      }

      // Security Code Field
      if (securityCodeRef.current && !securityCodeFieldRef.current) {
        securityCodeFieldRef.current = mpInstance.fields.create('securityCode', {
          placeholder: 'CVV',
        });
        securityCodeFieldRef.current.mount(securityCodeRef.current);
        securityCodeFieldRef.current.on('validityChange', (event: any) => {
          setSecurityCodeError(event.error ? event.error.message : '');
        });
      }
    } catch (error) {
      console.error('Erro ao criar Secure Fields:', error);
    }

    // Cleanup
    return () => {
      if (cardNumberFieldRef.current) {
        try {
          cardNumberFieldRef.current.unmount();
        } catch (e) {
          console.error('Erro ao desmontar cardNumber:', e);
        }
      }
      if (expirationDateFieldRef.current) {
        try {
          expirationDateFieldRef.current.unmount();
        } catch (e) {
          console.error('Erro ao desmontar expirationDate:', e);
        }
      }
      if (securityCodeFieldRef.current) {
        try {
          securityCodeFieldRef.current.unmount();
        } catch (e) {
          console.error('Erro ao desmontar securityCode:', e);
        }
      }
    };
  }, [mpInstance]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar nome do portador
      if (!cardholderName.trim()) {
        setCardholderNameError('Nome do portador é obrigatório');
        setLoading(false);
        return;
      }
      setCardholderNameError('');

      // Validar documento
      if (!identificationNumber.trim()) {
        setLoading(false);
        toast.error('CPF/CNPJ é obrigatório');
        return;
      }

      // Verificar se os campos estão prontos
      if (!cardNumberFieldRef.current || !expirationDateFieldRef.current || !securityCodeFieldRef.current) {
        toast.error('Os campos do cartão ainda não foram carregados. Aguarde um momento e tente novamente.');
        setLoading(false);
        return;
      }

      // Criar token do cartão usando Secure Fields
      const tokenData: any = {
        cardholderName: cardholderName.trim(),
        identificationType,
        identificationNumber: identificationNumber.replace(/\D/g, ''),
      };

      console.log('📤 Criando token com dados:', { ...tokenData, identificationNumber: '***' });

      try {
        const token = await mpInstance.fields.createCardToken(tokenData);

        if (token && token.id) {
          console.log('✅ Token criado com sucesso:', token.id);
          onTokenGenerated(token.id);
        } else {
          console.error('❌ Token não retornou ID:', token);
          throw new Error(token?.message || 'Erro ao criar token do cartão');
        }
      } catch (tokenError: any) {
        console.error('❌ Erro ao criar token:', tokenError);
        const errorMessage = tokenError?.message || tokenError?.error || 'Erro ao criar token do cartão. Verifique os dados e tente novamente.';
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error('Erro ao criar token:', error);
      toast.error(error?.message || 'Erro ao processar cartão. Verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCPF = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    }
    return value;
  };

  const formatCNPJ = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length <= 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return value;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 dark:text-white">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="w-5 h-5 text-green-500" />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Dados protegidos por PCI Compliance
          </span>
        </div>

        {/* Número do Cartão */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Número do cartão
          </label>
          <div
            ref={cardNumberRef}
            id="cardNumber"
            className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
            style={{ minHeight: '42px' }}
          />
          {cardNumberError && (
            <p className="mt-1 text-sm text-red-500">{cardNumberError}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Data de Validade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Validade
            </label>
            <div
              ref={expirationDateRef}
              id="expirationDate"
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              style={{ minHeight: '42px' }}
            />
            {expirationDateError && (
              <p className="mt-1 text-sm text-red-500">{expirationDateError}</p>
            )}
          </div>

          {/* Código de Segurança */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              CVV
            </label>
            <div
              ref={securityCodeRef}
              id="securityCode"
              className="p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
              style={{ minHeight: '42px' }}
            />
            {securityCodeError && (
              <p className="mt-1 text-sm text-red-500">{securityCodeError}</p>
            )}
          </div>
        </div>

        {/* Nome do Portador */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nome do portador <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={cardholderName}
            onChange={(e) => {
              setCardholderName(e.target.value);
              setCardholderNameError('');
            }}
            placeholder="Nome como está no cartão"
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
          {cardholderNameError && (
            <p className="mt-1 text-sm text-red-500">{cardholderNameError}</p>
          )}
        </div>

        {/* Tipo de Documento e Número */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select
              value={identificationType}
              onChange={(e) => setIdentificationType(e.target.value)}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {identificationType === 'CPF' ? 'CPF' : 'CNPJ'} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={identificationNumber}
              onChange={(e) => {
                const formatted = identificationType === 'CPF' 
                  ? formatCPF(e.target.value) 
                  : formatCNPJ(e.target.value);
                setIdentificationNumber(formatted);
              }}
              placeholder={identificationType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
              maxLength={identificationType === 'CPF' ? 14 : 18}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>

        {/* Botão de Submit */}
        <button
          type="submit"
          disabled={loading || externalLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-md transition-colors flex items-center justify-center gap-2"
        >
          {loading || externalLoading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Pagar R$ {amount.toFixed(2).replace('.', ',')}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

