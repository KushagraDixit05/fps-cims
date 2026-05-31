// src/components/PhotoPicker.tsx
// Multi-photo picker with horizontal thumbnail strip and ✕ remove button per photo.
// Supports camera and gallery via react-native-image-picker.
// Requests Android permissions before accessing camera/gallery.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  launchCamera,
  launchImageLibrary,
  type ImagePickerResponse,
  type Asset,
} from 'react-native-image-picker';
import { colors } from '../utils/colors';
import type { PhotoDraft } from '../types/cropMonitoring';

interface PhotoPickerProps {
  photos: PhotoDraft[];
  onAdd: (photo: PhotoDraft) => void;
  onRemove: (uri: string) => void;
  /** Default: 2 (plan requirement) */
  minPhotos?: number;
  error?: string;
}

// ── Permission helpers ────────────────────────────────────────────────────────

const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
      {
        title: 'Camera Permission',
        message: 'FPS needs access to your camera to take field photos.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      },
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

const requestGalleryPermission = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  try {
    // Android 13+ uses READ_MEDIA_IMAGES; older uses READ_EXTERNAL_STORAGE
    const permission =
      Number(Platform.Version) >= 33
        ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
        : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;
    const granted = await PermissionsAndroid.request(permission, {
      title: 'Gallery Permission',
      message: 'FPS needs access to your gallery to attach field photos.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

// ── Asset → PhotoDraft ────────────────────────────────────────────────────────

const assetToPhoto = (asset: Asset): PhotoDraft | null => {
  if (!asset.uri) return null;
  return {
    uri: asset.uri,
    name: asset.fileName ?? `photo_${Date.now()}.jpg`,
    type: asset.type ?? 'image/jpeg',
  };
};

const handlePickerResponse = (
  response: ImagePickerResponse,
  onAdd: (p: PhotoDraft) => void,
) => {
  if (response.didCancel || response.errorCode) return;
  response.assets?.forEach((asset) => {
    const photo = assetToPhoto(asset);
    if (photo) onAdd(photo);
  });
};

// ── Component ─────────────────────────────────────────────────────────────────

const PhotoPicker = ({
  photos,
  onAdd,
  onRemove,
  minPhotos = 2,
  error,
}: PhotoPickerProps) => {
  const [loading, setLoading] = React.useState(false);

  const openCamera = async () => {
    const allowed = await requestCameraPermission();
    if (!allowed) {
      Alert.alert(
        'Camera Denied',
        'Camera permission was denied. Please enable it in Settings.',
      );
      return;
    }
    setLoading(true);
    launchCamera(
      { mediaType: 'photo', quality: 1, saveToPhotos: false },
      (response) => {
        setLoading(false);
        handlePickerResponse(response, onAdd);
      },
    );
  };

  const openGallery = async () => {
    const allowed = await requestGalleryPermission();
    if (!allowed) {
      Alert.alert(
        'Gallery Denied',
        'Gallery permission was denied. Please enable it in Settings.',
      );
      return;
    }
    setLoading(true);
    launchImageLibrary(
      { mediaType: 'photo', quality: 1, selectionLimit: 5 },
      (response) => {
        setLoading(false);
        handlePickerResponse(response, onAdd);
      },
    );
  };

  const handleAdd = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: '📷  Take Photo', onPress: openCamera },
      { text: '🖼  Choose from Gallery', onPress: openGallery },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>
          Photos <Text style={styles.required}>*</Text>
        </Text>
        <Text style={styles.counter}>
          {photos.length} / min {minPhotos}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.strip}
      >
        {/* Existing photo thumbnails */}
        {photos.map((photo) => (
          <View key={photo.uri} style={styles.thumb}>
            <Image source={{ uri: photo.uri }} style={styles.thumbImage} />
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => onRemove(photo.uri)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
            >
              <Text style={styles.removeIcon}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Add button */}
        <TouchableOpacity
          style={styles.addBtn}
          onPress={handleAdd}
          disabled={loading}
          activeOpacity={0.75}
        >
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Text style={styles.addIcon}>+</Text>
              <Text style={styles.addText}>Add Photo</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Inline minimum-count hint */}
      {photos.length < minPhotos && !error && (
        <Text style={styles.hintText}>
          Minimum {minPhotos} photos required.
        </Text>
      )}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const THUMB_SIZE = 86;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  required: {
    color: colors.error,
  },
  counter: {
    fontSize: 12,
    color: colors.textMuted,
  },
  strip: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    overflow: 'visible',
    position: 'relative',
  },
  thumbImage: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    backgroundColor: colors.borderLight,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  removeIcon: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
  addBtn: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    gap: 2,
  },
  addIcon: {
    fontSize: 22,
    color: colors.primary,
    lineHeight: 26,
  },
  addText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  hintText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.error,
  },
});

export default PhotoPicker;
