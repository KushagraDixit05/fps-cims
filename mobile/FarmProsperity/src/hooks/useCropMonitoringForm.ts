// src/hooks/useCropMonitoringForm.ts
// Central state manager for the 3-step Crop Monitoring wizard.
// Uses useReducer so all state lives in one place — Review & Edit navigation
// never loses previously entered data.

import { useReducer, useCallback } from 'react';
import type {
  CropMonitoringFormState,
  FarmerDetailsDraft,
  CropRecordDraft,
  PhotoDraft,
  LocationDraft,
} from '../types/cropMonitoring';
import { saveVisitLocally } from '../database/operations';
import { OTHERS_VALUE } from '../components/SmartDropdown';

// ─── Action types ─────────────────────────────────────────────────────────────

type FormAction =
  | { type: 'SET_STEP'; payload: CropMonitoringFormState['step'] }
  | { type: 'UPDATE_FARMER_DETAILS'; payload: Partial<FarmerDetailsDraft> }
  | { type: 'ADD_CROP' }
  | { type: 'UPDATE_CROP'; payload: { localKey: string; data: Partial<CropRecordDraft> } }
  | { type: 'REMOVE_CROP'; payload: { localKey: string } }
  | { type: 'ADD_PHOTO'; payload: PhotoDraft }
  | { type: 'REMOVE_PHOTO'; payload: { uri: string } }
  | { type: 'SET_LOCATION'; payload: LocationDraft }
  | { type: 'SET_REMARK'; payload: string }
  | { type: 'RESET' };

// ─── Default values ───────────────────────────────────────────────────────────

