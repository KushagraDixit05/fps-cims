// src/api/productDemo.ts
// API calls for the Product Demo module.

import apiClient from './client';

export const submitProductDemo = async (fd: FormData): Promise<{ id: string }> => {
  const { data } = await apiClient.post('/product-demos/', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};
