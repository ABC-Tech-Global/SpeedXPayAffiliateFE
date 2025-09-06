import * as React from "react";
import { useReducer } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import type { KycResponse } from "@/types/api";
import { KycUpdateSchema } from "@/lib/schemas";
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

// --- State and Reducer Definition ---

type KycState = {
  status: 'loading' | 'idle' | 'submitting' | 'error';
  kycStatus: string | null;
  fullName: string;
  dob: Date | null;
  gender: 'male' | 'female' | '';
  images: {
    id_front: string | null;
    id_back: string | null;
    selfie: string | null;
  };
};

type KycAction =
  | { type: 'SET_INITIAL_DATA'; payload: KycResponse['kyc'] }
  | { type: 'SET_FIELD'; payload: { field: keyof KycState; value: KycState[keyof KycState] } }
  | { type: 'SET_IMAGE'; payload: { kind: 'id_front' | 'id_back' | 'selfie'; url: string | null } }
  | { type: 'SET_STATUS'; payload: 'loading' | 'idle' | 'submitting' | 'error' }
  | { type: 'SET_KYC_STATUS', payload: string };

const initialState: KycState = {
  status: 'loading',
  kycStatus: null,
  fullName: "",
  dob: null,
  gender: "",
  images: { id_front: null, id_back: null, selfie: null },
};

function kycReducer(state: KycState, action: KycAction): KycState {
  switch (action.type) {
    case 'SET_INITIAL_DATA': {
      const kyc = action.payload;
      const dobDate = kyc?.dob ? new Date(String(kyc.dob).slice(0, 10)) : null;
      return {
        ...state,
        kycStatus: kyc?.status ?? null,
        fullName: kyc?.full_name || "",
        dob: dobDate,
        gender: (kyc?.gender as 'male' | 'female' | '') || "",
        status: 'idle',
        images: { // Pre-populate with URLs that will trigger a fetch
          id_front: kyc?.has_id_front ? `/api/me/kyc/image/id_front?v=${Date.now()}` : null,
          id_back: kyc?.has_id_back ? `/api/me/kyc/image/id_back?v=${Date.now()}` : null,
          selfie: kyc?.has_selfie ? `/api/me/kyc/image/selfie?v=${Date.now()}` : null,
        },
      };
    }
    case 'SET_FIELD':
      return { ...state, [action.payload.field]: action.payload.value };
    case 'SET_IMAGE':
      return {
        ...state,
        images: { ...state.images, [action.payload.kind]: action.payload.url },
      };
    case 'SET_STATUS':
      return { ...state, status: action.payload };
    case 'SET_KYC_STATUS':
        return { ...state, kycStatus: action.payload };
    default:
      return state;
  }
}

// --- The Custom Hook ---

export function useKyc(router: AppRouterInstance) {
  const [state, dispatch] = useReducer(kycReducer, initialState);

  React.useEffect(() => {
    console.count("useKyc useEffect");
    apiFetch<KycResponse>('/api/me/kyc')
      .then(data => {
        if (data.kyc) {
          dispatch({ type: 'SET_INITIAL_DATA', payload: data.kyc });
        } else {
          // If no KYC data found, initialize as a new, empty form
          dispatch({ type: 'SET_STATUS', payload: 'idle' });
          dispatch({ type: 'SET_FIELD', payload: { field: 'fullName', value: '' } });
          dispatch({ type: 'SET_FIELD', payload: { field: 'dob', value: null } });
          dispatch({ type: 'SET_FIELD', payload: { field: 'gender', value: '' } });
          dispatch({ type: 'SET_FIELD', payload: { field: 'images', value: { id_front: null, id_back: null, selfie: null } } });
        }
      })
      .catch(() => {
        toast.error("Failed to load KYC data.");
        dispatch({ type: 'SET_STATUS', payload: 'error' });
      });
  }, []);

  const saveInfo = async () => {
    dispatch({ type: 'SET_STATUS', payload: 'submitting' });
    try {
      const dobString = state.dob ? state.dob.toISOString().slice(0, 10) : "";
      const parsed = KycUpdateSchema.safeParse({ fullName: state.fullName, dob: dobString, gender: state.gender });

      if (!parsed.success) {
        toast.error(parsed.error.issues[0]?.message || 'Invalid input');
        return;
      }
      await apiFetch('/api/me/kyc', {
        method: 'POST',
        body: JSON.stringify(parsed.data),
      });
      toast.success('Information saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      dispatch({ type: 'SET_STATUS', payload: 'idle' });
    }
  };

  const uploadImage = async (kind: 'id_front' | 'id_back' | 'selfie', file: File) => {
    dispatch({ type: 'SET_STATUS', payload: 'submitting' });
    try {
      // 1. Upload to blob storage
      const fd = new FormData();
      fd.append('file', file);
      const blobRes = await apiFetch<{ pathname: string }>('/api/blob/upload', {
        method: 'POST',
        body: fd,
      });

      // 2. Notify backend
      await apiFetch(`/api/me/kyc/upload`, {
        method: 'POST',
        body: JSON.stringify({ kind, blobPath: blobRes.pathname }),
      });
      
      // 3. Update UI state with a new timestamp to bust cache
      dispatch({ type: 'SET_IMAGE', payload: { kind, url: `/api/me/kyc/image/${kind}?v=${Date.now()}` } });
      toast.success(`${kind.replace('_', ' ')} uploaded.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to upload ${kind}.`);
      throw e; // re-throw to be caught by the component
    } finally {
      dispatch({ type: 'SET_STATUS', payload: 'idle' });
    }
  };
  
  const removeImage = async (kind: 'id_front' | 'id_back' | 'selfie') => {
    dispatch({ type: 'SET_STATUS', payload: 'submitting' });
     try {
       await apiFetch(`/api/me/kyc/upload/${kind}`, { method: 'DELETE' });
       // No need to delete from blob storage here as backend can handle that
       dispatch({ type: 'SET_IMAGE', payload: { kind, url: null } });
       toast.success(`${kind.replace('_', ' ')} removed.`);
     } catch (e) {
       toast.error(e instanceof Error ? e.message : `Failed to remove ${kind}.`);
       throw e; // re-throw to be caught by the component
     } finally {
      dispatch({ type: 'SET_STATUS', payload: 'idle' });
    }
  };

  const submitForReview = async () => {
    dispatch({ type: 'SET_STATUS', payload: 'submitting' });
    try {
      await apiFetch('/api/me/kyc/submit', { method: 'POST' });
      dispatch({ type: 'SET_KYC_STATUS', payload: 'pending' });
      toast.success('KYC submitted for review');
      router.push('/dashboard'); // Redirect to dashboard after successful submission
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      dispatch({ type: 'SET_STATUS', payload: 'idle' });
    }
  };

  return { state, dispatch, saveInfo, uploadImage, removeImage, submitForReview };
}