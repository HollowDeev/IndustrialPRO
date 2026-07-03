import { Supplier, Order, ReschedulingDetail } from './types';

export const INITIAL_ORDERS: Order[] = [
  {
    id: "PED-2024-015",
    clientName: "Alcopla Plásticos Ltda",
    location: "São Paulo - Polo Industrial",
    emissionDate: "12 Out 2023",
    deliveryDate: "2023-11-25",

    totalProduced: 6450,
    totalVolume: 10000,
    efficiency: 94.2,
    timeEstimated: 48,
    items: [
      { itemNum: "01", product: "Perfil PVC Flexível Cristal", measure: "20x2.5mm", totalQtd: 2000, produced: 1450, tempoPeca: 1.2, extruder: "EXT-04", eta: "Hoje, 17:00", status: "Em Produção" },
      { itemNum: "02", product: "Tubo Rígido Industrial Cinza", measure: "Ø 50mm", totalQtd: 1500, produced: 1500, tempoPeca: 2.5, extruder: "EXT-02", eta: "Finalizado", status: "Finalizado" },
      { itemNum: "03", product: "Canto de Acabamento Branco", measure: "15x15mm", totalQtd: 5000, produced: 200, tempoPeca: 0.8, extruder: "EXT-09", eta: "Amanhã, 10:00", status: "Em Produção" },
      { itemNum: "04", product: "Mangueira Atóxica Reforçada", measure: "3/4\"", totalQtd: 800, produced: 0, tempoPeca: 4.0, extruder: "EXT-01", eta: "Aguardando", status: "Aberto" },
      { itemNum: "05", product: "Guarnição Vedação Neoprene", measure: "12x5mm", totalQtd: 3000, produced: 3000, tempoPeca: 1.5, extruder: "EXT-04", eta: "Finalizado", status: "Finalizado" },
      { itemNum: "06", product: "Rodapé Poliestireno Preto", measure: "100mm", totalQtd: 1200, produced: 1200, tempoPeca: 5.2, extruder: "EXT-12", eta: "Finalizado", status: "Finalizado" },
      { itemNum: "07", product: "Tubo Irrigação Gotejamento", measure: "16mm", totalQtd: 10000, produced: 1800, tempoPeca: 0.4, extruder: "EXT-07", eta: "Seg, 08:00", status: "Em Produção" },
      { itemNum: "08", product: "Cantoneira Alumínio Revestida", measure: "1\" x 1\"", totalQtd: 500, produced: 0, tempoPeca: 6.5, extruder: "EXT-01", eta: "Aguardando", status: "Aberto" }
    ]
  },
  {
    id: "PED-2023-9982",
    clientName: "Logística Express S.A.",
    location: "Campinas - SP",
    emissionDate: "05 Out 2023",
    deliveryDate: "2023-11-10",

    totalProduced: 4210,
    totalVolume: 4500,
    efficiency: 98,
    timeEstimated: 12,
    items: [
      { itemNum: "01", product: "Chapa de Aço 1020", measure: "500kg", totalQtd: 4500, produced: 4210, tempoPeca: 12, extruder: "EXT-04", eta: "Hoje, 11:45", status: "Em Produção" }
    ]
  },
  {
    id: "PED-2023-9985",
    clientName: "Indústrias Metalúrgicas Sul",
    location: "Porto Alegre - RS",
    emissionDate: "10 Out 2023",
    deliveryDate: "2023-11-20",

    totalProduced: 8240,
    totalVolume: 16000,
    efficiency: 85,
    timeEstimated: 74,
    items: [
      { itemNum: "01", product: "Parafusos M12", measure: "5000un", totalQtd: 16000, produced: 8240, tempoPeca: 6, extruder: "EXT-02", eta: "Reprogramado", status: "Aberto" }
    ]
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: "SUP-001",
    name: "SteelTech Soluções Metálicas",
    cnpj: "12.345.678/0001-90",
    IE: "145.228.390.110",
    categories: ["Matéria-Prima", "Insumos"],
    rating: 95,
    status: "Ativo",
    contact: "Roberto Mendes",
    contactEmail: "roberto.m@steeltech.com.br",
    lastDelivery: "15 Out 2023",
    address: "Av. Industrial, 4500 - Distrito Norte, São Bernardo do Campo, SP, CEP: 09750-000",
    limit: 450000,
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuAdYuWOBUw7R4yCT55-I6FccJRne8JSUPrQG4iMckOBt0Shsfp0HbJh_j5iW_YtQMiVfCYpWrabK1oiBQ1cT96dEspfHy0TDPBhmvchXj3aD_XZmBnxAKnXyQlmoRnGY338GhTGLt909BP4zhMwsa_ZfMdm2v_VfoZDhyoOrZtyXMylGyKNNe7OVk2NBeoznZ6HpRMkLyPC90YqIclQUViGLu2gx-sNY8mG5JKq_sKNOsWusVdy7GAzxYqclKWRs3GgBmQ460ZBVk0",
    auditDate: "15 Out, 2023",
    paymentTerm: "28/45 Dias",
    currency: "BRL (R$)",
    documents: [
      { id: "doc-1", name: "Certificação ISO 9001:2015", type: "Qualidade", issueDate: "10/01/2023", expiryDate: "10/01/2026", status: "Válido" },
      { id: "doc-2", name: "Alvará de Funcionamento", type: "Legal", issueDate: "05/06/2023", expiryDate: "05/06/2027", status: "Válido" },
      { id: "doc-3", name: "Licença Ambiental (CETESB)", type: "Operacional", issueDate: "20/01/2022", expiryDate: "20/01/2023", status: "Expirado" }
    ],
    history: [
      { id: "#OP-88291", date: "12 Nov, 2023", item: "Chapa de Aço 1020 (500kg), Perfil U (20un)", amount: "520 unid", value: "R$ 14.500,00", status: "Em Produção" },
      { id: "#OP-87910", date: "28 Out, 2023", item: "Parafusos M12 (5000un), Arruelas (5000un)", amount: "10000 unid", value: "R$ 2.340,00", status: "Finalizado" },
      { id: "#OP-87402", date: "15 Out, 2023", item: "Tubo Redondo 2\" (100m), Joelho 90º (50un)", amount: "150 unid", value: "R$ 8.900,00", status: "Finalizado" }
    ]
  },
  {
    id: "SUP-002",
    name: "Metalúrgica Precision S.A.",
    cnpj: "12.345.678/0001-90",
    IE: "987.654.321.110",
    categories: ["Matéria-prima"],
    rating: 92,
    status: "Ativo",
    contact: "Roberto Silveira",
    contactEmail: "roberto@precision.com.br",
    lastDelivery: "12 Out 2023",
    address: "Rua das Rosas, 100, Diadema - SP",
    limit: 350000,
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCqInOn8zxMI-gHj_CKhsZDLE98Biv0XlQ6_NBRHWe56GK9seehX9JhNBnjo3yHHkHvU8lKfjdl6_Cv7K-746BtzwwrtZf50Lvyio10uV32ey4-ga3H5JFHnc76GCHvyo0-5RjtXuXGSOGuZskN1mePSK050ilo2YUaEit4T86109MVuP-ZJenlRUOADSYitu7fBxq0pUETt7mKOC8CoO9lZn7ZLTMEevIgL6thGcS-8zerkd42tofoyfXjMt0sdZOh6-Q1V21y6BU",
    auditDate: "20 Out, 2023",
    paymentTerm: "30 Dias",
    currency: "BRL (R$)",
    documents: [],
    history: []
  },
  {
    id: "SUP-003",
    name: "Logística Global Express",
    cnpj: "98.765.432/0001-21",
    IE: "348.910.220.120",
    categories: ["Serviços"],
    rating: 65,
    status: "Em Homologação",
    contact: "Carla Mendes",
    contactEmail: "contato@globalexp.log",
    lastDelivery: "05 Set 2023",
    address: "Rodovia Castelo Branco, Km 43, Barueri - SP",
    limit: 120000,
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuAk2T4A0-_kThL3yYq8Zn4aV9zMZ1xAUsqQyQMTfqMTcfEUyyl-MR8FOwoj5Fxa_SLpcQ3p6sMjBvGOAwXl9_OV7lqD0MSLzDFcva2e3yOxFa0_Q1_yX9nAgLUQA-iunO5bOCUubrLsytneWzNaaFG6uz0mM4Q-btBBO8fa1b-JiONhqRQ0Cax3gnjocMwu4sQVkqsPPJyhrUSvoZ2Zqtxxe7Uo6XCgL6IPiOgesZHzgx_PzfMlhnjA1XmERWU96yl50DJDQCa1NBc",
    auditDate: "N/A",
    paymentTerm: "15 Dias",
    currency: "BRL (R$)",
    documents: [],
    history: []
  },
  {
    id: "SUP-004",
    name: "Polímeros Norte Ltda.",
    cnpj: "45.678.910/0002-33",
    IE: "123.456.789.233",
    categories: ["Insumos"],
    rating: 98,
    status: "Ativo",
    contact: "André Ramos",
    contactEmail: "andre.polimeros@uol.com",
    lastDelivery: "28 Out 2023",
    address: "Av. Governador Mario Covas, 1002, Jacareí - SP",
    limit: 600000,
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuBScDmwan5-5Cus20bUGglCX8Z4N3r03COSaSDNYLQYAmkG0NbihG_vFqMVE7ClwQRTJaasA85M2ZiTCOKzVxzBZsNi8BBJXg2n-NVMu-VBcLPG4f7Nk6YBrPH3geARn21Ix1XvOcb3xXerK6ZcMOELbwxvPcA1DwICqrCEFuRTIP-JNIRC2VEwLATMCT6KbnrOBph9Cw15myXW8QZkkrHbboKTnStSHkivDgK7sAevrudlJhl69KQ_xw4-GbPX70ob7JDo7NrkB3M",
    auditDate: "28 Out, 2023",
    paymentTerm: "30/60 Dias",
    currency: "BRL (R$)",
    documents: [],
    history: []
  },
  {
    id: "SUP-005",
    name: "Mecânica Industrial Sul",
    cnpj: "11.222.333/0001-44",
    IE: "Isento",
    categories: ["Manutenção"],
    rating: 15,
    status: "Bloqueado",
    contact: "Ricardo Alvez",
    contactEmail: "sac@mecanicasul.com",
    lastDelivery: "15 Jan 2023",
    address: "Rua do Oratório, 3105, Caxias do Sul - RS",
    limit: 50000,
    logo: "https://lh3.googleusercontent.com/aida-public/AB6AXuCYVEN6zfDK9eAxM0sQeN4hmYIhtc0hqblAuOtUy_-7yEmRMftja3Le89HpELpRfuyAAl5GfEBf5iEikjhpAZjCVi6ZkcO8gszUrNu-96DZMiwwJkUL6db08bqgmCkqXWDozmuFOfpMs9pa5CNZBbtcqdLKeki-iQ6-pqGJj62GwyZGrqWmRIRRjAeVfFaskUUeGKDN9NdlVvNh05y-KWPheIIQSEx1M14U1l0LKaYvV7fw4pEa4H04nM7pHQ3Ng7gGXnnJM-VSakg",
    auditDate: "N/A",
    paymentTerm: "À vista",
    currency: "BRL (R$)",
    documents: [],
    history: []
  }
];

export const RESCHEDULING_ORDERS: ReschedulingDetail[] = [
  { orderId: "#ORD-9982", client: "Logística Express S.A.", previousBalance: 4500, recalculated: 4210, deltaTime: "-12min", status: "Em Produção" },
  { orderId: "#ORD-9985", client: "Indústrias Metalúrgicas Sul", previousBalance: 8000, recalculated: 8240, deltaTime: "+22min", status: "Reprogramado" },
  { orderId: "#ORD-9989", client: "Distribuidora Global LTDA", previousBalance: 1200, recalculated: 0, deltaTime: "0min", status: "Finalizado" }
];
