export type UserType = 'oficina' | 'autopeca' | 'entregador' | 'sistema';
export type RamoVeiculo = 'CARRO' | 'MOTO' | 'CAMINHÃO' | 'ÔNIBUS';
export type PlanoAssinatura = 'basico' | 'premium' | 'gold' | 'platinum';

export interface User {
  id: string;
  tipo: UserType;
  documento: string; // CPF ou CNPJ
  nome: string;
  telefone: string;
  endereco: string;
  cidade: string; // Cidade principal do usuário
  ramo: RamoVeiculo; // Ramo principal de atuação
  cep?: string;
  bairro?: string;
  numero?: string;
  complemento?: string;
  role?: 'admin' | 'user'; // Permissão de administrador
  nomeLoja?: string; // Nome da loja/estabelecimento
  temaDark?: boolean; // Tema dark ativado
  
  // Campos de Assinatura (apenas para autopeças)
  plano?: PlanoAssinatura; // Plano de assinatura
  ofertasUsadas?: number; // Ofertas usadas no mês atual
  mesReferenciaOfertas?: string; // Mês de referência (formato: "2025-01")
  assinaturaAtiva?: boolean; // Se a assinatura está ativa
  dataProximoPagamento?: Date; // Data do próximo pagamento
  subscriptionId?: string; // ID da assinatura recorrente no Mercado Pago (para pagamentos automáticos)
  contaBloqueada?: boolean; // Se a conta foi bloqueada pelo admin
  testePlatinumUsado?: boolean; // Se já usou o teste de 30 dias grátis do Platinum
  dataInicioTestePlatinum?: Date; // Data em que iniciou o teste de 30 dias
  linkAprovacaoPlatinum?: string; // Link para aprovar novo Preapproval após trial
  
  createdAt: Date;
}

export interface Pedido {
  id: string;
  oficinaId: string;
  oficinaNome: string;
  cidade: string; // Cidade onde o pedido foi criado
  ramo: RamoVeiculo; // Tipo de veículo (CARRO, MOTO, CAMINHÃO, ÔNIBUS)
  nomePeca: string;
  marcaCarro: string;
  modeloCarro: string;
  anoCarro: string;
  condicaoPeca: 'Nova' | 'Usada' | 'Nova ou Usada'; // Obrigatório: condição da peça
  especificacaoMotor?: string; // Opcional: Ex: 1.0, 2.0, 1.6
  notaFiscal?: string; // Opcional: 'com nota' ou 'sem nota'
  observacao?: string; // Opcional: observações extras
  status: 'ativo' | 'fechado' | 'cancelado';
  ofertas: Oferta[];
  menorPreco?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Oferta {
  id: string;
  pedidoId: string;
  autopecaId: string;
  autopecaNome: string;
  preco: number;
  observacao?: string;
  createdAt: Date;
}

export interface Chat {
  id: string;
  pedidoId: string;
  oficinaId: string;
  autopecaId: string;
  oficinaNome: string;
  autopecaNome: string;
  nomePeca: string;
  marcaCarro: string;
  modeloCarro: string;
  anoCarro: string;
  mensagens: Mensagem[];
  encerrado?: boolean;
  encerradoPor?: string;
  encerradoEm?: Date;
  // Última vez que cada usuário leu o chat
  ultimaLeituraOficina?: Date;
  ultimaLeituraAutopeca?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Mensagem {
  id: string;
  remetenteId: string;
  remetenteTipo: UserType;
  texto?: string;
  imagemUrl?: string;
  createdAt: Date;
}

export interface NegocioFechado {
  id: string;
  pedidoId: string;
  oficinaId: string;
  oficinaNome: string;
  autopecaId: string;
  autopecaNome: string;
  nomePeca: string;
  marcaCarro?: string;
  modeloCarro?: string;
  anoCarro?: string;
  valorFinal: number;
  createdAt: Date;
}

export interface Entregador {
  id: string;
  nome: string;
  telefone: string;
  whatsapp: string;
  valorDentroCidade: number;
  cidade: string;
  ativo: boolean;
  createdAt: Date;
}

export interface OfertaFrete {
  id: string;
  entregadorId: string;
  entregadorNome: string;
  chatId: string;
  pedidoId: string;
  valorFrete: number;
  prazoEntrega: string; // Ex: "2-3 dias úteis"
  observacoes?: string;
  status: 'pendente' | 'aceita' | 'rejeitada';
  createdAt: Date;
  updatedAt: Date;
}

export interface Assinatura {
  id: string;
  autopecaId: string;
  autopecaNome: string;
  plano: PlanoAssinatura;
  valor: number;
  status: 'ativa' | 'cancelada' | 'pendente' | 'vencida';
  dataInicio: Date;
  dataFim: Date;
  renovacaoAutomatica: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Pagamento {
  id: string;
  autopecaId: string;
  autopecaNome: string;
  assinaturaId: string;
  plano: PlanoAssinatura;
  valor: number;
  metodoPagamento: 'mercadopago' | 'pix' | 'boleto' | 'cartao';
  statusPagamento: 'pendente' | 'aprovado' | 'recusado' | 'cancelado';
  mercadoPagoId?: string; // ID do pagamento no Mercado Pago
  subscriptionId?: string; // ID da assinatura recorrente (quando pagamento via cartão com renovação automática)
  pixCopiaECola?: string; // Código PIX
  linkPagamento?: string; // Link para pagamento
  dataVencimento?: Date;
  dataPagamento?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Limites de ofertas por plano
export const LIMITES_PLANOS = {
  basico: 20,
  premium: 100,
  gold: 200,
  platinum: -1, // -1 = ilimitado
};

// Preços dos planos
export const PRECOS_PLANOS = {
  basico: 0,
  premium: 390.00, // Silver
  gold: 590.00,
  platinum: 990.00,
} as const;

