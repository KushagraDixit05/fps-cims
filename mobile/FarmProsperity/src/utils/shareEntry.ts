// src/utils/shareEntry.ts
// Per-module SharePayload builders. ALL share formatting (section names, labels,
// unit suffixes, condition capitalization, stage labels, location strings) lives
// here exactly once, so the Review (pre-submission), list, and detail screens all
// produce identical output. Each builder takes a normalized input — screens map
// their own data shape (form state / WatermelonDB model / API response) into it.

import {
  buildShareText,
  capitalize,
  type SharePayload,
  type ShareField,
} from './shareReviewDetails';

export { buildShareText, type SharePayload };

/** Human-readable crop-stage labels, shared across modules. */
export const STAGE_LABELS: Record<string, string> = {
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  fruiting: 'Fruiting',
  harvesting: 'Harvesting',
  post_harvest: 'Post Harvest',
};

/** Format a GPS coordinate pair as `22.7608° N, 75.8794° E`, or '' if missing. */
export const formatLatLng = (
  lat?: number | null,
  lng?: number | null,
): string =>
  lat != null && lng != null
    ? `${Math.abs(lat).toFixed(4)}° N, ${Math.abs(lng).toFixed(4)}° E`
    : '';

const acre = (v?: string | number | null) =>
  v != null && `${v}`.trim() !== '' ? `${v} Acre` : '';
const quintal = (v?: string | number | null) =>
  v != null && `${v}`.trim() !== '' ? `${v} Quintal` : '';

// ── Crop Intelligence ─────────────────────────────────────────────────────────

export type CropShareInput = {
  farmerName: string;
  village: string;
  block: string;
  district: string;
  mobile?: string | null;
  totalLandAcre?: string | null;
  /** Pre-formatted location string (preferred), else lat/lng are formatted. */
  locationDisplay?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoCount: number;
  /** ISO date (YYYY-MM-DD); rendered human-friendly by buildShareText. */
  date: string;
  remark?: string | null;
  crops: {
    name: string;
    /** Comma-joined variety names. */
    varieties: string;
    areaAcre?: string | number | null;
    /** Raw condition key (good/average/poor); capitalized here. */
    condition?: string | null;
  }[];
};

export const buildCropSharePayload = (i: CropShareInput): SharePayload => {
  const location = i.locationDisplay || formatLatLng(i.latitude, i.longitude) || 'Not captured';
  return {
    module: 'Crop Intelligence Module',
    title: i.farmerName,
    titleLabel: 'Farmer Name',
    date: i.date,
    fields: [
      { section: 'Location Details', label: 'Village', value: i.village },
      { section: 'Location Details', label: 'Block', value: i.block },
      { section: 'Location Details', label: 'District', value: i.district },
      { section: 'Contact Details', label: 'Mobile', value: i.mobile || '' },
      { section: 'Land Details', label: 'Total Land', value: acre(i.totalLandAcre) },
      { section: 'Field Data', label: 'Location', value: location },
      { section: 'Field Data', label: 'Photos', value: `${i.photoCount}` },
    ],
    tables: [
      {
        title: 'Crop Details',
        itemLabel: 'Crop',
        columns: ['Crop Name', 'Variety', 'Area', 'Condition'],
        rows: i.crops.map((c) => [
          c.name || '—',
          c.varieties || '—',
          acre(c.areaAcre) || '—',
          capitalize(c.condition || '') || '—',
        ]),
      },
    ],
    footerNote: i.remark || undefined,
  };
};

// ── Market Intelligence ───────────────────────────────────────────────────────

export type MandiShareInput = {
  mandiName: string;
  date: string;
  totalArrivalQt?: string | number | null;
  source?: string | null;
  avgRate?: number | null;
  minRate?: number | null;
  maxRate?: number | null;
  locationDisplay?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  photoCount?: number | null;
  /** Per-variety rows (wizard entries only; omit for API summary). */
  varieties?: {
    name: string;
    quantityQt?: string | number | null;
    topRate?: string | number | null;
    mostly?: string | number | null;
    bottom?: string | number | null;
  }[];
  remark?: string | null;
};

