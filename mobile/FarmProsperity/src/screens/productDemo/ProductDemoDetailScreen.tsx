// src/screens/productDemo/ProductDemoDetailScreen.tsx
// View submitted product demo details and upload after-demo photos.
//
// Read-only view of all submitted data.
// After-photo section is editable only if after_photo_count === 0.

import React, { useEffect, useState, useCallback } from 'react';
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../navigation/types';
import { colors } from '../../utils/colors';
import ScreenHeader from '../../components/ScreenHeader';
import Button from '../../components/Button';
import PhotoPicker from '../../components/PhotoPicker';
import { getProductDemoDetail, uploadAfterDemoPhotos } from '../../api/productDemo';
import type { PhotoDraft } from '../../types/productDemo';

type Nav = RouteProp<RootStackParamList, 'ProductDemoDetail'>;

interface DemoDetail {
  id: string;
  farmer_name: string;
  mobile_number: string;
  village_name: string;
  block_name: string;
  district_name: string;
  total_land_acre: string;
  crop_name: string;
  variety: string;
  crop_stage: string;
  crop_stage_days: string;
  demo_date: string;
  product_name: string;
  dose: string;
  dose_unit: string;
  demo_result: string;
  additional_observations: string;
  remark: string;
  latitude: number | null;
  longitude: number | null;
  submitted_at: string;
  photos: Array<{ id: string; image: string; photo_type: 'before' | 'after'; uploaded_at: string }>;
}

const RESULT_LABEL: Record<string, string> = {
  excellent: 'Excellent',
  good: 'Good',
  average: 'Average',
  poor: 'Poor',
  no_effect: 'No Effect',
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
  const { demoId } = route.params;

  const [demo, setDemo] = useState<DemoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<PhotoDraft[]>([]);
  const [uploading, setUploading] = useState(false);

  const fetchDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductDemoDetail(demoId);
      setDemo(data);
    } catch {
      setError('Could not load demo details. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [demoId]);

  useEffect(() => {
    fetchDemo();
  }, [fetchDemo]);

  const beforePhotos = demo?.photos.filter((p) => p.photo_type === 'before') ?? [];
  const existingAfterPhotos = demo?.photos.filter((p) => p.photo_type === 'after') ?? [];
  const afterPhotosUploaded = existingAfterPhotos.length > 0;

  const handleUpload = async () => {
    if (afterPhotos.length < 2) {
      Alert.alert('Photos Required', 'Please add at least 2 after-demo photos before uploading.');
      return;
    }
    setUploading(true);
    try {
      await uploadAfterDemoPhotos(demoId, afterPhotos);
      setAfterPhotos([]);
      await fetchDemo();
      Alert.alert('Success', 'After-demo photos uploaded successfully.');
    } catch (e: any) {
      const msg = e?.response?.status === 0 || !e?.response
        ? 'Internet connection required to upload after-demo photos. Please try again when online.'
        : 'Upload failed. Please try again.';
      Alert.alert('Upload Failed', msg);
    } finally {
      setUploading(false);
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
          <TouchableOpacity onPress={fetchDemo} style={styles.retryBtn} activeOpacity={0.75}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScreenHeader
        title="Product Performance — Details"
        subtitle={demo.farmer_name}
        onBack={() => navigation.goBack()}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Read-only banner ── */}
        <View style={styles.readOnlyBanner}>
          <Text style={styles.readOnlyText}>All submitted fields are read-only.</Text>
        </View>

        {/* ── Farmer & Location ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Farmer & Location</Text>
          <View style={styles.card}>
            <Row label="Farmer Name"   value={demo.farmer_name} />
            <Row label="Mobile"        value={demo.mobile_number} />
            <Row label="Village"       value={demo.village_name} />
            <Row label="Block"         value={demo.block_name} />
            <Row label="District"      value={demo.district_name} />
            <Row label="Land (Acre)"   value={demo.total_land_acre} />
          </View>
        </View>

        {/* ── Crop & Stage ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Crop & Stage</Text>
          <View style={styles.card}>
            <Row label="Crop"          value={demo.crop_name} />
            <Row label="Variety"       value={demo.variety} />
            <Row label="Stage"         value={demo.crop_stage} />
            <Row label="Stage (Days)"  value={demo.crop_stage_days} />
            <Row label="Demo Date"     value={demo.demo_date} />
          </View>
        </View>

        {/* ── Product & Dose ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product & Dose</Text>
          <View style={styles.card}>
            <Row label="Product"       value={demo.product_name} />
            <Row label="Dose"          value={`${demo.dose} ${demo.dose_unit}`} />
          </View>
        </View>

        {/* ── Result & Remark ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Result & Remarks</Text>
          <View style={styles.card}>
            <Row label="Demo Result"   value={RESULT_LABEL[demo.demo_result] ?? demo.demo_result} />
            <Row label="Observations"  value={demo.additional_observations} />
            <Row label="Remark"        value={demo.remark} />
          </View>
        </View>

        {/* ── Before Photos ── */}
        {beforePhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Before Demo Photos ({beforePhotos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
              {beforePhotos.map((p) => (
                <Image key={p.id} source={{ uri: p.image }} style={styles.photoThumb} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── After Demo Photos ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>After Demo Photos</Text>

          {afterPhotosUploaded ? (
            <>
              <Text style={styles.afterUploaded}>
                {existingAfterPhotos.length} photo{existingAfterPhotos.length !== 1 ? 's' : ''} uploaded.
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
                {existingAfterPhotos.map((p) => (
                  <Image key={p.id} source={{ uri: p.image }} style={styles.photoThumb} />
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <Text style={styles.afterHint}>
                After-demo photos not yet uploaded. Add at least 2 photos below.
              </Text>
              <PhotoPicker
                photos={afterPhotos}
                onAdd={(photo) => setAfterPhotos((prev) => [...prev, photo])}
                onRemove={(uri) => setAfterPhotos((prev) => prev.filter((p) => p.uri !== uri))}
                minPhotos={2}
              />
              <View style={{ height: 12 }} />
              {uploading ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Button
                  title="Upload After Demo Photos"
                  onPress={handleUpload}
                  disabled={afterPhotos.length < 2}
                />
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
    opacity: 0.85,
  },
  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: colors.borderLight },
  rowLabel:  { fontSize: 13, color: colors.textMuted, flex: 1 },
  rowValue:  { fontSize: 13, color: colors.textPrimary, fontWeight: '500', flex: 2, textAlign: 'right' },

  photoScroll:    { marginTop: 8 },
  photoThumb:     { width: 96, height: 96, borderRadius: 8, marginRight: 8, backgroundColor: colors.borderLight },

  afterHint:     { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  afterUploaded: { fontSize: 13, color: '#1A8A3A', fontWeight: '600', marginBottom: 8 },

  errorText: { fontSize: 14, color: colors.error, textAlign: 'center', marginBottom: 16 },
  retryBtn:  { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 },
  retryBtnText: { color: 'white', fontWeight: '600' },
});

export default ProductDemoDetailScreen;
