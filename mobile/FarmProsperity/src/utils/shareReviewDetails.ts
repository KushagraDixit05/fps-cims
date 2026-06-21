// src/utils/shareReviewDetails.ts
// Shared utility for sharing a review summary as BOTH a rich text body and a
// branded receipt image (GPay/Paytm style).
//
// The same structured `SharePayload` feeds two consumers:
//   1. buildShareText()  → the formatted text body
//   2. ShareReceiptCard  → the off-screen view that gets captured as an image
//
// Flow: capture the off-screen card (react-native-view-shot) → open the OS
// share sheet with image + text (react-native-share). If capture or image
// sharing fails for any reason, fall back to text-only via RN's built-in Share.

import { Share } from 'react-native';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import RNShare from 'react-native-share';

export type ShareField = {
  label: string;
  value: string;
  /** Optional named section heading. Consecutive fields with the same section
   *  are grouped under it. Fields without a section render in the top header
   *  block alongside the title + date. */
  section?: string;
};

export type ShareTable = {
  title: string;
  columns: string[];
  rows: string[][];
  /** Singular noun for each row block, e.g. "Crop", "Variety".
   *  Defaults to the title with any trailing " Details"/count stripped. */
  itemLabel?: string;
};

export type SharePayload = {
  /** Module display name, e.g. "Crop Intelligence Module" */
  module: string;
  /** Headline line, e.g. "Ramesh Kumar" (farmer) or a mandi name */
  title: string;
  /** Label for the headline row, e.g. "Farmer Name", "Mandi Name". Default "Name". */
  titleLabel?: string;
  /** Date string (ISO YYYY-MM-DD preferred; rendered human-friendly) */
  date: string;
  /** Key/value summary rows */
  fields: ShareField[];
  /** Optional tabular sections (crops, varieties) */
  tables?: ShareTable[];
  /** Optional closing note (e.g. remark / observations) */
  footerNote?: string;
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Render an ISO `YYYY-MM-DD` date as `05 Jun 2026`. Non-ISO input passes through. */
export const formatShareDate = (value: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!m) return value ?? '';
  const [, y, mo, d] = m;
  const month = MONTHS[Number(mo) - 1];
  if (!month) return value;
  return `${d} ${month} ${y}`;
};

/** Capitalize the first letter (e.g. crop condition `good` → `Good`). */
export const capitalize = (value: string): string =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

const isEmpty = (v: string) => !v || v === '—';

/** Pad `label` so a following ` : value` aligns to `width`. */
const padLabel = (label: string, width: number) => label.padEnd(width);

/**
 * Build a clean, professional, emoji-free report from the payload.
 */
export const buildShareText = (payload: SharePayload): string => {
  const out: string[] = [];

  // ── Branded header ──
  out.push('FARM PROSPERITY SOLUTIONS');
  out.push(`${payload.module.replace(/ Module$/, '')} Entry`);
  out.push('');

  // ── Header block: title + date (+ any section-less fields) ──
  const headerFields: ShareField[] = [
    { label: payload.titleLabel || 'Name', value: payload.title },
    { label: 'Date', value: formatShareDate(payload.date) },
    ...payload.fields.filter((f) => !f.section && !isEmpty(f.value)),
  ].filter((f) => !isEmpty(f.value));

  // Global label width across all top-level key/value rows (for colon alignment).
  const sectioned = payload.fields.filter((f) => f.section && !isEmpty(f.value));
  const labelWidth = Math.max(
    ...headerFields.map((f) => f.label.length),
    ...sectioned.map((f) => f.label.length),
    0,
  );

  const kvLine = (f: ShareField) => `${padLabel(f.label, labelWidth)} : ${f.value}`;

  headerFields.forEach((f) => out.push(kvLine(f)));

  // ── Named sections (grouped in order of first appearance) ──
  const order: string[] = [];
  const grouped = new Map<string, ShareField[]>();
  sectioned.forEach((f) => {
    const key = f.section as string;
    if (!grouped.has(key)) {
      grouped.set(key, []);
      order.push(key);
    }
    grouped.get(key)!.push(f);
  });

  order.forEach((section) => {
    out.push('', section, '-'.repeat(section.length));
    grouped.get(section)!.forEach((f) => out.push(kvLine(f)));
  });

  // ── Tables rendered as scannable per-item blocks ──
  (payload.tables ?? []).forEach((t) => {
    if (!t.rows.length) return;
    const itemLabel =
      t.itemLabel || t.title.replace(/\s*\(.*\)\s*$/, '').replace(/ Details$/, '');
    out.push('', t.title, '-'.repeat(t.title.length));

    t.rows.forEach((row, ri) => {
      // Per-block alignment for the bullet sub-labels.
      const present = t.columns
        .map((col, ci) => ({ col, value: row[ci] }))
        .filter((c) => !isEmpty(c.value));
      const subWidth = Math.max(...present.map((c) => c.col.length), 0);
      if (ri > 0) out.push('');
      out.push(`${itemLabel} ${ri + 1}`);
      present.forEach((c) => out.push(`• ${padLabel(c.col, subWidth)} : ${c.value}`));
    });
  });

  // ── Remark ──
  if (payload.footerNote) {
    out.push('', 'Remark', '------', payload.footerNote);
  }

  out.push('', 'Generated from Farm Prosperity Solutions');

  return out.join('\n');
};

/**
 * Capture the branded receipt card and open the share sheet with image + text.
 * Falls back to text-only sharing if image capture/sharing fails.
 *
 * @param payload      structured review data
 * @param viewShotRef  ref to the off-screen ViewShot wrapping ShareReceiptCard
 */
export const shareReviewDetails = async (
  payload: SharePayload,
  viewShotRef?: RefObject<any>,
) => {
  const message = buildShareText(payload);
  const title = payload.module;

  // No ref available → text only.
  if (!viewShotRef?.current) {
    await shareTextOnly(message, title);
    return;
  }

  let imageUri: string | null = null;
  try {
    const uri = await captureRef(viewShotRef, {
      format: 'png',
      quality: 0.95,
      result: 'tmpfile',
    });
    imageUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  } catch {
    // Capture failed — fall back to text-only.
    await shareTextOnly(message, title);
    return;
  }

  try {
    await RNShare.open({
      title,
      message,
      url: imageUri,
      type: 'image/png',
      failOnCancel: false,
    });
  } catch {
    // User cancellation or share failure — try text-only as a last resort,
    // but swallow a second cancellation silently.
    try {
      await shareTextOnly(message, title);
    } catch {
      /* user dismissed — nothing to do */
    }
  }
};

const shareTextOnly = async (message: string, title: string) => {
  await Share.share({ message, title });
};
