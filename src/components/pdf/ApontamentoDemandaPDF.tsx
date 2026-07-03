import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image } from '@react-pdf/renderer';
import { Order, OrderLine } from '../../types';

// Create styles
const styles = StyleSheet.create({
  page: { padding: 30, fontSize: 9, fontFamily: 'Helvetica' },
  title: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 10, fontWeight: 'bold', backgroundColor: '#002046', color: '#ffffff', padding: 3, marginTop: 10 },
  table: { width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#000', marginBottom: 5 },
  tableRow: { flexDirection: 'row' },
  tableColHeader: { borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#000', backgroundColor: '#f0f0f0', padding: 3 },
  tableCol: { borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#000', padding: 3 },
  tableColRight: { borderStyle: 'solid', borderBottomWidth: 1, borderRightWidth: 1, borderColor: '#000', padding: 3, textAlign: 'right' },
  textHeader: { fontWeight: 'bold', fontSize: 8 },
  text: { fontSize: 8, fontFamily: 'Courier' }, // Monospaced for numbers
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

const ColHeader = ({ children, width, isLast = false, isLastRow = false }: any) => (
  <View style={[styles.tableColHeader, { width }, isLast ? { borderRightWidth: 0 } : {}, isLastRow ? { borderBottomWidth: 0 } : {}]}>
    <Text style={styles.textHeader}>{children}</Text>
  </View>
);

const Col = ({ children, width, isLast = false, isLastRow = false, rightAlign = false }: any) => (
  <View style={[rightAlign ? styles.tableColRight : styles.tableCol, { width }, isLast ? { borderRightWidth: 0 } : {}, isLastRow ? { borderBottomWidth: 0 } : {}]}>
    <Text style={styles.text}>{children}</Text>
  </View>
);

interface DemandaProps {
  order: Order;
}

const parseLength = (measure: string): number => {
  const match = measure.match(/(\d+)x(\d+)x(\d+)/i);
  return match ? parseInt(match[3]) : 2200; // Default 2200mm
};

const ApontamentoDemandaPDF = ({ order }: DemandaProps) => {
  let totalSteelWeight = 0;
  let totalBlendWeight = 0;
  
  const itemsData = order.items.map(item => {
    const lengthMm = parseLength(item.measure);
    const lengthM = lengthMm / 1000;
    const rodLengthM = (lengthMm - 70) / 1000;
    
    // Aço
    const linearSteel = rodLengthM * 4 * item.totalQtd;
    const steelWeight = linearSteel * 0.395;
    totalSteelWeight += steelWeight;
    
    // Blend
    const volumeBruto = 0.0064 * lengthM * item.totalQtd;
    const volumeAco = steelWeight / 7850; // Densidade do aço
    const volumeLiquido = volumeBruto - volumeAco;
    const blendWeight = volumeLiquido * 0.98 * 1000; // kg
    totalBlendWeight += blendWeight;
    
    return {
      item, lengthM, rodLengthM, linearSteel, steelWeight,
      volumeBruto, volumeAco, volumeLiquido, blendWeight
    };
  });

  const blendTons = totalBlendWeight / 1000;
  const ricinoMl = blendTons * 150;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{order.clientName} - Demanda de Aço e Blend Polimérico</Text>

        {/* Bloco 0: Critérios */}
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="50%">Parâmetro</ColHeader>
            <ColHeader width="50%" isLast>Critério aplicado</ColHeader>
          </View>
          <View style={styles.tableRow}><Col width="50%">Densidade do Blend</Col><Col width="50%" isLast>0,98 t/m³</Col></View>
          <View style={styles.tableRow}><Col width="50%">Seção externa base</Col><Col width="50%" isLast>0,0064 m²</Col></View>
          <View style={styles.tableRow}><Col width="50%" isLastRow>Fórmula do aço Ø8mm</Col><Col width="50%" isLast isLastRow>d²/162 = 0,395 kg/m</Col></View>
        </View>

        {/* 1. Demanda de aço */}
        <Text style={styles.sectionTitle}>1. Demanda de aço - metros, peso e bobinas</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="25%">Medida</ColHeader>
            <ColHeader width="10%">Qtde</ColHeader>
            <ColHeader width="15%">Compr. suporte</ColHeader>
            <ColHeader width="15%">Compr. vergalhão</ColHeader>
            <ColHeader width="20%">Demanda aço linear</ColHeader>
            <ColHeader width="15%" isLast>Peso aço</ColHeader>
          </View>
          {itemsData.map((data, i) => {
            const isLastRow = i === itemsData.length - 1;
            return (
              <View style={styles.tableRow} key={data.item.itemNum}>
                <Col width="25%" isLastRow={isLastRow}>{data.item.product}</Col>
                <Col width="10%" rightAlign isLastRow={isLastRow}>{data.item.totalQtd}</Col>
                <Col width="15%" rightAlign isLastRow={isLastRow}>{data.lengthM.toFixed(3)} m</Col>
                <Col width="15%" rightAlign isLastRow={isLastRow}>{data.rodLengthM.toFixed(3)} m</Col>
                <Col width="20%" rightAlign isLastRow={isLastRow}>{data.linearSteel.toFixed(2)} m</Col>
                <Col width="15%" rightAlign isLast isLastRow={isLastRow}>{data.steelWeight.toFixed(2)} kg</Col>
              </View>
            );
          })}
        </View>
        
        {/* Resumo de bobinas */}
        <View style={{...styles.table, width: '40%', alignSelf: 'flex-end'}}>
          <View style={styles.tableRow}>
            <ColHeader width="60%">Resumo de bobinas</ColHeader>
            <ColHeader width="40%" isLast>Resultado</ColHeader>
          </View>
          <View style={styles.tableRow}>
            <Col width="60%" isLastRow>Bobinas de 2.000 kg</Col>
            <Col width="40%" rightAlign isLast isLastRow>{(totalSteelWeight / 2000).toFixed(2)} un</Col>
          </View>
        </View>

        {/* 2. Volume e consumo de blend */}
        <Text style={styles.sectionTitle}>2. Volume e consumo de blend</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="20%">Medida</ColHeader>
            <ColHeader width="10%">Qtde</ColHeader>
            <ColHeader width="15%">Vol. bruto ext.</ColHeader>
            <ColHeader width="20%">Vol. ocupado aço</ColHeader>
            <ColHeader width="20%">Vol. líquido blend</ColHeader>
            <ColHeader width="15%" isLast>Peso blend</ColHeader>
          </View>
          {itemsData.map((data, i) => {
            const isLastRow = i === itemsData.length - 1;
            return (
              <View style={styles.tableRow} key={data.item.itemNum}>
                <Col width="20%" isLastRow={isLastRow}>{data.item.measure}</Col>
                <Col width="10%" rightAlign isLastRow={isLastRow}>{data.item.totalQtd}</Col>
                <Col width="15%" rightAlign isLastRow={isLastRow}>{data.volumeBruto.toFixed(4)} m³</Col>
                <Col width="20%" rightAlign isLastRow={isLastRow}>{data.volumeAco.toFixed(4)} m³</Col>
                <Col width="20%" rightAlign isLastRow={isLastRow}>{data.volumeLiquido.toFixed(4)} m³</Col>
                <Col width="15%" rightAlign isLast isLastRow={isLastRow}>{data.blendWeight.toFixed(2)} kg</Col>
              </View>
            );
          })}
        </View>

        {/* 3. Peso por metro */}
        <Text style={styles.sectionTitle}>3. Peso por metro - suporte 80 x 80 mm</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="20%">Condição</ColHeader>
            <ColHeader width="20%">Vol. blend /m</ColHeader>
            <ColHeader width="20%">Peso blend /m</ColHeader>
            <ColHeader width="20%">Peso aço /m</ColHeader>
            <ColHeader width="20%" isLast>Peso final /m</ColHeader>
          </View>
          <View style={styles.tableRow}>
            <Col width="20%">Suporte sem aço</Col>
            <Col width="20%" rightAlign>0.0064 m³</Col>
            <Col width="20%" rightAlign>6.272 kg/m</Col>
            <Col width="20%" rightAlign>0.00 kg/m</Col>
            <Col width="20%" rightAlign isLast>6.272 kg/m</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="20%">Suporte com aço</Col>
            <Col width="20%" rightAlign>0.006198 m³</Col>
            <Col width="20%" rightAlign>6.07 kg/m</Col>
            <Col width="20%" rightAlign>1.58 kg/m</Col>
            <Col width="20%" rightAlign isLast>7.65 kg/m</Col>
          </View>
          <View style={styles.tableRow}>
            <Col width="20%" isLastRow>Média Real</Col>
            <Col width="20%" rightAlign isLastRow>0.006204 m³</Col>
            <Col width="20%" rightAlign isLastRow>6.080 kg/m</Col>
            <Col width="20%" rightAlign isLastRow>1.540 kg/m</Col>
            <Col width="20%" rightAlign isLast isLastRow>7.620 kg/m</Col>
          </View>
        </View>

        {/* 4. Formulação do blend */}
        <Text style={styles.sectionTitle}>4. Formulação do blend - consumo total por tipo</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="30%">Componente</ColHeader>
            <ColHeader width="20%">Percentual</ColHeader>
            <ColHeader width="25%">Qtde (Ton)</ColHeader>
            <ColHeader width="25%" isLast>Qtde (kg)</ColHeader>
          </View>
          {[
            { comp: 'PEAD de Alta', perc: 0.30 },
            { comp: 'PEAD de Baixa', perc: 0.30 },
            { comp: 'XLPO / Crosslink', perc: 0.40 },
          ].map((c, i) => (
            <View style={styles.tableRow} key={c.comp}>
              <Col width="30%" isLastRow={i === 2}>{c.comp}</Col>
              <Col width="20%" rightAlign isLastRow={i === 2}>{(c.perc * 100)}%</Col>
              <Col width="25%" rightAlign isLastRow={i === 2}>{(blendTons * c.perc).toFixed(3)} t</Col>
              <Col width="25%" rightAlign isLast isLastRow={i === 2}>{(totalBlendWeight * c.perc).toFixed(2)} kg</Col>
            </View>
          ))}
        </View>

        {/* 5. Óleo de rícino */}
        <Text style={styles.sectionTitle}>5. Óleo de rícino</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <ColHeader width="50%">Parâmetro</ColHeader>
            <ColHeader width="50%" isLast>Resultado</ColHeader>
          </View>
          <View style={styles.tableRow}>
            <Col width="50%" isLastRow>Aditivo Operacional (150ml/t)</Col>
            <Col width="50%" rightAlign isLast isLastRow>{ricinoMl.toFixed(2)} ml</Col>
          </View>
        </View>

        <View style={styles.footer} fixed>
          <View style={styles.footerImages}>
            <Image src="/kore-black.png" style={styles.footerLogo} />
            <Image src="/assinatura.png" style={styles.footerAssinatura} />
            <Text style={styles.footerText}>Kore Industrial ERP © 2026</Text>
          </View>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => (
            `Página ${pageNumber} de ${totalPages}`
          )} />
        </View>
      </Page>
    </Document>
  );
};

export default ApontamentoDemandaPDF;
