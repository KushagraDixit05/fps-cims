// src/screens/cropMonitoring/CropMonitoringDetailScreen.tsx
// Full read-only visit detail — tapped from Recent Entries on the dashboard.

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Image, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { colors } from '../../utils/colors';
import Card from '../../components/Card';
import { getFarmerVisitDetail } from '../../api/cropMonitoring';
import type { FarmerVisitDetail } from '../../types/cropMonitoring';
import type { RootStackParamList } from '../../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'CropMonitoringDetail'>;

const condColor = (c: string) =>
  c === 'good' ? colors.good : c === 'poor' ? colors.poor : colors.average;
const condBg = (c: string) =>
  c === 'good' ? colors.goodBg : c === 'poor' ? colors.poorBg : colors.averageBg;

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '—'}</Text>
  </View>
);

const CropMonitoringDetailScreen = () => {
  const route = useRoute<RouteP>();
  const { visitId } = route.params;

  const [visit, setVisit] = useState<FarmerVisitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFarmerVisitDetail(visitId)
      .then(setVisit)
      .catch(() => setError('Failed to load visit details. Please try again.'))
      .finally(() => setLoading(false));
  }, [visitId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading visit…</Text>
      </View>
    );
  }

  if (error || !visit) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error ?? 'Visit not found.'}</Text>
      </View>
    );
  }

  const visitDate = new Date(visit.submitted_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {/* Header card */}
      <Card style={styles.headerCard}>
        <Text style={styles.farmerName}>{visit.farmer_name}</Text>
        <Text style={styles.locationText}>
          {visit.village_name} · {visit.block_name} · {visit.district_name}
        </Text>
        <Text style={styles.dateText}>{visitDate}</Text>
        {visit.location_display ? (
          <Text style={styles.gpsText}>📍 {visit.location_display}</Text>
        ) : null}
      </Card>

      {/* Farmer info */}
      <Card>
        <Text style={styles.sectionTitle}>Farmer Details</Text>
        <Row label="Mobile" value={visit.mobile_number} />
        <Row label="Total Land" value={`${visit.total_land_acre} Acre`} />
        <Row label="Remark" value={visit.remark || 'None'} />
      </Card>

      {/* Crops */}
      <Card>
        <Text style={styles.sectionTitle}>Crops ({visit.crops.length})</Text>
        {visit.crops.map((crop) => (
          <View key={crop.id} style={styles.cropRow}>
            <View style={styles.cropMain}>
              <Text style={styles.cropName}>{crop.crop_name} — {crop.variety}</Text>
              <Text style={styles.cropSub}>
                {crop.this_year_area_acre} ac · {crop.crop_stage.replace('_', ' ')}
              </Text>
              <Text style={styles.cropSub}>
                Sown: {crop.date_of_sowing}
              </Text>
              {crop.problems.length > 0 && (
                <Text style={styles.cropSub}>
                  Problems: {crop.problems.join(', ')}
                </Text>
              )}
            </View>
            <View style={[styles.condBadge, { backgroundColor: condBg(crop.crop_condition) }]}>
              <Text style={[styles.condText, { color: condColor(crop.crop_condition) }]}>
                {crop.crop_condition}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Photos */}
      {visit.photos.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>Photos ({visit.photos.length})</Text>
          <View style={styles.photoGrid}>
            {visit.photos.map((p) => (
              <Image key={p.id} source={{ uri: p.image }} style={styles.photo} />
            ))}
          </View>
        </Card>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll:       { flex: 1, backgroundColor: colors.background },
  content:      { padding: 14, paddingBottom: 40 },
  center:       { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: colors.background },
  loadingText:  { fontSize: 14, color: colors.textSecondary },
  errorText:    { fontSize: 14, color: colors.error, textAlign: 'center', padding: 24 },

  headerCard:   { marginBottom: 12 },
  farmerName:   { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: 4 },
  locationText: { fontSize: 13, color: colors.textSecondary, marginBottom: 2 },
  dateText:     { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  gpsText:      { fontSize: 12, color: colors.info, marginTop: 4 },

  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 },
  row:          { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:     { fontSize: 13, color: colors.textSecondary },
  rowValue:     { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  cropRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  cropMain:     { flex: 1, marginRight: 8 },
  cropName:     { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  cropSub:      { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  condBadge:    { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  condText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  photoGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo:        { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.borderLight },
});

export default CropMonitoringDetailScreen;
