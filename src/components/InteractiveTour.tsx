"use client";

import React, { useEffect, useImperativeHandle, forwardRef, useState, useRef } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface InteractiveTourHandle {
  startTour: () => void;
  startOverviewTour: () => void;
  startPracticalTour: () => void;
}

interface InteractiveTourProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  setIsAddingNewSupplier?: (val: boolean) => void;
  setTriggerAddMaterial?: React.Dispatch<React.SetStateAction<number>>;
  setTriggerAddFamily?: React.Dispatch<React.SetStateAction<number>>;
  setTriggerAddEstoque?: React.Dispatch<React.SetStateAction<number>>;
  setIsAddOrderModalOpen?: (val: boolean) => void;
}

const STORAGE_KEY = "kore_industrial_tour_seen_v1";

// Helper para preenchimento de inputs sem persistir no banco
const simulateFillInput = (selector: string, value: string) => {
  try {
    const el = document.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement | null;
    if (el) {
      el.focus();
      el.value = value;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } catch (e) {
    console.warn("Erro ao simular input:", e);
  }
};

export const InteractiveTour = forwardRef<InteractiveTourHandle, InteractiveTourProps>(
  (
    {
      currentScreen,
      setCurrentScreen,
      setIsAddingNewSupplier,
      setTriggerAddMaterial,
      setTriggerAddFamily,
      setTriggerAddEstoque,
      setIsAddOrderModalOpen,
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const driverInstanceRef = useRef<any>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // ----------------------------------------------------
    // TOUR 1: VISÃO GERAL & ARQUITETURA EXECUTIVA
    // ----------------------------------------------------
    const runOverviewTour = () => {
      setIsChoiceModalOpen(false);
      if (currentScreen !== "dashboard") {
        setCurrentScreen("dashboard");
      }

      setTimeout(() => {
        const steps: DriveStep[] = [
          {
            popover: {
              title: "🏭 Bem-vindo ao Kore Industrial",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Este software é um <strong>ERP & MRP Industrial de Alta Precisão</strong>, desenvolvido sob medida para automação e controle operacional de fábricas de coextrusão (tubos, perfis poliméricos e cabos com alma de aço).
                  </p>
                  <div style="background: #f8fafc; border-left: 4px solid #fd790b; padding: 10px 12px; border-radius: 6px; margin: 10px 0; font-size: 12px; color: #334155;">
                    <strong style="color: #002046;">💡 Para quem é leigo no assunto:</strong><br/>
                    Fabricar perfis industriais exige misturar resinas derretidas, aditivos químicos e fitas de aço em medidas micrométricas. Sem um sistema inteligente, a fábrica perde milhões com refugo e falta de matéria-prima. Este software calcula e audita tudo em tempo real.
                  </div>
                  <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
                    Clique em <strong>Próximo →</strong> para conhecer a torre de controle da fábrica!
                  </p>
                </div>
              `,
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#kore-logo-container",
            popover: {
              title: "🧭 Navegação Modular & Atalhos",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    O sistema foi estruturado em três pilares: <strong>Cadastros de Engenharia</strong>, <strong>Chão de Fábrica (PCP)</strong> e <strong>Cérebro Financeiro</strong>.
                  </p>
                  <div style="background: #eff6ff; border-left: 4px solid #002046; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e3a8a;">
                    <strong>⌨️ Atalho de Teclado:</strong> Pressione a tecla <u>'S'</u> a qualquer momento para recolher ou expandir a barra lateral e ganhar espaço de tela na fábrica.
                  </div>
                </div>
              `,
              side: "right",
              align: "start",
            },
          },
          {
            element: "#tour-nav-action-btn",
            popover: {
              title: "⚡ Ação Rápida: Emissão de Pedidos",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Este botão contextual se adapta dinamicamente à tela em que você estiver. Aqui na Central, ele abre o modal de <strong>Novo Pedido</strong> (atalho tecla <strong>'N'</strong>).
                  </p>
                  <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #9a3412;">
                    <strong>A mágica por trás:</strong> Ao fechar um pedido comercial, o sistema executa a 'explosão de engenharia': converte metros encomendados em quilos de polímero e bobinas de aço instantaneamente.
                  </div>
                </div>
              `,
              side: "right",
              align: "end",
            },
          },
          {
            element: "#tour-dashboard-kpis",
            popover: {
              title: "📊 Indicadores Fabris em Tempo Real",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">Torre de controle em tempo real para a diretoria e gerência de produção:</p>
                  <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                    <li><strong>Carteira de Vendas:</strong> Demanda física pendente de fabricação.</li>
                    <li><strong>Estoque de Blend:</strong> Saldo físico real de matéria-prima no almoxarifado em toneladas.</li>
                    <li><strong>Alerta de MRP:</strong> Algoritmo de segurança que avisa se faltar qualquer insumo.</li>
                    <li><strong>OPs Ativas:</strong> Quantas ordens de produção estão rodando nas extrusoras agora.</li>
                  </ul>
                </div>
              `,
              side: "bottom",
              align: "center",
            },
          },
          {
            element: "#tour-dashboard-mrpi",
            popover: {
              title: "🧪 Motor de Engenharia MRP I",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    O <strong>MRP (Material Requirements Planning)</strong> é o cérebro matemático da fábrica.
                  </p>
                  <p style="margin-bottom: 8px;">
                    Ele cruza a demanda das encomendas ativas com o saldo em estoque. Se faltar resina ou aço, o botão <strong>'Gerar Ordem'</strong> permite requisitar a compra aos fornecedores homologados com apenas 1 clique.
                  </p>
                </div>
              `,
              side: "top",
              align: "start",
            },
          },
          {
            element: "#tour-dashboard-bateladas",
            popover: {
              title: "⏱️ Chão de Fábrica & Previsão de Entrega",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Cada lote em execução possui acompanhamento percentual do volume produzido versus planejado.
                  </p>
                  <p style="margin-bottom: 8px;">
                    O algoritmo calcula a <strong>Data de Previsão de Fechamento</strong> considerando a velocidade mecânica das extrusoras (peças/hora) e a escala de turnos dos operadores, fornecendo um prazo 100% realista ao cliente.
                  </p>
                </div>
              `,
              side: "left",
              align: "center",
            },
          },
          {
            element: "#tour-nav-cadastros",
            popover: {
              title: "📐 Receitas de Produto (BOM)",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    No menu <strong>Cadastros > Receitas (BOM)</strong>, reside a engenharia de precisão dos produtos.
                  </p>
                  <div style="background: #f8fafc; border-left: 4px solid #fd790b; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #334155;">
                    <strong>O que é BOM?</strong> Sigla para <em>Bill of Materials</em> ('Lista de Ingredientes'). Define a receita travada: ex. 85% PEAD, 12% Reticulável, 3% Masterbatch de cor e fita de aço, com tolerâncias milimétricas.
                  </div>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },
          {
            element: "#tour-nav-estoque",
            popover: {
              title: "📦 Almoxarifado & Regra FIFO",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    No menu <strong>Almoxarifado</strong>, o estoque opera sob a metodologia <strong>FIFO (First-In, First-Out)</strong>.
                  </p>
                  <p style="margin-bottom: 8px;">
                    O primeiro lote de plástico ou aço recebido é o primeiro a ser consumido. Como o preço dessas commodities oscila semanalmente, o sistema rastreia o custo exato de cada lote recebido para apurar o lucro real sem distorções.
                  </p>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },
          {
            element: "#tour-nav-financeiro",
            popover: {
              title: "💰 Cérebro Financeiro & Margens",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    O pilar financeiro une chão de fábrica e contabilidade estratégica:
                  </p>
                  <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                    <li><strong>Formação de Preço:</strong> Simula o preço de venda ideal considerando custo de insumos, custos fixos da fábrica e margem líquida.</li>
                    <li><strong>Matriz Fiscal Interestadual:</strong> Calcula automaticamente ICMS interestadual, IPI, PIS e COFINS por estado de destino.</li>
                    <li><strong>DRE em Tempo Real:</strong> Demonstração do Resultado do Exercício com receitas, custos e lucros.</li>
                  </ul>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },
          {
            element: "#tour-trigger-btn",
            popover: {
              title: "🚀 Pronto para Explorar!",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Você agora conhece a visão panorâmica da engenharia e da arquitetura do <strong>Kore Industrial</strong>!
                  </p>
                  <p style="margin-bottom: 8px;">
                    Sinta-se à vontade para navegar pelos menus, emitir pedidos, testar a formação de preço e inspecionar os relatórios em PDF.
                  </p>
                  <div style="background: #fff7ed; border-left: 4px solid #fd790b; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #9a3412;">
                    💡 <strong>Para Avaliadores:</strong> Você também pode testar a <strong>Jornada Prática</strong> clicando neste botão 'Guia do Sistema' a qualquer momento!
                  </div>
                </div>
              `,
              side: "bottom",
              align: "end",
            },
          },
        ];

        startDriver(steps);
      }, 350);
    };

    // ----------------------------------------------------
    // TOUR 2: JORNADA PRÁTICA (COMO COMEÇAR DO ZERO)
    // ----------------------------------------------------
    const runPracticalTour = () => {
      setIsChoiceModalOpen(false);

      const steps: DriveStep[] = [
        // 1. Abertura da Jornada Prática
        {
          popover: {
            title: "🚀 Jornada Prática: Passo a Passo Operacional",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Bem-vindo à <strong>Orientação de Uso do Kore Industrial</strong>!
                </p>
                <p style="margin-bottom: 8px;">
                  Neste modo, vamos navegar juntos tela por tela na ordem cronológica que uma indústria real segue para iniciar sua operação do absoluto zero:
                </p>
                <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #1e293b; margin: 8px 0; font-family: monospace; line-height: 1.8;">
                  1. Fornecedores ➔ 2. Insumos ➔ 3. Famílias & SKUs ➔<br/>
                  4. Receitas BOM ➔ 5. Clientes ➔ 6. Estoque FIFO ➔<br/>
                  7. Venda & MRP ➔ 8. Formação de Preço
                </div>
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-top: 8px;">
                  ✨ <strong>Modo Simulação Ativo:</strong> Vamos preencher automaticamente dados de demonstração em cada formulário para você ver a validação dos campos, <u>sem gravar nada no banco de dados</u>!
                </div>
              </div>
            `,
            side: "bottom",
            align: "center",
          },
        },

        // 2. Etapa 1: Fornecedores
        {
          element: "#tour-form-fornecedor",
          onHighlightStarted: () => {
            setCurrentScreen("fornecedores");
            setIsAddingNewSupplier?.(true);
            setTimeout(() => {
              simulateFillInput('input[placeholder*="EX: Polímeros"]', "Petroquímica Braskem Brasil S/A");
              simulateFillInput('input[placeholder*="00.000.000"]', "42.150.391/0001-85");
              simulateFillInput('input[placeholder*="123.456"]', "123.456.789.110");
              simulateFillInput('input[placeholder*="Ex: Carlos"]', "Carlos Roberto da Silva");
              simulateFillInput('input[placeholder*="carlos@resinas"]', "carlos.silva@braskem.com.br");
            }, 300);
          },
          popover: {
            title: "🏭 1ª Etapa: Homologação de Fornecedores",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Tudo começa aqui. Antes de comprar matéria-prima, a fábrica precisa cadastrar e homologar de quem ela compra.
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Razão Social & CNPJ:</strong> Validados contra a Receita Federal para emissão de NF-e de entrada.</li>
                  <li><strong>Categoria de Fornecimento:</strong> Define se o parceiro vende matéria-prima (resinas/aço) ou insumos de apoio.</li>
                  <li><strong>Auditoria de Qualidade N3:</strong> Questionário técnico para atestar conformidade ISO de reciclagem e pureza.</li>
                </ul>
                <div style="background: #fefce8; border: 1px solid #fef08a; padding: 6px 10px; border-radius: 6px; font-size: 11px; color: #854d0e; margin-top: 8px;">
                  ✨ Dados demonstrativos preenchidos no formulário acima sem gravação no banco.
                </div>
              </div>
            `,
            side: "left",
            align: "start",
          },
        },

        // 3. Etapa 2: Matérias-Primas
        {
          element: "#tour-form-insumo",
          onHighlightStarted: () => {
            setIsAddingNewSupplier?.(false);
            setCurrentScreen("materias-primas");
            setTriggerAddMaterial?.((prev) => prev + 1);
            setTimeout(() => {
              simulateFillInput('input[placeholder*="Ex: PP H 103"]', "Polietileno de Alta Densidade (PEAD Virgem 0.95)");
            }, 300);
          },
          popover: {
            title: "🧪 2ª Etapa: Cadastro de Matérias-Primas",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Com os fornecedores registrados, cadastramos os insumos físicos:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Unidade de Compra:</strong> <em>Kg</em> para polímeros granulados, <em>Litros</em> para aditivos líquidos e <em>Metros</em> para almas de aço.</li>
                  <li><strong>Bitola & Peso Nominal:</strong> Para o aço, define-se a espessura e peso linear (kg/m) para cálculo exato de rendimento no perfil coextrusado.</li>
                  <li><strong>Ranking de Fornecedores:</strong> O sistema memoriza o menor preço e nota de pontualidade de cada fornecedor para sugerir compras automáticas.</li>
                </ul>
              </div>
            `,
            side: "left",
            align: "start",
          },
        },

        // 4. Etapa 3: Famílias & SKUs
        {
          element: "#tour-form-familia",
          onHighlightStarted: () => {
            setCurrentScreen("familias-skus");
            setTimeout(() => {
              simulateFillInput('input[placeholder*="Ex: Suporte Polimérico"]', "Tubo Coextrusado PEAD 32mm");
              simulateFillInput('input[type="number"][step="0.01"]', "0.95");
            }, 300);
          },
          popover: {
            title: "📐 3ª Etapa: Engenharia de Famílias & SKUs",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Aqui a engenharia de produção define as geometrias paramétricas:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Família de Produto:</strong> Define o perfil da seção transversal (circular ou quadrado), o diâmetro nominal e a densidade volumétrica.</li>
                  <li><strong>SKUs Derivados:</strong> A partir de uma mesma matriz de 32mm, a fábrica vende rolos de 50m, 100m ou bobinas contínuas. O sistema calcula a massa teórica de cada SKU automaticamente.</li>
                </ul>
              </div>
            `,
            side: "right",
            align: "start",
          },
        },

        // 5. Etapa 4: Receitas BOM
        {
          element: "#tour-nav-cadastros",
          onHighlightStarted: () => {
            setCurrentScreen("bom-formulas");
          },
          popover: {
            title: "🧬 4ª Etapa: A Fórmula Química (BOM)",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  A tela de <strong>BOM (Bill of Materials)</strong> é a 'receita de bolo' travada no banco de dados.
                </p>
                <p style="margin-bottom: 8px;">
                  Para a família de 32mm selecionada, definimos a composição exata:
                </p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; line-height: 1.7; color: #002046; font-weight: 600;">
                  • 85% Resina PEAD Virgem (corpo mecânico)<br/>
                  • 12% Composto Reticulável (resistência térmica)<br/>
                  • 3% Masterbatch Preto (aditivo anti-UV)<br/>
                  • Alma de Aço 0.50mm com tolerância de corte
                </div>
              </div>
            `,
            side: "right",
            align: "center",
          },
        },

        // 6. Etapa 5: Clientes
        {
          element: "#tour-btn-novo-cliente",
          onHighlightStarted: () => {
            setCurrentScreen("clientes");
          },
          popover: {
            title: "🤝 5ª Etapa: Clientes & Matriz Tributária",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Com os produtos e receitas prontos, cadastramos os clientes compradores.
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Estado (UF) de Destino:</strong> Fundamental para o motor fiscal saber qual alíquota de ICMS interestadual incidirá sobre o pedido.</li>
                  <li><strong>Tipo de Cliente:</strong> Revenda ou Consumidor Final, determinante para o cálculo automático de Substituição Tributária (ST) e IPI.</li>
                </ul>
              </div>
            `,
            side: "bottom",
            align: "end",
          },
        },

        // 7. Etapa 6: Almoxarifado FIFO
        {
          element: "#tour-form-entrada-estoque",
          onHighlightStarted: () => {
            setCurrentScreen("estoque");
            setTriggerAddEstoque?.((prev) => prev + 1);
            setTimeout(() => {
              simulateFillInput('input[type="number"], input[placeholder*="Quantidade"]', "1000");
              simulateFillInput('input[placeholder*="0,00"], input[placeholder*="Preço"]', "8.50");
            }, 300);
          },
          popover: {
            title: "📦 6ª Etapa: Recebimento de Lote & FIFO",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Ao descarregar a carreta de matéria-prima, o almoxarife registra a entrada no estoque:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Lote do Fabricante & Laudo:</strong> Rastreabilidade ponta a ponta (da matéria-prima até a bobina final entregue ao cliente).</li>
                  <li><strong>Custo Unitário da NF:</strong> Alimenta a esteira FIFO contábil, garantindo que o custo real de produção seja calculado sem distorções de inflação.</li>
                </ul>
              </div>
            `,
            side: "left",
            align: "center",
          },
        },

        // 8. Etapa 7: Emissão de Pedido & MRP
        {
          element: "#new-order-form",
          onHighlightStarted: () => {
            setCurrentScreen("dashboard");
            setIsAddOrderModalOpen?.(true);
          },
          popover: {
            title: "🛒 7ª Etapa: Venda & Explosão de Necessidades",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  O ciclo comercial e produtivo se conecta:
                </p>
                <p style="margin-bottom: 8px;">
                  Ao selecionar o cliente e a metragem do pedido (ex: 5.000 metros):
                </p>
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e40af;">
                  O algoritmo lê a receita BOM no mesmo milissegundo e calcula:<br/>
                  • Exigência de <strong>1.250 kg de PEAD</strong><br/>
                  • Exigência de <strong>5.000m de fita de aço</strong><br/>
                  Comparando com o saldo do almoxarifado para alertar compras.
                </div>
              </div>
            `,
            side: "left",
            align: "center",
          },
        },

        // 9. Etapa 8: Formação de Preço
        {
          element: "#tour-nav-financeiro",
          onHighlightStarted: () => {
            setIsAddOrderModalOpen?.(false);
            setCurrentScreen("formacao-preco");
          },
          popover: {
            title: "💡 8ª Etapa: Formação de Preço & Lucro Real",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Antes de formalizar a proposta ao cliente, o departamento comercial e a diretoria conferem a viabilidade financeira:
                </p>
                <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                  <li><strong>Custo Direto:</strong> Insumos consumidos segundo a receita BOM.</li>
                  <li><strong>Custo Fixo Alocado:</strong> Rateio por hora de máquina da fábrica (energia, salários, manutenção).</li>
                  <li><strong>Simulador de Margem:</strong> O gestor escolhe a margem de contribuição (ex: 20%) e o sistema entrega o preço de venda exato com tributos embutidos.</li>
                </ul>
              </div>
            `,
            side: "right",
            align: "center",
          },
        },

        // 10. Conclusão
        {
          onHighlightStarted: () => {
            setCurrentScreen("dashboard");
          },
          popover: {
            title: "🏆 O Ciclo Fabril Está Completo!",
            description: `
              <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                <p style="margin-bottom: 8px;">
                  Parabéns! Você acompanhou a jornada operacional de ponta a ponta do <strong>Kore Industrial</strong>:
                </p>
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 8px; font-size: 12px; color: #166534; font-weight: 600; line-height: 1.8;">
                  Fornecedores ➔ Insumos ➔ Famílias/SKUs ➔ Receita BOM ➔ Clientes ➔ Almoxarifado FIFO ➔ Pedido & MRP ➔ Formação de Preço.
                </div>
                <p style="font-size: 12px; color: #475569; margin-top: 10px;">
                  Todos os módulos se comunicam de forma nativa e integrada. Sinta-se livre para explorar todas as abas por conta própria!
                </p>
              </div>
            `,
            side: "bottom",
            align: "center",
          },
        },
      ];

      startDriver(steps);
    };

    // Função central que executa a instância do driver.js
    const startDriver = (steps: DriveStep[]) => {
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch (e) {}
      }

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayColor: "#001428",
        overlayOpacity: 0.78,
        stagePadding: 8,
        stageRadius: 12,
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Concluir Guia ✓",
        progressText: "Passo {{current}} de {{total}}",
        popoverClass: "kore-driver-popover",
        steps,
        onDestroyed: () => {
          // Limpa qualquer estado aberto
          setIsAddingNewSupplier?.(false);
          setIsAddOrderModalOpen?.(false);
          try {
            localStorage.setItem(STORAGE_KEY, "true");
          } catch (e) {}
        },
      });

      driverInstanceRef.current = driverObj;
      driverObj.drive();
    };

    useImperativeHandle(ref, () => ({
      startTour: () => setIsChoiceModalOpen(true),
      startOverviewTour: runOverviewTour,
      startPracticalTour: runPracticalTour,
    }));

    // Auto-início na primeira visita (abre o modal de escolha com boas-vindas)
    useEffect(() => {
      if (!mounted) return;

      try {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
          const timer = setTimeout(() => {
            setIsChoiceModalOpen(true);
          }, 1200);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn("Storage inacessível:", e);
      }
    }, [mounted]);

    return (
      <>
        {/* ================= MODAL SELETOR DE EXPERIÊNCIA DO GUIA ================= */}
        {isChoiceModalOpen && (
          <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[99999999] p-4 animate-fade-in select-none">
            <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-outline-variant/60 overflow-hidden flex flex-col">
              
              {/* Header */}
              <div className="bg-[#002046] p-6 text-white flex justify-between items-center relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined notranslate text-[24px]">school</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">Centro de Orientação Kore Industrial</h3>
                    <p className="text-xs text-on-primary-container">Selecione o tipo de apresentação que deseja realizar:</p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChoiceModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer relative z-10"
                >
                  <span className="material-symbols-outlined notranslate text-[20px]">close</span>
                </button>
              </div>

              {/* Body: 2 Opções de Tour */}
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-container-low">
                
                {/* Card 1: Visão Geral */}
                <div 
                  onClick={runOverviewTour}
                  className="bg-white rounded-2xl p-5 border border-outline-variant/80 hover:border-secondary hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary text-primary group-hover:text-white flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined notranslate text-[22px]">dashboard</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-surface-container px-2 py-0.5 rounded-full text-outline">
                        ~2 min
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-primary group-hover:text-secondary transition-colors mb-1.5">
                      Visão Geral do Sistema
                    </h4>
                    <p className="text-xs text-outline leading-relaxed">
                      Apresentação executiva pela torre de controle, KPIs em tempo real, atalhos de teclado e pilares da arquitetura fabril.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-xs font-bold text-primary group-hover:text-secondary">
                    <span>Iniciar Tour Rápido</span>
                    <span className="material-symbols-outlined notranslate text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>

                {/* Card 2: Jornada Prática */}
                <div 
                  onClick={runPracticalTour}
                  className="bg-white rounded-2xl p-5 border-2 border-secondary/60 hover:border-secondary hover:shadow-lg transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 bg-secondary text-white text-[9px] font-black tracking-widest uppercase px-3 py-0.5 rounded-bl-lg">
                    Recomendado
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary/10 group-hover:bg-secondary text-secondary group-hover:text-white flex items-center justify-center transition-colors">
                        <span className="material-symbols-outlined notranslate text-[22px]">route</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                        ~4 min
                      </span>
                    </div>

                    <h4 className="text-sm font-black text-primary group-hover:text-secondary transition-colors mb-1.5">
                      Jornada Prática: Passo a Passo
                    </h4>
                    <p className="text-xs text-outline leading-relaxed">
                      Simulação do dia a dia da fábrica: guia tela por tela na ordem cronológica de cadastros, demonstrando o preenchimento automático de campos sem afetar o banco.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-secondary/20 flex items-center justify-between text-xs font-bold text-secondary">
                    <span>Iniciar Simulação Operacional</span>
                    <span className="material-symbols-outlined notranslate text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div className="p-4 bg-white border-t border-outline-variant/40 flex items-center justify-between">
                <span className="text-[11px] text-outline font-semibold">
                  💡 Ideal para avaliadores, recrutadores e demonstrações comerciais.
                </span>
                <button
                  onClick={() => setIsChoiceModalOpen(false)}
                  className="text-xs font-bold text-outline hover:text-primary transition-colors cursor-pointer px-3 py-1.5"
                >
                  Explorar Livremente
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ================= ESTILOS CUSTOMIZADOS PARA O DRIVER.JS ================= */}
        <style jsx global>{`
          .kore-driver-popover {
            font-family: var(--font-sans), Inter, sans-serif !important;
            max-width: 440px !important;
            min-width: 320px !important;
            background: #ffffff !important;
            border-radius: 18px !important;
            padding: 22px 24px !important;
            box-shadow: 0 25px 50px -12px rgba(0, 32, 70, 0.35), 0 0 0 1px rgba(0, 32, 70, 0.08) !important;
            border: none !important;
            z-index: 1000000000 !important;
          }

          .kore-driver-popover .driver-popover-title {
            font-size: 16px !important;
            font-weight: 800 !important;
            color: #002046 !important;
            letter-spacing: -0.02em !important;
            margin-bottom: 8px !important;
          }

          .kore-driver-popover .driver-popover-description {
            font-size: 13px !important;
            line-height: 1.6 !important;
            color: #44474e !important;
          }

          .kore-driver-popover .driver-popover-footer {
            margin-top: 18px !important;
            padding-top: 14px !important;
            border-top: 1px solid #edeeef !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
          }

          .kore-driver-popover .driver-popover-progress-text {
            font-size: 11px !important;
            font-weight: 700 !important;
            color: #74777f !important;
            text-transform: uppercase !important;
            letter-spacing: 0.05em !important;
          }

          .kore-driver-popover .driver-popover-navigation-btns {
            display: flex !important;
            gap: 8px !important;
          }

          .kore-driver-popover .driver-popover-next-btn,
          .kore-driver-popover .driver-popover-footer-btn {
            font-family: var(--font-sans), Inter, sans-serif !important;
            background: #fd790b !important;
            color: #ffffff !important;
            font-weight: 700 !important;
            font-size: 12px !important;
            border-radius: 10px !important;
            padding: 8px 16px !important;
            border: none !important;
            cursor: pointer !important;
            box-shadow: 0 2px 6px rgba(253, 121, 11, 0.3) !important;
            transition: all 0.2s ease !important;
          }

          .kore-driver-popover .driver-popover-next-btn:hover {
            background: #e66b05 !important;
            transform: translateY(-1px) !important;
          }

          .kore-driver-popover .driver-popover-prev-btn {
            font-family: var(--font-sans), Inter, sans-serif !important;
            background: #f3f4f5 !important;
            color: #002046 !important;
            font-weight: 600 !important;
            font-size: 12px !important;
            border-radius: 10px !important;
            padding: 8px 14px !important;
            border: 1px solid #e7e8e9 !important;
            cursor: pointer !important;
            box-shadow: none !important;
            transition: all 0.2s ease !important;
          }

          .kore-driver-popover .driver-popover-prev-btn:hover {
            background: #e7e8e9 !important;
          }

          .kore-driver-popover .driver-popover-close-btn {
            color: #94a3b8 !important;
            font-size: 20px !important;
            top: 14px !important;
            right: 14px !important;
            transition: color 0.2s !important;
          }

          .kore-driver-popover .driver-popover-close-btn:hover {
            color: #002046 !important;
          }

          .kore-driver-popover .driver-popover-arrow {
            border-width: 7px !important;
          }
        `}</style>
      </>
    );
  }
);

InteractiveTour.displayName = "InteractiveTour";
export default InteractiveTour;
