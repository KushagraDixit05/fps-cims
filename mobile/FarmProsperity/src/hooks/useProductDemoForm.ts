// src/hooks/useProductDemoForm.ts
// Central state manager for the 4-step Product Demo wizard.
// Mirrors the useReducer pattern from useCropMonitoringForm.ts.

import { useReducer, useCallback } from 'react';
import type {
  ProductDemoFormState,
  DemoFarmerDetailsDraft,
  CropStageDraft,
  ProductDoseDraft,
  DemoResultDraft,
  LocationDraft,
  PhotoDraft,
  ProductDemoSaveResult,
} from '../types/productDemo';
import { saveProductDemoLocally } from '../database/operations';

// ─── Action types ─────────────────────────────────────────────────────────────

type FormAction =
  | { type: 'SET_STEP'; payload: ProductDemoFormState['step'] }
  | { type: 'UPDATE_FARMER_DETAILS'; payload: Partial<DemoFarmerDetailsDraft> }
  | { type: 'UPDATE_CROP_STAGE'; payload: Partial<CropStageDraft> }
  | { type: 'UPDATE_PRODUCT_DOSE'; payload: Partial<ProductDoseDraft> }
  | { type: 'UPDATE_RESULT'; payload: Partial<DemoResultDraft> }
  | { type: 'ADD_BEFORE_PHOTO'; payload: PhotoDraft }
  | { type: 'REMOVE_BEFORE_PHOTO'; payload: { uri: string } }
  | { type: 'ADD_AFTER_PHOTO'; payload: PhotoDraft }
  | { type: 'REMOVE_AFTER_PHOTO'; payload: { uri: string } }
  | { type: 'SET_LOCATION'; payload: LocationDraft }
  | { type: 'RESET' };

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_STATE: ProductDemoFormState = {
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
  cropStage: {
    crop_name: '',
    variety: '',
    custom_variety: '',
    crop_stage: '',
    crop_stage_days: '',
    demo_date: '',
  },
  productDose: {
    product_name: '',
    dose: '',
    dose_unit: '',
  },
  result: {
    before_photos: [],
    after_photos: [],
    demo_result: '',
    additional_observations: '',
    remark: '',
  },
  location: { latitude: null, longitude: null, captured: false },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

function formReducer(
  state: ProductDemoFormState,
  action: FormAction,
): ProductDemoFormState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload };

    case 'UPDATE_FARMER_DETAILS':
      return {
        ...state,
        farmerDetails: { ...state.farmerDetails, ...action.payload },
      };

    case 'UPDATE_CROP_STAGE':
      return {
        ...state,
        cropStage: { ...state.cropStage, ...action.payload },
      };

    case 'UPDATE_PRODUCT_DOSE':
      return {
        ...state,
        productDose: { ...state.productDose, ...action.payload },
      };

    case 'UPDATE_RESULT':
      return {
        ...state,
        result: { ...state.result, ...action.payload },
      };

    case 'ADD_BEFORE_PHOTO':
      return {
        ...state,
        result: {
          ...state.result,
          before_photos: [...state.result.before_photos, action.payload],
        },
      };

    case 'REMOVE_BEFORE_PHOTO':
      return {
        ...state,
        result: {
          ...state.result,
          before_photos: state.result.before_photos.filter(
            (p) => p.uri !== action.payload.uri,
          ),
        },
      };

    case 'ADD_AFTER_PHOTO':
      return {
        ...state,
        result: {
          ...state.result,
          after_photos: [...state.result.after_photos, action.payload],
        },
      };

    case 'REMOVE_AFTER_PHOTO':
      return {
        ...state,
        result: {
          ...state.result,
          after_photos: state.result.after_photos.filter(
            (p) => p.uri !== action.payload.uri,
          ),
        },
      };

    case 'SET_LOCATION':
      return { ...state, location: action.payload };

    case 'RESET':
      return { ...INITIAL_STATE };

    default:
      return state;
  }
}

// ─── Hook return type ─────────────────────────────────────────────────────────

export interface UseProductDemoFormReturn {
  state: ProductDemoFormState;

  setStep: (step: ProductDemoFormState['step']) => void;

  // Step 1
  updateFarmerDetails: (data: Partial<DemoFarmerDetailsDraft>) => void;

  // Step 2
  updateCropStage: (data: Partial<CropStageDraft>) => void;

  // Step 3
  updateProductDose: (data: Partial<ProductDoseDraft>) => void;

  // Step 4
  updateResult: (data: Partial<DemoResultDraft>) => void;
  addBeforePhoto: (photo: PhotoDraft) => void;
  removeBeforePhoto: (uri: string) => void;
  addAfterPhoto: (photo: PhotoDraft) => void;
  removeAfterPhoto: (uri: string) => void;
  setLocation: (loc: LocationDraft) => void;

  submit: () => Promise<ProductDemoSaveResult>;
  reset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useProductDemoForm = (): UseProductDemoFormReturn => {
  const [state, dispatch] = useReducer(formReducer, INITIAL_STATE);

  const setStep = useCallback(
    (step: ProductDemoFormState['step']) =>
      dispatch({ type: 'SET_STEP', payload: step }),
    [],
  );

  const updateFarmerDetails = useCallback(
    (data: Partial<DemoFarmerDetailsDraft>) =>
      dispatch({ type: 'UPDATE_FARMER_DETAILS', payload: data }),
    [],
  );

  const updateCropStage = useCallback(
    (data: Partial<CropStageDraft>) =>
      dispatch({ type: 'UPDATE_CROP_STAGE', payload: data }),
    [],
  );

  const updateProductDose = useCallback(
    (data: Partial<ProductDoseDraft>) =>
      dispatch({ type: 'UPDATE_PRODUCT_DOSE', payload: data }),
    [],
  );

  const updateResult = useCallback(
    (data: Partial<DemoResultDraft>) =>
      dispatch({ type: 'UPDATE_RESULT', payload: data }),
    [],
  );

  const addBeforePhoto = useCallback(
    (photo: PhotoDraft) =>
      dispatch({ type: 'ADD_BEFORE_PHOTO', payload: photo }),
    [],
  );

  const removeBeforePhoto = useCallback(
    (uri: string) =>
      dispatch({ type: 'REMOVE_BEFORE_PHOTO', payload: { uri } }),
    [],
  );

  const addAfterPhoto = useCallback(
    (photo: PhotoDraft) =>
      dispatch({ type: 'ADD_AFTER_PHOTO', payload: photo }),
    [],
  );

  const removeAfterPhoto = useCallback(
    (uri: string) =>
      dispatch({ type: 'REMOVE_AFTER_PHOTO', payload: { uri } }),
    [],
  );

  const setLocation = useCallback(
    (loc: LocationDraft) => dispatch({ type: 'SET_LOCATION', payload: loc }),
    [],
  );

  const submit = useCallback(async () => {
    return saveProductDemoLocally(state);
  }, [state]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    setStep,
    updateFarmerDetails,
    updateCropStage,
    updateProductDose,
    updateResult,
    addBeforePhoto,
    removeBeforePhoto,
    addAfterPhoto,
    removeAfterPhoto,
    setLocation,
    submit,
    reset,
  };
};
