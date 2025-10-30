export type UserType = 'oficina' | 'autopeca' | 'entregador' | 'sistema';
export type RamoVeiculo = 'CARRO' | 'MOTO' | 'CAMINHÃO' | 'ÔNIBUS';

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
  condicaoPeca: 'Nova' | 'Usada'; // Obrigatório: condição da peça
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
  valorDentroC idade: number;
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