const makeBlankCrop = (index: number = 0): CropRecordDraft => ({
  localKey: `crop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  crop_name: '',
  variety: '',
  custom_variety: '',
  date_of_sowing: '',
  current_area_acre: '',
  last_year_area_acre: '',
  this_year_area_acre: '',
  crop_stage: '',
  crop_condition: '',
  problems: [],
  other_problem_detail: '',
  sort_order: index,
});

const INITIAL_STATE: CropMonitoringFormState = {
  step: 1,
  farmerDetails: {
    farmer_name: '',
    mobile_number: '',
    village_name: '',
    village_id: null,
    custom_village_name: '',
    block_name: '',
    district_name: '',
    total_land_acre: '',
  },
  crops: [makeBlankCrop(0)],
  photos: [],
  location: { latitude: null, longitude: null, captured: false },
  remark: '',
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function formReducer(
  state: CropMonitoringFormState,
  action: FormAction,
): CropMonitoringFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'UPDATE_FARMER_DETAILS':
      return {
        ...state,
        farmerDetails: { ...state.farmerDetails, ...action.payload },
      };

    case 'ADD_CROP': {
      const newCrop = makeBlankCrop(state.crops.length);
      return { ...state, crops: [...state.crops, newCrop] };
    }

    case 'UPDATE_CROP':
      return {
        ...state,
        crops: state.crops.map((c) =>
          c.localKey === action.payload.localKey
            ? { ...c, ...action.payload.data }
            : c,
        ),
      };

    case 'REMOVE_CROP':
      // Never remove the last crop — validation enforces min 1
      if (state.crops.length <= 1) return state;
      return {
        ...state,
        crops: state.crops
          .filter((c) => c.localKey !== action.payload.localKey)
          .map((c, i) => ({ ...c, sort_order: i })), // reindex sort_order
      };

    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p.uri !== action.payload.uri),
      };

    case 'SET_LOCATION':
      return { ...state, location: action.payload };

    case 'SET_REMARK':
      return { ...state, remark: action.payload };

    case 'RESET':
      return { ...INITIAL_STATE, crops: [makeBlankCrop(0)] };

    default:
      return state;
  }
}

// ─── FormData builder ─────────────────────────────────────────────────────────

const buildFormData = (state: CropMonitoringFormState): FormData => {
  const fd = new FormData();
  const { farmerDetails, crops, photos, location, remark } = state;

  // Farmer fields
  fd.append('farmer_name', farmerDetails.farmer_name.trim());
  fd.append('mobile_number', farmerDetails.mobile_number.trim());
  // Resolve Others sentinel for village_name
  const resolvedVillage = farmerDetails.village_name === OTHERS_VALUE
    ? (farmerDetails.custom_village_name?.trim() || 'Custom')
    : farmerDetails.village_name.trim();
  fd.append('village_name', resolvedVillage);
  fd.append('block_name', farmerDetails.block_name.trim());
  fd.append('district_name', farmerDetails.district_name.trim());
  fd.append('total_land_acre', farmerDetails.total_land_acre.trim());

  // GPS
  if (location.latitude !== null) {
    fd.append('latitude', String(location.latitude));
  }
  if (location.longitude !== null) {
    fd.append('longitude', String(location.longitude));
  }

  // Remark
  fd.append('remark', remark.trim());

  // Crops: serialized as JSON string (multipart can't send nested arrays)
  // If variety is 'Others', use the custom_variety text as the actual variety value.
  const cropsPayload = crops.map((c, i) => ({
    crop_name: c.crop_name,
    variety: c.variety === OTHERS_VALUE ? (c.custom_variety.trim() || 'Others') : c.variety,
    date_of_sowing: c.date_of_sowing,
    current_area_acre: c.current_area_acre,
    last_year_area_acre: c.last_year_area_acre || null,
    this_year_area_acre: c.this_year_area_acre,
    crop_stage: c.crop_stage,
    crop_condition: c.crop_condition,
    problems: c.problems,
    other_problem_detail: c.other_problem_detail,
    sort_order: i,
  }));
  fd.append('crops', JSON.stringify(cropsPayload));

  // Photos as file objects
  photos.forEach((photo, i) => {
    fd.append('photos', {
      uri: photo.uri,
      name: photo.name || `photo_${i}.jpg`,
      type: photo.type || 'image/jpeg',
    } as any);
  });

  return fd;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseCropMonitoringFormReturn {
  state: CropMonitoringFormState;

  // Navigation
  setStep: (step: CropMonitoringFormState['step']) => void;

  // Step 1
  updateFarmerDetails: (data: Partial<FarmerDetailsDraft>) => void;

  // Step 2
  addCrop: () => void;
  updateCrop: (localKey: string, data: Partial<CropRecordDraft>) => void;
  removeCrop: (localKey: string) => void;

  // Step 3
  addPhoto: (photo: PhotoDraft) => void;
  removePhoto: (uri: string) => void;
  setLocation: (loc: LocationDraft) => void;
  setRemark: (text: string) => void;

  // Submit
  submit: () => Promise<{ id: string; farmer_name: string; crop_count: number }>;

  // Reset (for "ADD NEW ENTRY" on success screen)
  reset: () => void;
}

export const useCropMonitoringForm = (): UseCropMonitoringFormReturn => {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);

  const setStep = useCallback(
    (step: CropMonitoringFormState['step']) =>
      dispatch({ type: 'SET_STEP', payload: step }),
    [],
  );

  const updateFarmerDetails = useCallback(
    (data: Partial<FarmerDetailsDraft>) =>
      dispatch({ type: 'UPDATE_FARMER_DETAILS', payload: data }),
    [],
  );

  const addCrop = useCallback(() => dispatch({ type: 'ADD_CROP' }), []);

  const updateCrop = useCallback(
    (localKey: string, data: Partial<CropRecordDraft>) =>
      dispatch({ type: 'UPDATE_CROP', payload: { localKey, data } }),
    [],
  );

  const removeCrop = useCallback(
    (localKey: string) =>
      dispatch({ type: 'REMOVE_CROP', payload: { localKey } }),
    [],
  );

  const addPhoto = useCallback(
    (photo: PhotoDraft) => dispatch({ type: 'ADD_PHOTO', payload: photo }),
    [],
  );

  const removePhoto = useCallback(
    (uri: string) => dispatch({ type: 'REMOVE_PHOTO', payload: { uri } }),
    [],
  );

  const setLocation = useCallback(
    (loc: LocationDraft) => dispatch({ type: 'SET_LOCATION', payload: loc }),
    [],
  );

  const setRemark = useCallback(
    (text: string) => dispatch({ type: 'SET_REMARK', payload: text }),
    [],
  );

  const submit = useCallback(async () => {
    // Phase 3: save locally first. Background sync will push to API when online.
    return saveVisitLocally(state);
  }, [state]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    setStep,
    updateFarmerDetails,
    addCrop,
    updateCrop,
    removeCrop,
    addPhoto,
    removePhoto,
    setLocation,
    setRemark,
    submit,
    reset,
  };
};
