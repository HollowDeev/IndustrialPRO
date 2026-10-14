"use client";

import React, { useEffect, useImperativeHandle, forwardRef, useState } from "react";
import { driver, DriveStep } from "driver.js";
import "driver.js/dist/driver.css";

export interface InteractiveTourHandle {
  startTour: () => void;
}

interface InteractiveTourProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
}

const STORAGE_KEY = "kore_industrial_tour_seen_v1";

export const InteractiveTour = forwardRef<InteractiveTourHandle, InteractiveTourProps>(
  ({ currentScreen, setCurrentScreen }, ref) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    const runTour = () => {
      // Se não estiver na Central, navega para a central antes de rodar o tour
      if (currentScreen !== "dashboard") {
        setCurrentScreen("dashboard");
      }

      // Pequeno timeout para garantir renderização do DOM
      setTimeout(() => {
        const steps: DriveStep[] = [
          // Passo 1: Boas-vindas (Modal Centralizado)
          {
            popover: {
              title: "🏭 Bem-vindo ao Kore Industrial",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Este software é um <strong>ERP & MRP Industrial de Alta Precisão</strong>, desenvolvido sob medida para automação e controle operacional de fábricas de transformação e coextrusão.
                  </p>
                  <div style="background: #f8fafc; border-left: 4px solid #fd790b; padding: 10px 12px; border-radius: 6px; margin: 10px 0; font-size: 12px; color: #334155;">
                    <strong style="color: #002046;">💡 Para quem não é da área industrial:</strong><br/>
                    Fabricar tubos e cabos industriais exige dosar com exatidão plásticos derretidos, insumos químicos e fitas de aço. Um desvio de 1% pode causar toneladas de refugo. Este sistema orquestra e calcula tudo com precisão matemática em tempo real.
                  </div>
                  <p style="font-size: 11px; color: #64748b; margin-top: 6px;">
                    Clique em <strong>Próximo →</strong> para conhecer os módulos e diferenciais de engenharia!
                  </p>
                </div>
              `,
              side: "bottom",
              align: "center",
            },
          },

          // Passo 2: Menu Lateral e Navegação
          {
            element: "#kore-logo-container",
            popover: {
              title: "🧭 Navegação Modular & Atalhos",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    O sistema foi estruturado em três pilares industriais: <strong>Cadastros de Engenharia</strong>, <strong>Chão de Fábrica (PCP)</strong> e <strong>Cérebro Financeiro/Comercial</strong>.
                  </p>
                  <div style="background: #eff6ff; border-left: 4px solid #002046; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #1e3a8a;">
                    <strong>⌨️ Atalho de Teclado:</strong> Pressione a tecla <u>'S'</u> a qualquer momento para recolher ou expandir a barra lateral e ganhar espaço de visualização na fábrica.
                  </div>
                </div>
              `,
              side: "right",
              align: "start",
            },
          },

          // Passo 3: Ação Instantânea de Pedidos
          {
            element: "#tour-nav-action-btn",
            popover: {
              title: "⚡ Ação Rápida: Emissão de Pedidos",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    Este botão de ação contextual se adapta dinamicamente à tela em que você estiver. Aqui na Central, ele abre o modal de <strong>Novo Pedido</strong> (atalho tecla <strong>'N'</strong>).
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

          // Passo 4: KPIs em Tempo Real
          {
            element: "#tour-dashboard-kpis",
            popover: {
              title: "📊 Indicadores Fabris em Tempo Real",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">Painel de controle executivo para o diretor e os gerentes de produção:</p>
                  <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.7; color: #334155;">
                    <li><strong>Carteira de Vendas:</strong> Demanda pendente de produção encomendada pelos clientes.</li>
                    <li><strong>Estoque de Blend:</strong> Saldo físico real de matérias-primas no almoxarifado em toneladas.</li>
                    <li><strong>Alerta de MRP:</strong> Algoritmo de segurança que avisa em vermelho se faltar insumo nos próximos dias.</li>
                    <li><strong>OPs Ativas:</strong> Quantas ordens de produção estão rodando nas extrusoras neste instante.</li>
                  </ul>
                </div>
              `,
              side: "bottom",
              align: "center",
            },
          },

          // Passo 5: Motor de Explosão MRP I
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
                    Ele cruza a demanda de todas as encomendas ativas com o saldo físico de estoque. Se detectar que faltará resina ou fita de aço, o botão <strong>'Gerar Ordem'</strong> permite requisitar a compra do insumo aos fornecedores homologados com apenas 1 clique.
                  </p>
                  <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 6px 10px; border-radius: 6px; font-size: 11px; color: #166534;">
                    ✓ Elimina o risco de a linha de produção parar por falta de matéria-prima.
                  </div>
                </div>
              `,
              side: "top",
              align: "start",
            },
          },

          // Passo 6: Chão de Fábrica & Previsão de Bateladas
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
                    O algoritmo calcula a <strong>Data de Previsão de Fechamento</strong> considerando a velocidade mecânica das máquinas (peças/hora) e a jornada de turnos dos operadores, fornecendo um prazo realista ao cliente.
                  </p>
                </div>
              `,
              side: "left",
              align: "center",
            },
          },

          // Passo 7: Fórmulas e Receitas (BOM)
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
                    <strong>O que é BOM?</strong> Sigla para <em>Bill of Materials</em> ('Lista de Ingredientes'). Define a receita travada: ex. 85% de Polietileno, 12% de Composto Reticulável, 3% de Corante e alma de aço, com tolerâncias milimétricas.
                  </div>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },

          // Passo 8: Almoxarifado Inteligente & FIFO
          {
            element: "#tour-nav-estoque",
            popover: {
              title: "📦 Almoxarifado & Regra FIFO",
              description: `
                <div style="font-size: 13px; line-height: 1.6; color: #2d3748;">
                  <p style="margin-bottom: 8px;">
                    No menu <strong>Almoxarifado</strong>, o estoque opera sob a metodologia contábil <strong>FIFO (First-In, First-Out)</strong>.
                  </p>
                  <p style="margin-bottom: 8px;">
                    O primeiro lote de aço ou plástico recebido é o primeiro a ser consumido. Como o preço dessas commodities oscila semanalmente, o sistema rastreia o custo exato de cada lote recebido para apurar o lucro real sem distorções.
                  </p>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },

          // Passo 9: Formação de Preço e Módulo Financeiro
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
                    <li><strong>Formação de Preço:</strong> Simula o preço de venda ideal considerando custo de insumos, rateio de custos fixos da fábrica e margem líquida desejada.</li>
                    <li><strong>Matriz Fiscal Interestadual:</strong> Calcula automaticamente ICMS interestadual, IPI, PIS e COFINS por estado de destino.</li>
                    <li><strong>DRE em Tempo Real:</strong> Demonstração do Resultado do Exercício com receitas, custos e lucros.</li>
                  </ul>
                </div>
              `,
              side: "right",
              align: "center",
            },
          },

          // Passo 10: Botão de Acesso Permanente
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
                    💡 <strong>Para os Avaliadores:</strong> Se quiser rever este roteiro a qualquer momento, basta clicar neste botão <strong>'Guia do Sistema'</strong> no topo da tela.
                  </div>
                </div>
              `,
              side: "bottom",
              align: "end",
            },
          },
        ];

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
            try {
              localStorage.setItem(STORAGE_KEY, "true");
            } catch (e) {
              console.warn("Não foi possível salvar o estado do tour:", e);
            }
          },
        });

        driverObj.drive();
      }, 350);
    };

    useImperativeHandle(ref, () => ({
      startTour: runTour,
    }));

    // Auto-iniciar na primeira visita do avaliador
    useEffect(() => {
      if (!mounted) return;

      try {
        const hasSeen = localStorage.getItem(STORAGE_KEY);
        if (!hasSeen) {
          // Aguarda o carregamento inicial da interface
          const timer = setTimeout(() => {
            runTour();
          }, 1400);
          return () => clearTimeout(timer);
        }
      } catch (e) {
        console.warn("Storage inacessível:", e);
      }
    }, [mounted]);

    return (
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
    );
  }
);

InteractiveTour.displayName = "InteractiveTour";
export default InteractiveTour;
