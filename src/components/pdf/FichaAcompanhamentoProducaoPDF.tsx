import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Order } from '../../types';

// Create styles
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 10,
    textAlign: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#002046',
    color: '#ffffff',
    padding: 3,
    marginTop: 10,
  },
  table: {
    width: '100%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 5,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColHeader: {
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    backgroundColor: '#f0f0f0',
    padding: 3,
  },
  tableCol: {
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#000',
    padding: 3,
  },
  textHeader: {
    fontWeight: 'bold',
    fontSize: 8,
  },
  text: {
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderColor: '#000',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerImages: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerLogo: {
    height: 14,
    marginRight: 10,
  },
  footerAssinatura: {
    height: 14,
    marginRight: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#333',
  },
});

// Helper for dynamic table columns
const Col = ({ children, width, isHeader = false, isLast = false, isLastRow = false }: any) => (
  <View style={[
    isHeader ? styles.tableColHeader : styles.tableCol,
    { width },
    isLast ? { borderRightWidth: 0 } : {},
    isLastRow ? { borderBottomWidth: 0 } : {}
  ]}>
    <Text style={isHeader ? styles.textHeader : styles.text}>{children}</Text>
  </View>
);

interface FichaProps {
  order: Order;
}

const parseLength = (measure: string): number => {
  const match = measure.match(/(\d+)x(\d+)x(\d+)/i);
  return match ? parseInt(match[3]) : 2200; // Default 2200mm
};

