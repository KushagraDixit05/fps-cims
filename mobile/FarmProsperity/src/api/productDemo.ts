// src/api/productDemo.ts
// API calls for the Product Demo module.

import apiClient from './client';

export const submitProductDemo = async (fd: FormData): Promise<{ id: string }> => {
  const { data } = await apiClient.post('/product-demos/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const getProductDemoDetail = async (demoId: string) => {
  const { data } = await apiClient.get(`/product-demos/${demoId}/`);
  return data;
};

export const uploadAfterDemoPhotos = async (
  demoId: string,
  photos: Array<{ uri: string; name: string; type: string }>,
): Promise<{ after_photo_count: number }> => {
  const fd = new FormData();
  photos.forEach((p) => fd.append('photos_after', p as any));
  const { data } = await apiClient.post(`/product-demos/${demoId}/after-photos/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

// Deferred 'After' update: result + after-photos + observations/remark.
export const completeProductDemoAfter = async (
  demoId: string,
  payload: {
    demo_result: string;
    additional_observations?: string;
    remark?: string;
    after_photos: Array<{ uri: string; name: string; type: string }>;
  },
): Promise<{ demo_phase: string; after_photo_count: number }> => {
  const fd = new FormData();
  fd.append('demo_result', payload.demo_result);
  fd.append('additional_observations', payload.additional_observations ?? '');
  fd.append('remark', payload.remark ?? '');
  payload.after_photos.forEach((p) => fd.append('photos_after', p as any));
  const { data } = await apiClient.post(`/product-demos/${demoId}/complete-after/`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
