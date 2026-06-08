// src/hooks/useMandiArrivalForm.ts
// Central state manager for the 5-step Mandi Arrival wizard.
// Uses useReducer so all state lives in one place — Review & Edit navigation
// never loses previously entered data.
// Mirrors the pattern of useCropMonitoringForm.ts.

import { useReducer, useCallback } from 'react';
import type {
  MandiArrivalFormState,
  MandiDetailsDraft,
  CropVarietyDraft,
  MandiArrivalSource,
  MandiArrivalSaveResult,
} from '../types/mandiArrival';
import type { PhotoDraft, LocationDraft } from '../types/cropMonitoring';
import { saveMandiArrivalWizardLocally } from '../database/operations';

// ─── Action types ─────────────────────────────────────────────────────────────

type FormAction =
  | { type: 'SET_STEP'; payload: MandiArrivalFormState['step'] }
  | { type: 'UPDATE_MANDI_DETAILS'; payload: Partial<MandiDetailsDraft> }
  | { type: 'ADD_VARIETY' }
  | { type: 'UPDATE_VARIETY'; payload: { localKey: string; data: Partial<CropVarietyDraft> } }
  | { type: 'REMOVE_VARIETY'; payload: { localKey: string } }
  | { type: 'SET_SOURCE'; payload: MandiArrivalSource }
  | { type: 'SET_REMARK'; payload: string }
  | { type: 'ADD_PHOTO'; payload: PhotoDraft }
  | { type: 'REMOVE_PHOTO'; payload: { uri: string } }
  | { type: 'SET_LOCATION'; payload: LocationDraft }
  | { type: 'RESET' };

// ─── Default values ───────────────────────────────────────────────────────────

const makeBlankVariety = (index: number = 0): CropVarietyDraft => ({
  localKey: `variety_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  crop_variety_name: '',
  quantity_qt: '',
  top_rate: '',
  mostly_sales_rate: '',
  bottom_rate: '',
  sort_order: index,
});

const INITIAL_STATE: MandiArrivalFormState = {
  step: 1,
  mandiDetails: {
    mandi_id: '',
    mandi_name: '',
    date: '',          // set to todayISO() in Step1 component default
    total_arrival_qt: '',
  },
  varieties: [makeBlankVariety(0)],
  source: '',
  remark: '',
  photos: [],
  location: { latitude: null, longitude: null, captured: false },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function formReducer(
  state: MandiArrivalFormState,
  action: FormAction,
): MandiArrivalFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'UPDATE_MANDI_DETAILS':
      return {
        ...state,
        mandiDetails: { ...state.mandiDetails, ...action.payload },
      };

    case 'ADD_VARIETY': {
      const newVariety = makeBlankVariety(state.varieties.length);
      return { ...state, varieties: [...state.varieties, newVariety] };
    }

    case 'UPDATE_VARIETY':
      return {
        ...state,
        varieties: state.varieties.map((v) =>
          v.localKey === action.payload.localKey
            ? { ...v, ...action.payload.data }
            : v,
        ),
      };

    case 'REMOVE_VARIETY':
      // Never remove the last variety — at least 1 is required
      if (state.varieties.length <= 1) return state;
      return {
        ...state,
        varieties: state.varieties
          .filter((v) => v.localKey !== action.payload.localKey)
          .map((v, i) => ({ ...v, sort_order: i })),
      };

    case 'SET_SOURCE':
      return { ...state, source: action.payload };

    case 'SET_REMARK':
      return { ...state, remark: action.payload };

    case 'ADD_PHOTO':
      return { ...state, photos: [...state.photos, action.payload] };

    case 'REMOVE_PHOTO':
      return {
        ...state,
        photos: state.photos.filter((p) => p.uri !== action.payload.uri),
      };

    case 'SET_LOCATION':
      return { ...state, location: action.payload };

    case 'RESET':
      return { ...INITIAL_STATE, varieties: [makeBlankVariety(0)] };

    default:
      return state;
  }
}

// ─── Hook interface ───────────────────────────────────────────────────────────

export interface UseMandiArrivalFormReturn {
  state: MandiArrivalFormState;

  // Navigation
  setStep: (step: MandiArrivalFormState['step']) => void;

  // Step 1
  updateMandiDetails: (data: Partial<MandiDetailsDraft>) => void;

  // Step 2
  addVariety: () => void;
  updateVariety: (localKey: string, data: Partial<CropVarietyDraft>) => void;
  removeVariety: (localKey: string) => void;

  // Step 3
  setSource: (source: MandiArrivalSource) => void;
  setRemark: (text: string) => void;

  // Step 4
  addPhoto: (photo: PhotoDraft) => void;
  removePhoto: (uri: string) => void;

  // Step 5
  setLocation: (loc: LocationDraft) => void;

  // Submit & reset
  submit: () => Promise<MandiArrivalSaveResult>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useMandiArrivalForm = (): UseMandiArrivalFormReturn => {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);

  const setStep = useCallback(
    (step: MandiArrivalFormState['step']) =>
      dispatch({ type: 'SET_STEP', payload: step }),
    [],
  );

  const updateMandiDetails = useCallback(
    (data: Partial<MandiDetailsDraft>) =>
      dispatch({ type: 'UPDATE_MANDI_DETAILS', payload: data }),
    [],
  );

  const addVariety = useCallback(() => dispatch({ type: 'ADD_VARIETY' }), []);

  const updateVariety = useCallback(
    (localKey: string, data: Partial<CropVarietyDraft>) =>
      dispatch({ type: 'UPDATE_VARIETY', payload: { localKey, data } }),
    [],
  );

  const removeVariety = useCallback(
    (localKey: string) =>
      dispatch({ type: 'REMOVE_VARIETY', payload: { localKey } }),
    [],
  );

  const setSource = useCallback(
    (source: MandiArrivalSource) =>
      dispatch({ type: 'SET_SOURCE', payload: source }),
    [],
  );

  const setRemark = useCallback(
    (text: string) => dispatch({ type: 'SET_REMARK', payload: text }),
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

  const submit = useCallback(async () => {
    // Offline-first: save locally, sync to server in background when online.
    return saveMandiArrivalWizardLocally(state);
  }, [state]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    setStep,
    updateMandiDetails,
    addVariety,
    updateVariety,
    removeVariety,
    setSource,
    setRemark,
    addPhoto,
    removePhoto,
    setLocation,
    submit,
    reset,
  };
};
