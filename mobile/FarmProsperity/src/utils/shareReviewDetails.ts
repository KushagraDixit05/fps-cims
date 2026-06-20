// src/utils/shareReviewDetails.ts
// Shared utility for generating and sharing a text summary of review data.
// Uses React Native's built-in Share API — zero new dependencies.

import { Share } from 'react-native';

export type SharePayload = {
  /** Module display name, e.g. "Crop Intelligence" */
  module: string;
  /** Farmer name (Crop Intelligence, Product Performance) */
  farmerName?: string;
  /** Mandi/Market name (Market Intelligence) */
  mandiName?: string;
  /** ISO date or formatted date string */
  date: string;
  /** Location string, e.g. "Village · Block" or "Mandi Name" */
  location: string;
  /** Crop or commodity details */
  cropDetails: string;
  /** Observations or remark */
  observations?: string;
  /** Additional summary text */
  summary?: string;
};

/**
 * Build a formatted text summary and open the OS share sheet.
 */
export const shareReviewDetails = async (payload: SharePayload) => {
  const lines = [
    `📋 ${payload.module} Report`,
    `━━━━━━━━━━━━━━━━━━━`,
    payload.farmerName ? `👨‍🌾 Farmer: ${payload.farmerName}` : '',
    payload.mandiName ? `🏪 Market: ${payload.mandiName}` : '',
    `📅 Date: ${payload.date}`,
    `📍 Location: ${payload.location}`,
    `🌾 Crop: ${payload.cropDetails}`,
    payload.observations ? `📝 Observations: ${payload.observations}` : '',
    payload.summary ? `\n${payload.summary}` : '',
    `\n— Shared via Farm Prosperity Solutions`,
  ].filter(Boolean).join('\n');

  await Share.share({
    message: lines,
    title: `${payload.module} Report`,
  });
};
