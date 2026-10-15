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
  tourDemoMode?: boolean;
  setTourDemoMode?: (val: boolean) => void;
}

const STORAGE_KEY = "kore_industrial_tour_seen_v1";

// Helper robusto para aguardar a montagem do elemento no DOM
const waitForElement = (selector: string, timeoutMs = 1500): Promise<Element | null> => {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      return resolve(existing);
    }
    const start = Date.now();
    const interval = setInterval(() => {
      const el = document.querySelector(selector);
      if (el) {
        clearInterval(interval);
        resolve(el);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        console.warn(`[Tour] Elemento ${selector} não encontrado em ${timeoutMs}ms.`);
        resolve(null);
      }
    }, 30);
  });
};

interface CustomStepDefinition {
  element?: string;
  title: string;
  description: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  prepare?: () => Promise<void> | void;
}

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
      tourDemoMode,
      setTourDemoMode,
    },
    ref
  ) => {
    const [mounted, setMounted] = useState(false);
    const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
    const driverInstanceRef = useRef<any>(null);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Limpeza de estados de demonstração ao encerrar o tour
    const cleanupTourState = () => {
      setTourDemoMode?.(false);
      setIsAddingNewSupplier?.(false);
      setIsAddOrderModalOpen?.(false);
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch (e) {}
    };

    // Construtor genérico de driver com navegação assíncrona tela-a-tela
    const buildAndRunDriver = (stepsDef: CustomStepDefinition[]) => {
      if (driverInstanceRef.current) {
        try {
          driverInstanceRef.current.destroy();
        } catch (e) {}
      }

      const navigateToStep = async (targetIdx: number) => {
        if (targetIdx < 0) return;
        if (targetIdx >= stepsDef.length) {
          driverInstanceRef.current?.destroy();
          return;
        }

        const step = stepsDef[targetIdx];
        if (step.prepare) {
          await step.prepare();
        }

        if (step.element) {
          await waitForElement(step.element, 1500);
          // Aguarda estabilização do layout
          await new Promise((r) => setTimeout(r, 90));
        }

        driverInstanceRef.current?.moveTo(targetIdx);
      };

      const steps: DriveStep[] = stepsDef.map((step, index) => {
        const isFirst = index === 0;
        const isLast = index === stepsDef.length - 1;

        return {
          element: step.element,
          popover: {
            title: step.title,
            description: step.description,
            side: step.side || "bottom",
            align: step.align || "center",
            nextBtnText: isLast ? "Concluir Guia ✓" : "Próximo →",
            prevBtnText: "← Anterior",
            showButtons: isFirst ? ["next", "close"] : ["next", "previous", "close"],
            onNextClick: async () => {
              if (isLast) {
                driverInstanceRef.current?.destroy();
              } else {
                await navigateToStep(index + 1);
              }
            },
            onPrevClick: async () => {
              await navigateToStep(index - 1);
            },
            onCloseClick: () => {
              driverInstanceRef.current?.destroy();
            },
          },
        };
      });

      const driverObj = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        smoothScroll: true,
        overlayColor: "#001428",
        overlayOpacity: 0.28, // Visão aberta e translúcida: a tela inteira permanece visível e clara!
        stagePadding: 8,
        stageRadius: 14,
        nextBtnText: "Próximo →",
        prevBtnText: "← Anterior",
        doneBtnText: "Concluir Guia ✓",
        progressText: "Passo {{current}} de {{total}}",
        popoverClass: "kore-driver-popover",
        steps,
        onDestroyed: () => {
          cleanupTourState();
        },
      });

      driverInstanceRef.current = driverObj;

      // Executa o preparo do passo 0 antes de iniciar o driver
      (async () => {
        if (stepsDef[0]?.prepare) {
          await stepsDef[0].prepare();
        }
        if (stepsDef[0]?.element) {
          await waitForElement(stepsDef[0].element, 1200);
        }
        driverObj.drive();
      })();
    };

    // ----------------------------------------------------
    // TOUR 1: VISÃO GERAL & ARQUITETURA EXECUTIVA
    // ----------------------------------------------------
    const runOverviewTour = () => {
      setIsChoiceModalOpen(false);

      const overviewSteps: CustomStepDefinition[] = [
        {
          prepare: () => {
            if (currentScreen !== "dashboard") {
              setCurrentScreen("dashboard");
            }
          },
          title: "🏭 Bem-vindo ao Kore Industrial",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Este software é um <strong>ERP & MRP Fabril de Alta Precisão</strong>, desenvolvido sob medida para coextrusão contínua (perfis poliméricos, tubos industriais e cabos com alma de aço).
              </p>
              <div style="background: #f8fafc; border-left: 4px solid #fd790b; padding: 10px 12px; border-radius: 6px; margin: 10px 0; font-size: 12px; color: #334155;">
                <strong style="color: #002046;">💡 Para quem é leigo no assunto:</strong><br/>
                Fabricar perfis industriais exige fundir resinas em altas temperaturas e injetar fitas de aço com precisão micrométrica. Sem automação, a fábrica perde milhões em refugo e paradas de linha. Este software calcula e audita tudo em tempo real.
              </div>
              <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
                Clique em <strong>Próximo →</strong> para conhecer os módulos na tela aberta!
              </p>
            </div>
          `,
          side: "bottom",
          align: "center",
        },
        {
          element: "#kore-logo-container",
          title: "🧭 Navegação Modular & Atalhos",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                O sistema é dividido em três grandes pilares: <strong>Cadastros de Engenharia</strong>, <strong>Chão de Fábrica (PCP)</strong> e <strong>Cérebro Financeiro</strong>.
              </p>
              <div style="background: #eff6ff; border-left: 4px solid #002046; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e3a8a;">
                <strong>⌨️ Atalho Rápido:</strong> Pressione a tecla <u>'S'</u> a qualquer instante para recolher ou expandir esta barra lateral e ter visão panorâmica do chão de fábrica.
              </div>
            </div>
          `,
          side: "right",
          align: "start",
        },
        {
          element: "#tour-nav-action-btn",
          title: "⚡ Ação Rápida: Emissão de Pedidos",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Este botão contextual se adapta à tela atual. Aqui na Central, ele abre o modal de <strong>Novo Pedido Comercial</strong> (ou pressione a tecla <strong>'N'</strong>).
              </p>
              <div style="background: #fff7ed; border-left: 4px solid #ea580c; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #9a3412;">
                <strong>A inteligência por trás:</strong> Ao registrar um pedido, o sistema faz a 'explosão de engenharia': converte metros encomendados em quilos de resina e bobinas de aço automaticamente.
              </div>
            </div>
          `,
          side: "right",
          align: "end",
        },
        {
          element: "#tour-dashboard-kpis",
          title: "📊 Indicadores Fabris em Tempo Real",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">Torre de controle em tempo real para a diretoria e gerência de produção:</p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Carteira de Vendas:</strong> Demanda física pendente de extrusão.</li>
                <li><strong>Estoque de Blend:</strong> Saldo físico real de matéria-prima no almoxarifado em toneladas.</li>
                <li><strong>Alerta de MRP:</strong> Algoritmo de segurança que prevê paradas por falta de insumo.</li>
                <li><strong>OPs Ativas:</strong> Quantas ordens de produção estão rodando nas extrusoras agora.</li>
              </ul>
            </div>
          `,
          side: "bottom",
          align: "center",
        },
        {
          element: "#tour-dashboard-mrpi",
          title: "🧪 Motor de Engenharia MRP I",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                O <strong>MRP (Material Requirements Planning)</strong> é o cérebro matemático da fábrica.
              </p>
              <p style="margin-bottom: 8px;">
                Ele cruza a demanda das encomendas com o saldo do almoxarifado. Se faltar polímero ou aço, o botão <strong>'Gerar Ordem'</strong> permite requisitar compra aos fornecedores homologados com apenas 1 clique.
              </p>
            </div>
          `,
          side: "top",
          align: "start",
        },
        {
          element: "#tour-dashboard-bateladas",
          title: "⏱️ Chão de Fábrica & Previsão de Entrega",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Cada lote em execução possui acompanhamento percentual do volume produzido versus planejado.
              </p>
              <p style="margin-bottom: 8px;">
                O algoritmo calcula a <strong>Data Prevista de Conclusão</strong> considerando a velocidade mecânica das extrusoras (peças/hora) e a escala de turnos dos operadores, fornecendo um prazo 100% confiável ao cliente.
              </p>
            </div>
          `,
          side: "left",
          align: "center",
        },
        {
          element: "#tour-nav-cadastros",
          title: "📐 Receitas de Produto (BOM)",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                No menu <strong>Cadastros > Receitas (BOM)</strong>, reside a engenharia de precisão dos produtos.
              </p>
              <div style="background: #f8fafc; border-left: 4px solid #fd790b; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #334155;">
                <strong>O que é BOM?</strong> <em>Bill of Materials</em> ('Lista de Ingredientes'). Define a receita travada: ex. 85% PEAD, 12% Reticulável, 3% Masterbatch de cor e fita de aço, com tolerâncias milimétricas.
              </div>
            </div>
          `,
          side: "right",
          align: "center",
        },
        {
          element: "#tour-nav-estoque",
          title: "📦 Almoxarifado & Regra FIFO",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                No menu <strong>Almoxarifado</strong>, o estoque opera sob a metodologia <strong>FIFO (First-In, First-Out)</strong>.
              </p>
              <p style="margin-bottom: 8px;">
                O primeiro lote de polímero ou aço recebido é o primeiro a ser consumido. Como o preço dessas commodities oscila semanalmente, o sistema rastreia o custo exato de cada lote recebido para apurar a margem real de lucro.
              </p>
            </div>
          `,
          side: "right",
          align: "center",
        },
        {
          element: "#tour-nav-financeiro",
          title: "💰 Cérebro Financeiro & Margens",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                O pilar financeiro une chão de fábrica e contabilidade estratégica:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Formação de Preço:</strong> Simula o preço de venda ideal considerando custo de insumos, rateio de máquina e margem líquida.</li>
                <li><strong>Matriz Fiscal Interestadual:</strong> Calcula automaticamente ICMS interestadual, IPI, PIS e COFINS por estado de destino.</li>
                <li><strong>DRE em Tempo Real:</strong> Demonstração do Resultado do Exercício com receitas, custos e lucros.</li>
              </ul>
            </div>
          `,
          side: "right",
          align: "center",
        },
        {
          element: "#tour-trigger-btn",
          title: "🚀 Pronto para Explorar!",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Você agora conhece a visão panorâmica da arquitetura do <strong>Kore Industrial</strong>!
              </p>
              <p style="margin-bottom: 8px;">
                Sinta-se à vontade para navegar pelos menus, emitir pedidos, testar a formação de preço e inspecionar relatórios.
              </p>
              <div style="background: #fff7ed; border-left: 4px solid #fd790b; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #9a3412;">
                💡 <strong>Dica para Avaliadores:</strong> Experimente também a <strong>Jornada Prática</strong> clicando neste botão para ver os formulários com dados preenchidos na tela aberta!
              </div>
            </div>
          `,
          side: "bottom",
          align: "end",
        },
      ];

      buildAndRunDriver(overviewSteps);
    };

    // ----------------------------------------------------
    // TOUR 2: JORNADA PRÁTICA (SIMULAÇÃO OPERACIONAL NA TELA ABERTA)
    // ----------------------------------------------------
    const runPracticalTour = () => {
      setIsChoiceModalOpen(false);

      const practicalSteps: CustomStepDefinition[] = [
        // 0. Abertura
        {
          prepare: () => {
            setTourDemoMode?.(false);
            if (currentScreen !== "dashboard") {
              setCurrentScreen("dashboard");
            }
          },
          title: "🚀 Jornada Prática: Passo a Passo Operacional",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Bem-vindo à <strong>Orientação Operacional do Kore Industrial</strong>!
              </p>
              <p style="margin-bottom: 8px;">
                Neste modo, vamos navegar tela por tela com <strong>visão aberta do sistema</strong> e <strong>dados de demonstração preenchidos nos formulários</strong>, na ordem cronológica que uma indústria real segue:
              </p>
              <div style="background: #f1f5f9; border-radius: 8px; padding: 10px 14px; font-size: 11px; color: #1e293b; margin: 8px 0; font-family: monospace; line-height: 1.8;">
                1. Fornecedores ➔ 2. Insumos ➔ 3. Famílias & SKUs ➔<br/>
                4. Receitas BOM ➔ 5. Clientes ➔ 6. Estoque FIFO ➔<br/>
                7. Venda & MRP ➔ 8. Formação de Preço
              </div>
              <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e40af; margin-top: 8px;">
                ✨ <strong>Sem poluir seu banco:</strong> Os dados de apoio são renderizados no estado local de simulação, permitindo ver os cálculos e regras sem persistir nada no banco de produção.
              </div>
            </div>
          `,
          side: "bottom",
          align: "center",
        },

        // 1. Fornecedores (com formulário aberto e dados preenchidos)
        {
          element: "#tour-form-fornecedor",
          prepare: () => {
            setCurrentScreen("fornecedores");
            setIsAddingNewSupplier?.(true);
            setTourDemoMode?.(true);
          },
          title: "🏭 1ª Etapa: Homologação de Fornecedores & Auditoria N3",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Toda fábrica começa qualificando de quem ela compra sua matéria-prima. Observe o formulário preenchido ao lado:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Razão Social & CNPJ:</strong> <em>Petroquímica Braskem Brasil S/A</em> (validação para emissão de NF-e).</li>
                <li><strong>Categorias:</strong> <em>POLÍMERO e QUÍMICO</em> ativadas para restringir os tipos de insumo homologados.</li>
                <li><strong>Auditoria N3 ISO:</strong> Checklist técnico (Linha de Lavagem, Tanque de Decantação e Secadora) que atesta a pureza do polímero antes da aprovação de compras.</li>
              </ul>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 6px 10px; border-radius: 6px; font-size: 11px; color: #166534; margin-top: 8px;">
                ✓ Observe os campos preenchidos na tela aberta com os dados de apoio do parceiro.
              </div>
            </div>
          `,
          side: "left",
          align: "start",
        },

        // 2. Matérias-Primas (com formulário técnico aberto e dados preenchidos)
        {
          element: "#tour-form-insumo",
          prepare: () => {
            setIsAddingNewSupplier?.(false);
            setCurrentScreen("materias-primas");
            setTourDemoMode?.(true);
            setTriggerAddMaterial?.((prev) => prev + 1);
          },
          title: "🧪 2ª Etapa: Cadastro Técnico de Matérias-Primas",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Com o fornecedor homologado, cadastramos os insumos físicos consumidos na extrusora:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Descrição:</strong> <em>Polietileno de Alta Densidade (PEAD Virgem 0.95)</em>.</li>
                <li><strong>Unidade de Compra:</strong> <em>Kg</em> (para polímeros/aditivos) ou <em>Metros</em> (para alma de aço).</li>
                <li><strong>Custo Histórico Inicial:</strong> Preço unitário (R$ 8,75) que servirá de âncora para a esteira FIFO e alerta de inflação.</li>
                <li><strong>Estoque Inicial Físico:</strong> Quantidade em quilos para controle imediato do almoxarifado.</li>
              </ul>
            </div>
          `,
          side: "left",
          align: "start",
        },

        // 3. Famílias & SKUs (com geometria paramétrica e cálculo de massa)
        {
          element: "#tour-form-familia",
          prepare: () => {
            setCurrentScreen("familias-skus");
            setTourDemoMode?.(true);
          },
          title: "📐 3ª Etapa: Engenharia Paramétrica de Famílias & SKUs",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Aqui a engenharia de produção modela a física matemática dos produtos:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Perfil Geométrico:</strong> <em>Redondo / Tubular (32mm)</em> com densidade volumétrica de <em>0.95 g/cm³</em>.</li>
                <li><strong>Cálculo Automático de Área:</strong> O motor matemático aplica a fórmula da seção circular (&pi; &times; r&sup2;) em tempo real.</li>
                <li><strong>SKUs Derivados:</strong> O painel ao lado calcula o peso linear em kg/m e a margem de contribuição preliminar com desconto da alma de aço.</li>
              </ul>
            </div>
          `,
          side: "right",
          align: "start",
        },

        // 4. Receitas BOM (com proporção de blend em 100%)
        {
          element: "#tour-bom-table",
          prepare: () => {
            setCurrentScreen("bom-formulas");
            setTourDemoMode?.(true);
          },
          title: "🧬 4ª Etapa: A Fórmula Química (BOM - Bill of Materials)",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                A tabela destacada é a <strong>fórmula química travada</strong> da família de 32mm:
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; font-size: 11px; line-height: 1.8; color: #002046; font-weight: 600;">
                • <strong>85% PEAD Virgem:</strong> Estrutura mecânica e dureza Shore.<br/>
                • <strong>12% Composto Reticulável:</strong> Resistência a estresse térmico.<br/>
                • <strong>3% Masterbatch Preto:</strong> Aditivo de pigmentação anti-UV.<br/>
                • <strong>1 Haste/Un Aço Galvanizado 0.50mm:</strong> Alma estrutural rígida.
              </div>
              <p style="font-size: 11px; color: #475569; margin-top: 8px;">
                <strong>Regra de Engenharia:</strong> A soma dos polímeros fecha em <strong>100% exatos</strong>, garantindo estabilidade no cabeçote da extrusora.
              </p>
            </div>
          `,
          side: "left",
          align: "center",
        },

        // 5. Clientes & Tributação
        {
          element: "#tour-form-cliente",
          prepare: () => {
            setCurrentScreen("clientes");
            setTourDemoMode?.(true);
          },
          title: "🤝 5ª Etapa: Cadastro de Clientes & Regras Fiscais",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Veja os dados preenchidos no modal de cliente:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Cliente:</strong> <em>Indústria Metalúrgica Aliança Ltda</em>.</li>
                <li><strong>UF de Destino (SP):</strong> Determina a alíquota de ICMS (interna vs interestadual).</li>
                <li><strong>Tipo de Cliente (Revenda):</strong> O motor fiscal utiliza este parâmetro para embutir ou destacar automaticamente o IPI e ICMS-ST na formação de preço.</li>
              </ul>
            </div>
          `,
          side: "left",
          align: "center",
        },

        // 6. Almoxarifado FIFO
        {
          element: "#tour-form-entrada-estoque",
          prepare: () => {
            setCurrentScreen("estoque");
            setTourDemoMode?.(true);
            setTriggerAddEstoque?.((prev) => prev + 1);
          },
          title: "📦 6ª Etapa: Recebimento no Almoxarifado (Regra FIFO)",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Quando a carreta de insumos chega na fábrica, o almoxarife registra o recebimento:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Entrada de 2.500 kg:</strong> Adiciona saldo físico imediato na esteira do MRP.</li>
                <li><strong>Preço de R$ 8,90/kg:</strong> Registra o custo exato daquele lote.</li>
                <li><strong>Esteira FIFO:</strong> Quando as extrusoras produzirem, o sistema consome este lote primeiro, apurando o lucro contábil real sem distorção por inflação de resinas.</li>
              </ul>
            </div>
          `,
          side: "left",
          align: "center",
        },

        // 7. Emissão de Pedido & MRP
        {
          element: "#new-order-form",
          prepare: () => {
            setCurrentScreen("dashboard");
            setTourDemoMode?.(true);
            setIsAddOrderModalOpen?.(true);
          },
          title: "🛒 7ª Etapa: Fechamento de Pedido & Motor de MRP",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Veja o modal aberto com o lote comercial simulado:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Lote:</strong> <em>5.000 unidades do Tubo PEAD 32mm</em> (Subtotal: R$ 142.500,00).</li>
                <li><strong>Tributos Calculados:</strong> Estimativa automática de ICMS (R$ 25.650,00) e Frete industrial alocado.</li>
                <li><strong>Explosão de Necessidades:</strong> O algoritmo cruza com a receita BOM de 32mm e reserva 1.250 kg de PEAD e 5.000m de fita de aço no mesmo instante.</li>
              </ul>
            </div>
          `,
          side: "left",
          align: "center",
        },

        // 8. Formação de Preço e Margens
        {
          element: "#tour-pricing-simulator",
          prepare: () => {
            setIsAddOrderModalOpen?.(false);
            setCurrentScreen("formacao-preco");
            setTourDemoMode?.(true);
          },
          title: "💡 8ª Etapa: Cérebro Financeiro & Formação de Preço",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                O coração financeiro da indústria:
              </p>
              <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                <li><strong>Custo Direto de Engenharia:</strong> Baseado nos insumos consumidos pela receita BOM.</li>
                <li><strong>Rateio de Custos Fixos:</strong> Absorção de energia elétrica, salários da fábrica e depreciação de extrusora por hora de máquina.</li>
                <li><strong>Simulador de Margem Líquida:</strong> Com a margem de 25% selecionada, o sistema calcula o preço de venda exato com tributos e comissão embutidos.</li>
              </ul>
            </div>
          `,
          side: "right",
          align: "start",
        },

        // 9. Conclusão da Jornada
        {
          prepare: () => {
            setCurrentScreen("dashboard");
            setTourDemoMode?.(false);
          },
          title: "🏆 O Ciclo Fabril Está Completo!",
          description: `
            <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
              <p style="margin-bottom: 8px;">
                Parabéns! Você acompanhou o ciclo operacional completo do <strong>Kore Industrial</strong> na tela aberta:
              </p>
              <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 12px; border-radius: 8px; font-size: 12px; color: #166534; font-weight: 600; line-height: 1.8;">
                Fornecedores ➔ Insumos ➔ Famílias/SKUs ➔ Receita BOM ➔ Clientes ➔ Almoxarifado FIFO ➔ Pedido & MRP ➔ Formação de Preço.
              </div>
              <p style="font-size: 12px; color: #475569; margin-top: 10px;">
                Todos os módulos comunicam dados em tempo real. Agora sinta-se à vontade para navegar livremente pelo sistema!
              </p>
            </div>
          `,
          side: "bottom",
          align: "center",
        },
      ];

      buildAndRunDriver(practicalSteps);
    };

    useImperativeHandle(ref, () => ({
      startTour: () => setIsChoiceModalOpen(true),
      startOverviewTour: runOverviewTour,
      startPracticalTour: runPracticalTour,
    }));

    // Auto-início na primeira visita (abre o modal de boas-vindas)
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[99999999] p-4 animate-fade-in select-none">
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
                      Simulação do dia a dia da fábrica na tela aberta: navegação cronológica com dados de apoio preenchidos nos formulários sem afetar o banco.
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
                  💡 Ideal para avaliadores, recrutadores e demonstrações técnicas.
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
            max-width: 460px !important;
            min-width: 320px !important;
            background: #ffffff !important;
            border-radius: 20px !important;
            padding: 24px 26px !important;
            box-shadow: 0 25px 60px -15px rgba(0, 32, 70, 0.4), 0 0 0 1px rgba(0, 32, 70, 0.1) !important;
            border: none !important;
            z-index: 1000000000 !important;
          }

          .kore-driver-popover .driver-popover-title {
            font-size: 16px !important;
            font-weight: 800 !important;
            color: #002046 !important;
            letter-spacing: -0.02em !important;
            margin-bottom: 10px !important;
          }

          .kore-driver-popover .driver-popover-description {
            font-size: 13px !important;
            line-height: 1.6 !important;
            color: #334155 !important;
          }

          .kore-driver-popover .driver-popover-footer {
            margin-top: 18px !important;
            padding-top: 14px !important;
            border-top: 1px solid #e2e8f0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: space-between !important;
          }

          .kore-driver-popover .driver-popover-progress-text {
            font-size: 11px !important;
            font-weight: 800 !important;
            color: #64748b !important;
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
            box-shadow: 0 2px 8px rgba(253, 121, 11, 0.35) !important;
            transition: all 0.2s ease !important;
          }

          .kore-driver-popover .driver-popover-next-btn:hover {
            background: #e66b05 !important;
            transform: translateY(-1px) !important;
            box-shadow: 0 4px 12px rgba(253, 121, 11, 0.45) !important;
          }

          .kore-driver-popover .driver-popover-prev-btn {
            background: #f1f5f9 !important;
            color: #002046 !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
          }

          .kore-driver-popover .driver-popover-prev-btn:hover {
            background: #e2e8f0 !important;
            transform: translateY(-1px) !important;
          }

          .kore-driver-popover .driver-popover-close-btn {
            color: #94a3b8 !important;
            font-size: 20px !important;
            transition: color 0.15s ease !important;
          }

          .kore-driver-popover .driver-popover-close-btn:hover {
            color: #0f172a !important;
          }

          /* Destaque suave com borda arredondada no elemento focado */
          .driver-active-element {
            outline: 3px solid #fd790b !important;
            outline-offset: 4px !important;
            box-shadow: 0 0 25px rgba(253, 121, 11, 0.35) !important;
            transition: all 0.3s ease !important;
          }
        `}</style>
      </>
    );
  }
);

InteractiveTour.displayName = "InteractiveTour";
export default InteractiveTour;
