export interface DowntimeLog {
  id: string;
  name: string;
  start: string;
  end: string;
  duration: number; // in minutes
}

export interface Supplier {
  id: string;
  name: string;
  cnpj: string;
  IE: string;
  categories: string[];
  rating: number; // e.g., 95, 92
  status: 'Ativo' | 'Em Homologação' | 'Bloqueado';
  contact: string;
  contactEmail: string;
  lastDelivery: string;
  address: string;
  limit: number; // e.g. 450000
  logo: string;
  auditDate: string;
  paymentTerm: string;
  currency: string;
  documents: SupplierDocument[];
  history: SupplierHistoryOP[];
  passa_triagem?: boolean;
  extraido_rotulo?: boolean;
  moagem_inicia_lavagem?: boolean;
  lavagem_a_seco?: boolean;
  possui_lavadora?: boolean;
  possui_tanque_decantacao?: boolean;
  possui_secadora?: boolean;
  possui_sopro_silo_bag?: boolean;
}

export interface Funcionario {
  id: string;
  nome: string;
  cargo?: string;
  ativo?: boolean;
  extrusora_id?: string;
  extrusora?: Extrusora; // Para JOINs
  vendedor?: boolean;
  cpf?: string;
}

export interface Extrusora {
  id: string;
  codigo: string;
  numero: string;
  created_at?: string;
  empresa_id?: string;
}

export interface EstadoTributo {
  id: string;
  empresa_id: string;
  uf: string;
  nome: string;
  aliquota_imposto: number;
  created_at?: string;
}

export interface ArquivoPlanejamento {
  id: string;
  empresa_id: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number;
  excluido: boolean;
  criado_em: string;
  criado_por?: string;
}

export interface SupplierDocument {
  id: string;
  name: string;
  type: string;
  issueDate: string;
  expiryDate: string;
  status: 'Válido' | 'Expirado';
}

export interface SupplierHistoryOP {
  id: string;
  date: string;
  item: string;
  amount: string;
  value: string;
  status: string;
}

export interface OrderLine {
  itemNum: string;
  product: string;
  measure: string;
  totalQtd: number;
  produced: number;
  tempoPeca: number; // in seconds
  extruder: string;
  eta: string;
  status: 'Em Produção' | 'Finalizado' | 'Aberto';
}

export interface Order {
  id: string; // e.g. PED-2024-015
  clientName: string;
  location: string;
  emissionDate: string;
  deliveryDate: string;
  status?: 'ATIVO' | 'FINALIZADO' | 'AGUARDANDO_APROVACAO' | 'CANCELADO';
  totalProduced: number;
  totalVolume: number;
  efficiency: number; // e.g. 94.2
  timeEstimated: number; // e.g. 48 hours
  items: OrderLine[];
  condicao_pagamento?: string;
  comissao_venda_percentual?: number;
  data_recebimento_personalizada?: string;
}

export interface DailyProductionSetup {
  date: string;
  orderId: string;
  clientName: string;
  team: string[];
  deadline: string;
  hoursAvailable: number;
  checklists: {
    limpeza: boolean;
    residualAnterior: boolean;
    temperaturas: boolean;
    rotacaoRosca: boolean;
    alimentacaoMaquina: boolean;
    bagPosicionado: boolean;
    operadorOk: boolean;
  };
}

export interface ReschedulingDetail {
  orderId: string;
  client: string;
  previousBalance: number;
  recalculated: number;
  deltaTime: string; // e.g. "-12min" or "+22min"
  status: 'Em Produção' | 'Reprogramado' | 'Finalizado';
}

export interface PunctualityRecord {
  id: string;
  date: string; // Dia (e.g. DD/MM/YYYY)
  arrivalTime: string; // Hora que chegou (e.g. 08:00)
  lunchStart: string; // Hora de parada pra almoço (e.g. 12:00)
  lunchEnd: string; // Hora de retorno (e.g. 13:00)
  departureTime: string; // Hora de saída (e.g. 17:00)
}

export interface EmployeeQualities {
  empilhadeira: boolean; // Operação de Empilhadeira
  laser: boolean; // Operação de Laser
  habilitadoDirigir: boolean; // Habilitado para dirigir
  lixadeira: boolean; // Operação de Lixadeira
  controleQualidade: boolean; // Controle de Qualidade de Matéria Prima
  extrusorNivel1: boolean; // Extrusor Nível 1
  extrusorNivel2: boolean; // Extrusor Nível 2
}

