import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { order_id } = await request.json()

    if (!order_id) {
      return NextResponse.json({ error: 'order_id é obrigatório' }, { status: 400 })
    }

    // 1. Buscar o Pedido com todas as suas Ordens de Produção filhas, SKUs, Família, BOM e Insumos
    const { data: pedido, error: dbError } = await supabase
      .from('pedidos')
      .select(`
        id,
        codigo,
        clientes (
          razao_social
        ),
        localizacao,
        prioridade,
        ordens_producao (
          id,
          quantidade_planejada,
          status,
          skus (
            id,
            codigo,
            comprimento_mm,
            desconto_aco_mm,
            familias_produto (
              id,
              nome,
              area_secao_externa,
              volume_aco_metro,
              densidade_g_cm3,
              bom (
                id,
                quantidade_por_unidade,
                percentual_blend,
                insumos (
                  id,
                  nome,
                  categoria,
                  unidade_medida,
                  estoque_atual
                )
              )
            )
          )
        )
      `)
      .eq('id', order_id)
      .single()

    if (dbError || !pedido) {
      return NextResponse.json({ error: `Pedido não encontrado: ${dbError?.message || 'Nenhum registro correspondente'}` }, { status: 404 })
    }

    // 2. Dicionário para agregar necessidades de insumos por ID
    const necessidadesMap: Record<string, {
      insumo_id: string
      nome: string
      categoria: string
      unidade_medida: string
      estoque_atual: number
      total_necessario: number
    }> = {}

    // Auxiliar para inicializar insumo no mapa
    const registrarNecessidade = (insumo: any, qtd: number) => {
      if (!necessidadesMap[insumo.id]) {
        necessidadesMap[insumo.id] = {
          insumo_id: insumo.id,
          nome: insumo.nome,
          categoria: insumo.categoria,
          unidade_medida: insumo.unidade_medida,
          estoque_atual: Number(insumo.estoque_atual) || 0,
          total_necessario: 0
        }
      }
      necessidadesMap[insumo.id].total_necessario += qtd
    }

    // 3. Processar cada Ordem de Produção (item do pedido)
    for (const op of (pedido.ordens_producao || [])) {
      const sku = op.skus as any
      if (!sku) continue
      
      const familia = sku.familias_produto
      if (!familia) continue

      const qtdPlanejada = op.quantidade_planejada
      const compPecaM = sku.comprimento_mm / 1000 // comprimento em metros
      const descAcoM = (sku.desconto_aco_mm || 70) / 1000 // desconto de aço em metros
      const compAcoM = Math.max(0, compPecaM - descAcoM) // comprimento final do aço por peça em metros

      // A) Constantes Físicas da Família
      const areaSecaoM2 = Number(familia.area_secao_externa) || 0
      const densidadeKgM3 = (Number(familia.densidade_g_cm3) || 0.95) * 1000 // Conversão g/cm3 para kg/m3

      // B) Volumes por Peça
      let qtdHastesAco = 1
      let areaSecaoAcoM2 = 0
      
      const acoBom = (familia.bom || []).find((b: any) => b.insumos && b.insumos.categoria === 'ACO')
      if (acoBom) {
        qtdHastesAco = acoBom.quantidade_por_unidade || 1
        if (acoBom.insumos.bitola_mm) {
          const radiusM = (Number(acoBom.insumos.bitola_mm) / 1000.0) / 2.0
          areaSecaoAcoM2 = Math.PI * Math.pow(radiusM, 2)
        }
      }

      const volTotalPecaM3 = areaSecaoM2 * compPecaM
      const volAcoPecaM3 = areaSecaoAcoM2 * compAcoM * qtdHastesAco
      const volPlasticoPecaM3 = Math.max(0, volTotalPecaM3 - volAcoPecaM3)

      // C) Massa Total de Plástico (Volume * Densidade * Quantidade)
      const pesoPlasticoOpKg = volPlasticoPecaM3 * densidadeKgM3 * qtdPlanejada

      // D) Explosão do BOM (Fórmulas do Blend)
      for (const itemBOM of (familia.bom || [])) {
        const insumo = itemBOM.insumos
        if (!insumo) continue

        if (insumo.categoria === 'ACO') {
          const quantidadeHastes = itemBOM.quantidade_por_unidade || 1
          const compAcoTotalM = compAcoM * quantidadeHastes * qtdPlanejada
          const pesoNominal = insumo.peso_nominal_kg_m !== null ? Number(insumo.peso_nominal_kg_m) : 0.395
          const pesoAcoTotalKg = compAcoTotalM * pesoNominal

          // Aço é calculado linearmente ou por peso dependendo da unidade
          if (insumo.unidade_medida.toLowerCase() === 'm') {
            registrarNecessidade(insumo, compAcoTotalM)
          } else {
            registrarNecessidade(insumo, pesoAcoTotalKg)
          }
        } else if (insumo.categoria === 'QUIMICO') {
          if (itemBOM.percentual_blend) {
            // Insumo polimérico principal (proporcional ao percentual do blend seco)
            const necessidadeKg = pesoPlasticoOpKg * (Number(itemBOM.percentual_blend) / 100)
            registrarNecessidade(insumo, necessidadeKg)
          } else if (itemBOM.quantidade_por_unidade) {
            // Aditivo líquido / operacional (quantidade nominal por kg de plástico, ex: 0.15 ml/kg)
            const necessidadeDosagem = pesoPlasticoOpKg * Number(itemBOM.quantidade_por_unidade)
            registrarNecessidade(insumo, necessidadeDosagem)
          }
        } else {
          // Outros materiais (embalagens, etc.) associados por unidade de peça
          const necessidadeOutros = Number(itemBOM.quantidade_por_unidade || 1) * qtdPlanejada
          registrarNecessidade(insumo, necessidadeOutros)
        }
      }
    }

    // 4. Comparar com o estoque e mapear os fornecedores homologados para os insumos com déficit
    const necessidades = []
    let statusGeral = 'ESTOQUE_OK'

    for (const id in necessidadesMap) {
      const item = necessidadesMap[id]
      const deficit = Math.max(0, item.total_necessario - item.estoque_atual)
      
      if (deficit > 0) {
        statusGeral = 'DEFICIT_DETECTADO'
      }

      // Buscar fornecedores homologados que oferecem este insumo específico
      const { data: fornecedoresRel } = await supabase
        .from('fornecedores_insumos')
        .select('fornecedores (id, nome, homologado)')
        .eq('insumo_id', item.insumo_id)

      // Filtrar apenas fornecedores homologados
      const fornecedoresSugeridos = (fornecedoresRel || [])
        .map((f: any) => f.fornecedores)
        .filter((f: any) => f && f.homologado)

      necessidades.push({
        ...item,
        deficit,
        fornecedores_sugeridos: fornecedoresSugeridos
      })
    }

    return NextResponse.json({
      pedido: {
        id: pedido.id,
        codigo: pedido.codigo,
        cliente: (pedido.clientes as any)?.razao_social || 'Cliente Não Informado',
        prioridade: pedido.prioridade
      },
      status: statusGeral,
      necessidades
    })

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno de servidor' }, { status: 500 })
  }
}