const FichaAcompanhamentoProducaoPDF = ({ order }: FichaProps) => {
  const totalVolume = order.items.reduce((acc, i) => acc + i.totalQtd, 0);
  const totalProduced = order.items.reduce((acc, i) => acc + i.produced, 0);
  
  let totalSteelWeight = 0;
  let totalBlendWeight = 0;
  
  order.items.forEach(item => {
    const lengthMm = parseLength(item.measure);
    const lengthM = lengthMm / 1000;
    const rodLengthM = (lengthMm - 70) / 1000;
    
    // Aço
    const linearSteel = rodLengthM * 4 * item.totalQtd;
    const steelWeight = linearSteel * 0.395;
    totalSteelWeight += steelWeight;
    
    // Blend
    const volumeBruto = 0.0064 * lengthM * item.totalQtd;
    const volumeAco = steelWeight / 7850;
    const volumeLiquido = volumeBruto - volumeAco;
    const blendWeight = volumeLiquido * 0.98 * 1000;
    totalBlendWeight += blendWeight;
  });

  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>FICHA DE ACOMPANHAMENTO DE PRODUCAO - {order.clientName}</Text>
        <Text style={styles.subtitle}>Layout programado corrigido - historico consolidado e quadro operacional</Text>

        {/* 1. Cabeçalho de identificação */}
        <Text style={styles.sectionTitle}>1. Cabeçalho de identificação</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Col width="30%" isHeader>Data de emissão</Col>
            <Col width="70%" isLast>{order.emissionDate}</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="30%" isHeader>Cliente / Pedido</Col>
            <Col width="70%" isLast>{order.clientName} / {order.id}</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="30%" isHeader>Total geral do pedido</Col>
            <Col width="70%" isLast>{totalVolume.toLocaleString()} peças</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="30%" isHeader>Status consolidado</Col>
            <Col width="70%" isLast>{totalProduced >= totalVolume ? 'Finalizado' : 'Em Execução'}</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="30%" isHeader isLastRow>Layout aplicado</Col>
            <Col width="70%" isLast isLastRow>Padrão Engenharia OP-V3</Col>
          </View>
        </View>

        {/* 2. Carregamentos de hoje */}
        <Text style={styles.sectionTitle}>2. Carregamentos de hoje / conferencia de expedicao</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Col width="100%" isHeader isLast>Registro logístico</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="100%" isLast isLastRow>Nenhum carregamento registrado</Col>
          </View>
        </View>

        {/* 3. Quadro atualizado do pedido */}
        <Text style={styles.sectionTitle}>3. Quadro atualizado do pedido</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Col width="40%" isHeader>Item</Col>
            <Col width="15%" isHeader>Total</Col>
            <Col width="15%" isHeader>Produzido final</Col>
            <Col width="15%" isHeader>Restante</Col>
            <Col width="15%" isHeader isLast>Status final</Col>
          </View>
          {order.items.map((item, index) => {
            const isLastRow = index === order.items.length - 1;
            return (
              <View style={styles.tableRow} key={item.itemNum}>
                <Col width="40%" isLastRow={isLastRow}>{item.product} ({item.measure})</Col>
                <Col width="15%" isLastRow={isLastRow}>{item.totalQtd}</Col>
                <Col width="15%" isLastRow={isLastRow}>{item.produced}</Col>
                <Col width="15%" isLastRow={isLastRow}>{item.totalQtd - item.produced}</Col>
                <Col width="15%" isLast isLastRow={isLastRow}>{item.status}</Col>
              </View>
            );
          })}
        </View>

        {/* 4. Status de vendas / expedicao */}
        <Text style={styles.sectionTitle}>4. Status de vendas / expedicao</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Col width="50%" isHeader>Ponto de controle</Col>
            <Col width="50%" isHeader isLast>Registro</Col>
          </View>
          <View style={styles.tableRow}><Col width="50%">Comercial</Col><Col width="50%" isLast>Aprovado</Col></View>
          <View style={styles.tableRow}><Col width="50%">Carga prevista</Col><Col width="50%" isLast>{order.deliveryDate}</Col></View>
          <View style={styles.tableRow}><Col width="50%">Fechamento de produção</Col><Col width="50%" isLast>Aguardando Conclusão</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Saldo final</Col><Col width="50%" isLast isLastRow>{totalVolume - totalProduced} peças</Col></View>
        </View>

        {/* 5. Apontamento cronologico do dia */}
        <Text style={styles.sectionTitle}>5. Apontamento cronologico do dia / historico operacional</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <Col width="20%" isHeader>Data</Col>
            <Col width="60%" isHeader>Evento registrado</Col>
            <Col width="20%" isHeader isLast>Acumulado / saldo</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="20%" isLastRow>{new Date().toLocaleDateString('pt-BR')}</Col>
            <Col width="60%" isLastRow>Início de apontamentos no turno</Col>
            <Col width="20%" isLast isLastRow>{totalProduced}</Col>
          </View>
        </View>

        {/* 6. Reprogramacao tecnica */}
        <Text style={styles.sectionTitle}>6. Reprogramacao tecnica</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Item de controle</Col><Col width="50%" isHeader isLast>Registro corrigido...</Col></View>
          <View style={styles.tableRow}><Col width="50%">Setup Inicial</Col><Col width="50%" isLast>{order.deliveryDate}</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Transição operacional</Col><Col width="50%" isLast isLastRow>Setup sem paradas longas</Col></View>
        </View>
        
        <View style={styles.footer} fixed>
          <View style={styles.footerImages}>
            <Image src="/HelpeLife_Logotipo.png" style={styles.footerLogo} />
            <Image src="/assinatura.png" style={styles.footerAssinatura} />
            <Text style={styles.footerText}>Helpe Life ERP © 2026</Text>
          </View>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
      
      <Page size="A4" style={styles.page}>
        {/* 7. Setup */}
        <Text style={styles.sectionTitle}>7. Setup</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Controle</Col><Col width="50%" isHeader isLast>Parametro aplicado</Col></View>
          <View style={styles.tableRow}><Col width="50%">Extrusora prioritária</Col><Col width="50%" isLast>{order.items[0]?.extruder || 'N/A'}</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Borra/defeitos</Col><Col width="50%" isLast isLastRow>Menos de 2% (Tolerável)</Col></View>
        </View>

        {/* 8. Colaboradores / horas extras */}
        <Text style={styles.sectionTitle}>8. Colaboradores / horas extras</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Campo</Col><Col width="50%" isHeader isLast>Registro</Col></View>
          <View style={styles.tableRow}><Col width="50%">Equipe</Col><Col width="50%" isLast>Equipe Principal (Turno A)</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Horas extras</Col><Col width="50%" isLast isLastRow>0H</Col></View>
        </View>

        {/* 9. Controle do tempo de maquina */}
        <Text style={styles.sectionTitle}>9. Controle do tempo de maquina</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Parametro</Col><Col width="50%" isHeader isLast>Valor/registro</Col></View>
          <View style={styles.tableRow}><Col width="50%">Tempo estimado de OP</Col><Col width="50%" isLast>{order.timeEstimated} Horas</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>OEE Aplicado</Col><Col width="50%" isLast isLastRow>{order.efficiency}%</Col></View>
        </View>

        {/* 10. Apontamento de insumos */}
        <Text style={styles.sectionTitle}>10. Apontamento de insumos</Text>
        <Text style={{ fontSize: 8, marginBottom: 5 }}>Resumo consolidado de consumo da OP atual para apontamento na baia de produção.</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Insumo</Col><Col width="50%" isHeader isLast>Criterio/valor</Col></View>
          <View style={styles.tableRow}><Col width="50%">Aço estimado corrigido</Col><Col width="50%" isLast>{totalSteelWeight.toFixed(2)} kg</Col></View>
          <View style={styles.tableRow}><Col width="50%">Blend estimado</Col><Col width="50%" isLast>{totalBlendWeight.toFixed(2)} kg</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Óleo de rícino</Col><Col width="50%" isLast isLastRow>150ml por Ton. de blend</Col></View>
        </View>

        {/* 11. Quadro de fechamento consolidado */}
        <Text style={styles.sectionTitle}>11. Quadro de fechamento consolidado</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Indicador</Col><Col width="50%" isHeader isLast>Resultado</Col></View>
          <View style={styles.tableRow}><Col width="50%">Total Geral</Col><Col width="50%" isLast>{totalVolume}</Col></View>
          <View style={styles.tableRow}><Col width="50%">Produzido Final</Col><Col width="50%" isLast>{totalProduced}</Col></View>
          <View style={styles.tableRow}><Col width="50%">Restante</Col><Col width="50%" isLast>{totalVolume - totalProduced}</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Status industrial</Col><Col width="50%" isLast isLastRow>{totalProduced >= totalVolume ? 'Concluído' : 'Processando'}</Col></View>
        </View>

        {/* 12. Campos fixos para proximas fichas */}
        <Text style={styles.sectionTitle}>12. Campos fixos para proximas fichas</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}><Col width="50%" isHeader>Ordem fixa</Col><Col width="50%" isHeader isLast>Campo obrigatorio...</Col></View>
          {[
            'Cabeçalho de identificação',
            'Carregamentos de hoje',
            'Quadro atualizado do pedido',
            'Status de vendas / expedicao',
            'Apontamento cronologico do dia',
            'Reprogramacao tecnica',
            'Setup',
            'Colaboradores / horas extras',
            'Controle do tempo de maquina',
            'Apontamento de insumos'
          ].map((name, i) => (
            <View style={styles.tableRow} key={i}>
              <Col width="50%" isLastRow={i === 9}>Seção {i + 1} - {name}</Col>
              <Col width="50%" isLast isLastRow={i === 9}> </Col>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerImages}>
            <Image src="/HelpeLife_Logotipo.png" style={styles.footerLogo} />
            <Image src="/assinatura.png" style={styles.footerAssinatura} />
            <Text style={styles.footerText}>Helpe Life ERP © 2026</Text>
          </View>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default FichaAcompanhamentoProducaoPDF;