export interface Employee {
  id: string; // Código
  firstName: string; // Nome
  lastName: string; // Sobrenome
  birthDate: string; // Data de Nascimento
  civilStatus: string; // Estado Civil
  address: string; // Endereço
  city: string; // Cidade
  state: string; // Estado
  zipCode: string; // CEP

  // Segundo bloco
  admissionDate: string; // Data da Admissão
  role: string; // Função
  hourlyWage: number; // Salário Hora
  workingHoursRegime: number; // Regime de Horas (default is 8)

  // Terceiro Bloco
  punctualityHistory: PunctualityRecord[];

  // Checklist Qualities
  qualities: EmployeeQualities;
  customId?: string;
}

export interface RawMaterialSupplierRating {
  supplierId: string; // Fornecedor ID
  averagePrice: number; // Preço Médio (R$)
  punctualityRating: number; // Ranking de Pontualidade (0-100 ou estrelas)
  qualityRating: number; // Ranking de Qualidade (0-100 ou estrelas)
}

export interface RawMaterial {
  id: string; // Código
  description: string; // Descrição
  purchaseUnit: 'Kg' | 'Litro' | 'Metro'; // Unidade de Compra
  supplierId: string; // Fornecedor Principal (Selecionado do menu suspenso)

  // Segundo Bloco: Histórico
  lastPurchaseDate: string; // Última Compra
  lastPurchasePrice: number; // R$ Última Compra
  lastPurchaseQty: number; // Qtd Última compra
  currentStock: number; // Estoque Atual

  // Terceiro Bloco: Ranking de Fornecedores
  supplierRankings: RawMaterialSupplierRating[];

  category?: 'POLIMERO' | 'QUIMICO' | 'EMBALAGEM/OUTROS' | 'ACO' | 'QUIMICO' | 'EMBALAGEM' | 'OUTROS' | string;
  peso_nominal_kg_m?: number | string | null;
  bitola_mm?: number | string | null;
}

export interface Cliente {
  id: string;
  razao_social: string;
  cnpj: string;
  telefone?: string;
  email?: string;
  endereco_entrega?: string;
  uf?: string;
  tipo_cliente?: 'REVENDA' | 'INDUSTRIALIZACAO' | 'CONSUMIDOR_FINAL' | string;
  contribuinte_icms?: boolean;
  status: 'Ativo' | 'Inativo';
}

export type PermissoesUsuario = {
  dashboard?: boolean;
  estoque?: boolean;
  pedidos?: boolean;
  apontamento?: boolean;
  reprogramacao?: boolean;
  fornecedores?: boolean;
  funcionarios?: boolean;
  'materias-primas'?: boolean;
  'familias-skus'?: boolean;
  'bom-formulas'?: boolean;
  arquivos?: boolean;
  configuracoes?: boolean;
  acessos?: boolean;
  clientes?: boolean;
  financeiro?: boolean;
  'formacao-preco'?: boolean;
  [key: string]: boolean | undefined;
};

export interface NivelAcesso {
  id: string;
  nome_nivel: string;
  nome?: string;
  permissoes: PermissoesUsuario;
}

export interface CustoFixo {
  id: string;
  empresa_id: string;
  descricao: string;
  valor_mensal: number;
  competencia_mes: string; // YYYY-MM-DD
  created_at?: string;
}

export interface TituloFinanceiro {
  id: string;
  empresa_id: string;
  tipo: 'PAGAR' | 'RECEBER';
  descricao: string;
  valor: number;
  data_vencimento: string; // YYYY-MM-DD
  data_liquidacao: string | null; // YYYY-MM-DD
  status: 'PENDENTE' | 'PAGO' | 'ANTECIPADO' | 'CANCELADO';
  cliente_id?: string | null;
  fornecedor_id?: string | null;
  pedido_id?: string | null;
  created_at?: string;
  clientes?: { razao_social: string };
  fornecedores?: { nome: string };
  pedidos?: {
    codigo: string;
    clientes?: { razao_social: string };
    ordens_producao?: Array<{
      quantidade_planejada: number;
      skus?: {
        comprimento_mm: number;
        familias_produto?: {
          nome: string;
        };
      };
    }>;
  } | null;
}

export interface PrecificacaoParametros {
  id: string;
  empresa_id: string;
  familia_id: string;
  margem_minima_saudavel: number;
  margem_operacional_limite: number;
}


