// src/screens/productDemo/ProductDemoDetailScreen.tsx
// View a submitted product demo and complete the deferred 'After' update.
//
// Local-first: reads the WatermelonDB record (by server id) so setup data and
// before-photos render offline. The After update (result + after-photos +
// observations + remark) is saved locally and synced via complete-after.

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import { Q } from '@nozbe/watermelondb';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../utils/colors';
import ScreenHeader from '../../components/ScreenHeader';
import ShareIconButton from '../../components/share/ShareIconButton';
import { useReceiptShare } from '../../components/share/useReceiptShare';
import { buildDemoSharePayload } from '../../utils/shareEntry';
import Button from '../../components/Button';
import PhotoPicker from '../../components/PhotoPicker';
import DemoResultSelector from '../../components/DemoResultSelector';
import FormInput from '../../components/FormInput';
import database from '../../database';
import { ProductDemoModel } from '../../database/models/ProductDemoModel';
import { saveProductDemoAfterUpdateLocally } from '../../database/operations';
import { syncPendingRecords } from '../../sync/syncService';
import { validateAfterUpdate, hasErrors } from '../../utils/productDemoValidation';
import type { PhotoDraft, DemoResult } from '../../types/productDemo';

type Nav = RouteProp<RootStackParamList, 'ProductDemoDetail'>;

const RESULT_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor',
  no_effect: 'No Effect',
};

interface PhotoEntry { uri: string; name?: string; type?: string }

const parsePhotos = (json: string | null): PhotoEntry[] => {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const Row = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  ) : null;

