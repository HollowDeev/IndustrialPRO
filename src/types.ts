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
  orderDate: string;
  items: string;
  totalValue: number;
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
  status?: 'ATIVO' | 'FINALIZADO';
  totalProduced: number;
  totalVolume: number;
  efficiency: number; // e.g. 94.2
  timeEstimated: number; // e.g. 48 hours
  items: OrderLine[];
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
}

