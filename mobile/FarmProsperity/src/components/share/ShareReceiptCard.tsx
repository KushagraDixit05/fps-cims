// src/components/share/ShareReceiptCard.tsx
// Branded, receipt-style summary card (GPay/Paytm style) rendered off-screen and
// captured as an image for sharing. Purely presentational — driven by the same
// SharePayload used to build the share text.

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors } from '../../utils/colors';
import type { SharePayload, ShareTable } from '../../utils/shareReviewDetails';

const CARD_WIDTH = 380;

const TableBlock = ({ table }: { table: ShareTable }) => {
  if (!table.rows.length) return null;
  return (
    <View style={styles.tableBlock}>
      <Text style={styles.tableTitle}>{table.title}</Text>
      <View style={[styles.tableRow, styles.tableHeader]}>
        {table.columns.map((c, i) => (
          <Text
            key={c}
            style={[styles.tableCell, styles.tableHeadText, i === 0 && styles.tableFirstCol]}
          >
            {c}
          </Text>
        ))}
      </View>
      {table.rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow}>
          {table.columns.map((_, ci) => (
            <Text
              key={ci}
              style={[styles.tableCell, ci === 0 && styles.tableFirstCol]}
              numberOfLines={2}
            >
              {row[ci] || '—'}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

const ShareReceiptCard = ({ data }: { data: SharePayload }) => {
  return (
    <View style={styles.card}>
      {/* ── Branded header band ── */}
      <View style={styles.header}>
        <Image
          source={require('../../assets/fps_logo.jpeg')}
          style={styles.logo}
          resizeMode="contain"
        />
        <View style={styles.headerText}>
          <Text style={styles.brand}>Farm Prosperity Solutions</Text>
          <Text style={styles.module}>{data.module}</Text>
        </View>
      </View>

      {/* ── Title + date ── */}
      <View style={styles.titleBlock}>
        {!!data.title && <Text style={styles.title}>{data.title}</Text>}
        <Text style={styles.date}>{data.date}</Text>
      </View>

      {/* ── Key/value summary rows ── */}
      <View style={styles.body}>
        {data.fields
          .filter((f) => f.value && f.value !== '—')
          .map((f) => (
            <View key={f.label} style={styles.row}>
              <Text style={styles.rowLabel}>{f.label}</Text>
              <Text style={styles.rowValue}>{f.value}</Text>
            </View>
          ))}

        {(data.tables ?? []).map((t) => (
          <TableBlock key={t.title} table={t} />
        ))}

        {!!data.footerNote && (
          <View style={styles.noteBox}>
            <Text style={styles.noteText}>📝 {data.footerNote}</Text>
          </View>
        )}
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Shared via Farm Prosperity Solutions</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  logo: { width: 40, height: 40, borderRadius: 8, backgroundColor: colors.textWhite },
  headerText: { marginLeft: 12, flex: 1 },
  brand: { color: colors.textWhite, fontSize: 15, fontWeight: '700' },
  module: { color: colors.primaryLight, fontSize: 12, fontWeight: '600', marginTop: 2 },

  titleBlock: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  date: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  body: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  rowLabel: { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '600', flex: 1.6, textAlign: 'right' },

  tableBlock: { marginTop: 14 },
  tableTitle: { fontSize: 13, fontWeight: '700', color: colors.primaryMid, marginBottom: 6 },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  tableHeader: { backgroundColor: colors.background, borderRadius: 6 },
  tableHeadText: { fontWeight: '700', color: colors.textMuted, fontSize: 11 },
  tableCell: { flex: 1, fontSize: 11, color: colors.textPrimary, paddingHorizontal: 2 },
  tableFirstCol: { flex: 1.8 },

  noteBox: { backgroundColor: colors.primaryLight, borderRadius: 8, padding: 10, marginTop: 14 },
  noteText: { fontSize: 12, color: colors.primary, lineHeight: 17 },

  footer: {
    backgroundColor: colors.background,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
});

export default ShareReceiptCard;
