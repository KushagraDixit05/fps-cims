/**
 * CropDetailScreen — Full detail view for a single crop entry.
 *
 * Receives `entry` via route params (no extra API call needed).
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { colors } from '../utils/colors';
import { formatDate, formatArea, cropStageLabel } from '../utils/helpers';
import ConditionBadge from '../components/ConditionBadge';
import Card from '../components/Card';
import AppIcon from '../components/AppIcon';
import { CheckCircle, XCircle, Bug, CloudRain, TrendingDown, Check, Leaf, IconStroke } from '../utils/icons';
import type { RootStackParamList } from '../navigation/types';

type CropDetailRoute = RouteProp<RootStackParamList, 'CropDetail'>;

const CropDetailScreen = () => {
  const { params } = useRoute<CropDetailRoute>();
  const { entry } = params;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Identity ── */}
      <Card>
        <View style={styles.topRow}>
          <View style={styles.topInfo}>
            <Text style={styles.farmerName}>
              {entry.farmer_name ?? `Farmer #${entry.farmer}`}
            </Text>
            <Text style={styles.meta}>
              {entry.village_name}
              {entry.district ? ` · ${entry.district}` : ''}
            </Text>
            <Text style={styles.meta}>Visit: {formatDate(entry.visit_date)}</Text>
          </View>
          <ConditionBadge condition={entry.crop_condition} />
        </View>
      </Card>

      {/* ── Crop Info ── */}
      <SectionCard title="Crop Information">
        <DetailRow label="Crop" value={entry.crop_name} />
        <DetailRow label="Stage" value={cropStageLabel(entry.crop_stage)} />
        <DetailRow label="Area (this year)" value={formatArea(entry.area_this_year)} />
        {entry.area_last_year != null && (
          <DetailRow label="Area (last year)" value={formatArea(entry.area_last_year)} />
        )}
        {entry.sowing_date && (
          <DetailRow label="Sowing Date" value={formatDate(entry.sowing_date)} />
        )}
        {entry.expected_yield != null && (
          <DetailRow label="Expected Yield" value={`${entry.expected_yield} Qt/Ac`} />
        )}
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Buyer Interest</Text>
          <View style={styles.detailIconValue}>
            <AppIcon
              icon={entry.buyer_interest ? CheckCircle : XCircle}
              size={14}
              color={entry.buyer_interest ? colors.good : colors.poor}
              strokeWidth={2}
            />
            <Text style={[styles.detailValue, { color: entry.buyer_interest ? colors.good : colors.poor }]}>
              {entry.buyer_interest ? ' Yes' : ' No'}
            </Text>
          </View>
        </View>
      </SectionCard>

      {/* ── Field Issues ── */}
      <SectionCard title="Field Issues">
        <IssueRow label="Pest" icon={Bug} active={entry.problem_pest} />
        <IssueRow label="Disease" icon={Leaf} active={entry.problem_disease} />
        <IssueRow label="Weather Damage" icon={CloudRain} active={entry.problem_weather} />
        <IssueRow label="Price Concern" icon={TrendingDown} active={entry.problem_price_concern} />
        {entry.problem_other ? (
          <View style={styles.otherIssue}>
            <Text style={styles.otherIssueLabel}>Other:</Text>
            <Text style={styles.otherIssueText}>{entry.problem_other}</Text>
          </View>
        ) : null}
        {!entry.problem_pest &&
          !entry.problem_disease &&
          !entry.problem_weather &&
          !entry.problem_price_concern &&
          !entry.problem_other && (
            <View style={styles.noIssuesRow}>
              <AppIcon icon={Check} size={14} color={colors.good} strokeWidth={2.5} />
              <Text style={styles.noIssues}> No issues reported</Text>
            </View>
          )}
      </SectionCard>

      {/* ── Location ── */}
      {(entry.latitude != null || entry.longitude != null) && (
        <SectionCard title="GPS Location">
          <DetailRow
            label="Coordinates"
            value={`${entry.latitude?.toFixed(5)}, ${entry.longitude?.toFixed(5)}`}
          />
        </SectionCard>
      )}

      {/* ── Metadata ── */}
      <SectionCard title="Metadata">
        <DetailRow label="Entry ID" value={entry.id.slice(0, 8) + '…'} />
        {entry.created_at && (
          <DetailRow label="Submitted" value={formatDate(entry.created_at)} />
        )}
        {entry.local_id ? (
          <DetailRow label="Local ID" value={entry.local_id} />
        ) : null}
      </SectionCard>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <Card style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </Card>
);

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const IssueRow = ({
  label,
  icon,
  active,
}: {
  label: string;
  icon: React.ComponentType<any>;
  active: boolean;
}) => (
  <View style={styles.issueRow}>
    <View style={styles.issueLabelRow}>
      <AppIcon icon={icon} size={14} color={active ? colors.poor : colors.textMuted} strokeWidth={IconStroke} />
      <Text style={styles.issueLabel}> {label}</Text>
    </View>
    <Text style={active ? styles.issueBadgeActive : styles.issueBadgeInactive}>
      {active ? 'Yes' : 'No'}
    </Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: 14 },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  topInfo: { flex: 1, marginRight: 8 },
  farmerName: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  meta: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },

  sectionCard: { marginBottom: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  detailLabel: { fontSize: 13, color: colors.textSecondary },
  detailValue: { fontSize: 13, color: colors.textPrimary, fontWeight: '500', textAlign: 'right', flex: 1, marginLeft: 10 },

  detailIconValue: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end' },
  issueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.borderLight,
  },
  issueLabelRow: { flexDirection: 'row', alignItems: 'center' },
  issueLabel: { fontSize: 13, color: colors.textPrimary },
  noIssuesRow: { flexDirection: 'row', alignItems: 'center' },
  issueBadgeActive: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.poor,
    backgroundColor: colors.poorBg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  issueBadgeInactive: {
    fontSize: 12,
    color: colors.textMuted,
  },
  otherIssue: { marginTop: 8 },
  otherIssueLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 2 },
  otherIssueText: { fontSize: 13, color: colors.textPrimary },
  noIssues: { fontSize: 13, color: colors.good, fontStyle: 'italic' },
});

export default CropDetailScreen;