const ProductDemoDetailScreen = () => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<Nav>();
  const { demoId } = route.params; // server id
  const { shareEntry, receiptHost } = useReceiptShare();

  const [demo, setDemo] = useState<ProductDemoModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // After-update form state
  const [afterPhotos, setAfterPhotos] = useState<PhotoDraft[]>([]);
  const [demoResult, setDemoResult] = useState<DemoResult | ''>('');
  const [observations, setObservations] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<{ demo_result?: string; after_photos?: string; remark?: string }>({});

  const loadDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const records = await database.collections
        .get<ProductDemoModel>('product_demos')
        .query(Q.where('server_id', demoId))
        .fetch();
      if (records.length === 0) {
        setError('Could not find this demo on the device.');
      } else {
        setDemo(records[0]);
      }
    } catch {
      setError('Could not load demo details.');
    } finally {
      setLoading(false);
    }
  }, [demoId]);

  useFocusEffect(
    useCallback(() => {
      loadDemo();
    }, [loadDemo]),
  );

  const handleSave = async () => {
    const errs = validateAfterUpdate({ demo_result: demoResult, after_photos: afterPhotos, remark });
    setFormErrors(errs);
    if (hasErrors(errs) || !demo) return;

    setSaving(true);
    try {
      await saveProductDemoAfterUpdateLocally(demo.id, {
        demo_result: demoResult,
        after_photos: afterPhotos,
        additional_observations: observations,
        remark,
      });
      setAfterPhotos([]);
      await loadDemo();
      // Best-effort push; safe to ignore offline result.
      syncPendingRecords().catch(() => {});
      Alert.alert(
        'After Update Saved',
        'The after-demo result has been saved and will sync when you are online.',
      );
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'Could not save the after-demo update.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Demo Details" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (error || !demo) {
    return (
      <View style={styles.root}>
        <ScreenHeader title="Demo Details" onBack={() => navigation.goBack()} />
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? 'No data found.'}</Text>
          <TouchableOpacity onPress={loadDemo} style={styles.retryBtn} activeOpacity={0.75}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const beforePhotos = parsePhotos(demo.beforePhotosJson);
  const existingAfterPhotos = parsePhotos(demo.afterPhotosJson);
  let varietyList: string[] = [];
  try {
    varietyList = demo.varietiesJson ? JSON.parse(demo.varietiesJson) : [];
  } catch { varietyList = []; }
  if (varietyList.length === 0 && demo.variety) varietyList = [demo.variety];
  const varietyDisplay = varietyList.join(', ');
  const phase = demo.demoPhase || (demo.demoResult ? 'completed' : 'before');
  const isCompleted = phase === 'completed' || !!demo.demoResult;
  const afterPending = demo.afterPendingSync;

  const sharePayload = buildDemoSharePayload({
    farmerName: demo.farmerName,
    village: demo.villageName,
    block: demo.blockName,
    district: demo.districtName,
    mobile: demo.mobileNumber,
    totalLandAcre: demo.totalLandAcre,
    crop: demo.cropName,
    variety: varietyDisplay,
    varietyLabel: varietyList.length > 1 ? 'Varieties' : 'Variety',
    cropStage: demo.cropStage,
    stageDays: demo.cropStageDays,
    product: demo.productName,
    dose: demo.dose,
    doseUnit: demo.doseUnit,
    demoDate: demo.demoDate,
    remark: demo.remark,
  });

  return (
    <View style={styles.root}>
      {receiptHost}
      <ScreenHeader
        title="Product Performance Module — Details"
        subtitle={demo.farmerName}
        onBack={() => navigation.goBack()}
        rightElement={<ShareIconButton onPress={() => shareEntry(sharePayload)} color="white" />}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Read-only banner ── */}
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>
            Setup details and before-photos are locked and cannot be edited.
          </Text>
        </View>

        {/* ── Farmer & Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer & Location</Text>
          <View style={styles.card}>
            <Row label="Farmer Name"   value={demo.farmerName} />
            <Row label="Mobile"        value={demo.mobileNumber} />
            <Row label="Village"       value={demo.villageName} />
            <Row label="Block"         value={demo.blockName} />
            <Row label="District"      value={demo.districtName} />
            <Row label="Land (Acre)"   value={demo.totalLandAcre} />
          </View>
        </View>

        {/* ── Crop & Stage ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crop & Stage</Text>
          <View style={styles.card}>
            <Row label="Crop"          value={demo.cropName} />
            <Row label={varietyList.length > 1 ? 'Varieties' : 'Variety'} value={varietyDisplay} />
            <Row label="Stage"         value={demo.cropStage} />
            <Row label="Stage (Days)"  value={demo.cropStageDays} />
            <Row label="Demo Date"     value={demo.demoDate} />
          </View>
        </View>

        {/* ── Product & Dose ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product & Dose</Text>
          <View style={styles.card}>
            <Row label="Product"       value={demo.productName} />
            <Row label="Dose"          value={`${demo.dose} ${demo.doseUnit}`} />
          </View>
        </View>

        {/* ── Before Photos ── */}
        {beforePhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before Demo Photos ({beforePhotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {beforePhotos.map((p, i) => (
                <Image key={`${p.uri}-${i}`} source={{ uri: p.uri }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── After Demo / Result ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>After Demo & Result</Text>

          {isCompleted ? (
            <View style={styles.card}>
              <Row label="Demo Result"   value={RESULT_LABEL[demo.demoResult ?? ''] ?? demo.demoResult} />
              <Row label="Observations"  value={demo.additionalObservations} />
              <Row label="Remark"        value={demo.remark} />
              {existingAfterPhotos.length > 0 && (
                <>
                  <Text style={styles.afterPhotoLabel}>After Demo Photos ({existingAfterPhotos.length})</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                    {existingAfterPhotos.map((p, i) => (
                      <Image key={`${p.uri}-${i}`} source={{ uri: p.uri }} style={styles.photoThumb} />
                    ))}
                  </ScrollView>
                </>
              )}
              {afterPending && (
                <Text style={styles.pendingNote}>After update saved — pending sync.</Text>
              )}
              {demo.afterSyncError && (
                <Text style={styles.syncErrorNote}>Last sync error: {demo.afterSyncError}</Text>
              )}
            </View>
          ) : (
            <>
              <Text style={styles.afterHint}>
                Record the demo result and after-demo photos now.
              </Text>

              <DemoResultSelector
                value={demoResult}
                onChange={(v: DemoResult) => setDemoResult(v)}
                error={formErrors.demo_result}
              />

              <Text style={styles.photoGroupLabel}>
                After Demo Photos <Text style={styles.required}>*</Text>
              </Text>
              <Text style={styles.photoHint}>Minimum 2 photos required</Text>
              <PhotoPicker
                photos={afterPhotos}
                onAdd={(photo) => setAfterPhotos((prev) => [...prev, photo])}
                onRemove={(uri) => setAfterPhotos((prev) => prev.filter((p) => p.uri !== uri))}
                minPhotos={2}
                error={formErrors.after_photos}
              />

              <View style={{ height: 12 }} />
              <FormInput
                label="Additional Observations"
                value={observations}
                onChangeText={setObservations}
                placeholder="Enter any additional observations (optional)"
                multiline
                scrollEnabled
                style={{ height: 90, textAlignVertical: 'top' }}
              />
              <FormInput
                label="Remark / Notes"
                value={remark}
                onChangeText={setRemark}
                placeholder="Enter remark or notes (optional)"
                multiline
                scrollEnabled
                style={{ height: 90, textAlignVertical: 'top' }}
                error={formErrors.remark}
              />

              <View style={{ height: 12 }} />
              {saving ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Button title="Save After Update" onPress={handleSave} />
              )}
            </>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  readOnlyBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  readOnlyText: { fontSize: 12, color: '#856404', textAlign: 'center' },

  section:      { marginBottom: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:  { fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue:  { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  photoScroll:    { marginTop: 8 },
  photoThumb:     { width: 96, height: 96, borderRadius: 8, marginRight: 8, backgroundColor: colors.borderLight },

  afterHint:      { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  afterPhotoLabel:{ fontSize: 12, fontWeight: '600', color: colors.textMuted, marginTop: 10, marginBottom: 4 },
  photoGroupLabel:{ fontSize: 13, color: colors.textSecondary, fontWeight: '600', marginTop: 8, marginBottom: 2 },
  photoHint:      { fontSize: 11, color: colors.textMuted, marginBottom: 8 },
  required:       { color: colors.error },
  pendingNote:    { fontSize: 12, color: '#C8900A', fontWeight: '600', marginTop: 8 },
  syncErrorNote:  { fontSize: 12, color: colors.error, marginTop: 6 },

  errorText: { fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryBtnText: { color: 'white', fontWeight: '600' },
});

export default ProductDemoDetailScreen;