const rupee = (v?: number | null) => (v != null ? `₹${v}/Qt` : '');

export const buildMandiSharePayload = (i: MandiShareInput): SharePayload => {
  const fields: ShareField[] = [
    { section: 'Arrival Details', label: 'Total Arrival', value: quintal(i.totalArrivalQt) },
    { section: 'Arrival Details', label: 'Source', value: capitalize(i.source || '') },
  ];

  // Price Data — only when the source carries rate data (API summary).
  if (i.avgRate != null || i.minRate != null || i.maxRate != null) {
    fields.push(
      { section: 'Price Data', label: 'Avg Rate', value: rupee(i.avgRate) },
      { section: 'Price Data', label: 'Min Rate', value: rupee(i.minRate) },
      { section: 'Price Data', label: 'Max Rate', value: rupee(i.maxRate) },
    );
  }

  // Field Data — only when location/photos are available (wizard entries).
  const location = i.locationDisplay || formatLatLng(i.latitude, i.longitude);
  if (location || i.photoCount != null) {
    if (location) fields.push({ section: 'Field Data', label: 'Location', value: location });
    if (i.photoCount != null) fields.push({ section: 'Field Data', label: 'Photos', value: `${i.photoCount}` });
  }

  const payload: SharePayload = {
    module: 'Market Intelligence Module',
    title: i.mandiName,
    titleLabel: 'Mandi Name',
    date: i.date,
    fields,
    footerNote: i.remark || undefined,
  };

  if (i.varieties && i.varieties.length) {
    payload.tables = [
      {
        title: 'Variety Details',
        itemLabel: 'Variety',
        columns: ['Name', 'Quantity', 'Top Rate', 'Mostly', 'Bottom'],
        rows: i.varieties.map((v) => [
          v.name || '—',
          quintal(v.quantityQt) || '—',
          v.topRate != null && `${v.topRate}` !== '' ? `${v.topRate}` : '—',
          v.mostly != null && `${v.mostly}` !== '' ? `${v.mostly}` : '—',
          v.bottom != null && `${v.bottom}` !== '' ? `${v.bottom}` : '—',
        ]),
      },
    ];
  }

  return payload;
};

// ── Product Performance ───────────────────────────────────────────────────────

export type DemoShareInput = {
  farmerName: string;
  village: string;
  block: string;
  district: string;
  mobile?: string | null;
  totalLandAcre?: string | null;
  crop: string;
  variety: string;
  /** Label for the variety row — 'Variety' or 'Varieties'. */
  varietyLabel?: string;
  /** Raw stage key (mapped via STAGE_LABELS) or an already-human label. */
  cropStage: string;
  stageDays?: string | null;
  product: string;
  dose?: string | null;
  doseUnit?: string | null;
  demoDate: string;
  remark?: string | null;
};

export const buildDemoSharePayload = (i: DemoShareInput): SharePayload => {
  const dose = [i.dose, i.doseUnit].filter((x) => x && `${x}`.trim()).join(' ');
  return {
    module: 'Product Performance Module',
    title: i.farmerName,
    titleLabel: 'Farmer Name',
    date: i.demoDate,
    fields: [
      { section: 'Location Details', label: 'Village', value: i.village },
      { section: 'Location Details', label: 'Block', value: i.block },
      { section: 'Location Details', label: 'District', value: i.district },
      { section: 'Contact Details', label: 'Mobile', value: i.mobile || '' },
      { section: 'Land Details', label: 'Total Land', value: acre(i.totalLandAcre) },
      { section: 'Crop & Stage', label: 'Crop', value: i.crop },
      { section: 'Crop & Stage', label: i.varietyLabel || 'Variety', value: i.variety },
      { section: 'Crop & Stage', label: 'Crop Stage', value: STAGE_LABELS[i.cropStage] ?? i.cropStage },
      { section: 'Crop & Stage', label: 'Stage Days', value: i.stageDays || '' },
      { section: 'Product Details', label: 'Product', value: i.product },
      { section: 'Product Details', label: 'Dose', value: dose },
    ],
    footerNote: i.remark || undefined,
  };
};
