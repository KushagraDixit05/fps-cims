// src/components/share/useReceiptShare.tsx
// Reusable "capture the branded receipt card, then share image + text" workflow.
//
// List and detail screens don't keep an off-screen ViewShot around like the
// Review screens do, so calling shareReviewDetails() without a ref there only
// shares text. This hook closes that gap: call shareEntry(payload) and it mounts
// the ShareReceiptCard off-screen, captures it once it has laid out, and shares
// image + text through the same shareReviewDetails() primitive (which falls back
// to text-only if capture fails). One hidden card per screen, mounted only during
// a share and reused across all rows.

import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, type LayoutChangeEvent } from 'react-native';
import ViewShot from 'react-native-view-shot';
import ShareReceiptCard from './ShareReceiptCard';
import { shareReviewDetails, type SharePayload } from '../../utils/shareReviewDetails';

export const useReceiptShare = () => {
  const shotRef = useRef<React.ElementRef<typeof ViewShot>>(null);
  const [payload, setPayload] = useState<SharePayload | null>(null);
  // Guards the onLayout capture so it fires once per mounted payload.
  const capturedRef = useRef(false);

  const shareEntry = useCallback((next: SharePayload) => {
    capturedRef.current = false;
    setPayload(next);
  }, []);

  const onLayout = useCallback(
    async (_e: LayoutChangeEvent) => {
      if (!payload || capturedRef.current) return;
      capturedRef.current = true;
      try {
        await shareReviewDetails(payload, shotRef);
      } finally {
        setPayload(null);
      }
    },
    [payload],
  );

  const receiptHost = payload ? (
    <View style={styles.offscreen} pointerEvents="none" onLayout={onLayout}>
      <ViewShot ref={shotRef}>
        <ShareReceiptCard data={payload} />
      </ViewShot>
    </View>
  ) : null;

  return { shareEntry, receiptHost };
};

const styles = StyleSheet.create({
  offscreen: { position: 'absolute', left: -9999, top: 0 },
});

export default useReceiptShare;
