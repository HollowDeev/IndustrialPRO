CREATE OR REPLACE VIEW public.v_estoque_valorizado AS
SELECT 
    i.id,
    i.empresa_id,
    i.nome,
    i.categoria,
    i.estoque_atual,
    i.unidade_medida,
    COALESCE((i.metadados->>'last_purchase_price')::numeric, 0) AS preco_unitario,
    i.estoque_atual * COALESCE((i.metadados->>'last_purchase_price')::numeric, 0) AS valor_total_rs
FROM public.insumos i
UNION ALL
SELECT 
    s.id,
    s.empresa_id,
    COALESCE(f.nome, 'Medida') || ' - ' || s.comprimento_mm || 'mm' AS nome,
    'ACABADO' AS categoria,
    s.estoque_acabado::numeric AS estoque_atual,
    'un' AS unidade_medida,
    0 AS preco_unitario,
    0 AS valor_total_rs
FROM public.skus s
LEFT JOIN public.familias_produto f ON s.familia_id = f.id;
