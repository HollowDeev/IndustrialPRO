# 🏭 Helpe - Sistema Integrado de Gestão Industrial (PCP & MRP I)

> Plataforma SaaS Multi-Tenant desenvolvida para o planejamento, controle e automação da gestão de materiais (MRP I) em ambientes de manufatura polimérica.

---

## 📋 Sobre o Projeto

O **Helpe Gestão Industrial** atua como a Unidade Central de Processamento do escritório de produção. O sistema foi projetado para substituir rotinas descentralizadas por um banco de dados relacional robusto, orquestrando desde a entrada de demandas de vendas até a explosão de necessidades líquidas de matéria-prima (Aço e Blends Poliméricos).

O núcleo do sistema baseia-se em conceitos rigorosos de **Engenharia de Produção**, estabelecendo matrizes de geometria paramétrica (Famílias e SKUs) e blindando a Árvore de Estrutura de Produto (BOM - *Bill of Materials*) contra falhas operacionais.

---

## 🛠️ Stack Tecnológica e Arquitetura

Este projeto utiliza uma arquitetura *API-First* e *Serverless*, garantindo alta disponibilidade, escalabilidade e segurança de ponta a ponta.

| Camada | Tecnologia | Propósito / Aplicação Operacional |
| :--- | :--- | :--- |
| **Front-end** | Next.js (App Router) + React | Interface de usuário reativa, renderização híbrida e rotas protegidas. |
| **Estilização** | Tailwind CSS | Padronização de design system e responsividade. |
| **Back-end & DB** | Server-Side Next.js | PostgreSQL | Motor relacional, *Database Functions* e armazenamento seguro de laudos. |
| **Autenticação** | PostgreSQL | Gestão de identidade com suporte a *White-label SMTP*. |
| **Segurança (DB)** | PostgreSQL RLS | Isolamento criptográfico de inquilinos (*Multi-Tenancy*). |

---

## ⚙️ Módulo 1 - Funcionalidades Principais (Core)

* **📦 Catálogo Paramétrico e SKUs:** Cadastro de famílias de produtos e suas variáveis dimensionais, fixando constantes físicas (ex: densidade volumétrica, peso nominal por metro linear).
* **🧪 Engenharia de Produto (BOM):** Formulação química travada no banco de dados, controlando percentuais exatos de misturas (PEAD, XLPO, Aditivos) e descontos operacionais (ex: tolerância de maquinário e cortes de aço).
* **💥 Motor de Explosão de Necessidades (MRP I):** Cálculo automatizado que converte a demanda de vendas em metros lineares, massa e volume líquido, sugerindo Ordens de Compra baseadas no saldo de estoque real.
* **📊 Apontamentos de Produção:** Registro do ciclo de vida das Ordens de Produção, contabilizando horas de máquina, consumo de insumos, setup e geração de refugo.

---

## ⚠️ Clonagem do Repositório 
Este é um software proprietário.
É estritamente proibida a cópia, modificação, distribuição, publicação, engenharia 
reversa ou uso comercial deste código fonte, de seus algoritmos e arquivos 
associados sem a autorização prévia, expressa e por escrito do autor.

O acesso de leitura ao repositório, quando concedido a terceiros, é feito unicamente 
para fins de auditoria, acompanhamento de desenvolvimento e homologação visual, 
não constituindo, em nenhuma hipótese, transferência de direitos autorais ou de 
propriedade intelectual.