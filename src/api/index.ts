import { HttpApi } from './http';
import { LocalApi } from './local';
import { SupabaseApi } from './supabase';
import type { RingApi } from './types';

/**
 * Arka uç EAS build profillerinde (eas.json → env) seçilir:
 *
 * 1. EXPO_PUBLIC_SUPABASE_URL + EXPO_PUBLIC_SUPABASE_ANON_KEY doluysa Supabase,
 * 2. değilse EXPO_PUBLIC_API_BASE_URL doluysa server/ klasöründeki servis,
 * 3. ikisi de boşsa cihaz-içi demo modu — backend hazır olmadan da her
 *    ekran denenebilsin diye.
 */
const SUPABASE_URL = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
/** Supabase'in e-postayla gönderdiği kodun uzunluğu (Auth ayarı, varsayılan 6). */
const SUPABASE_OTP_LENGTH = Number(process.env.EXPO_PUBLIC_SUPABASE_OTP_LENGTH ?? '') || 6;

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const backend: 'supabase' | 'http' | 'demo' =
  SUPABASE_URL && SUPABASE_ANON_KEY ? 'supabase' : API_BASE_URL ? 'http' : 'demo';

export const isDemoMode = backend === 'demo';

export const api: RingApi =
  backend === 'supabase'
    ? new SupabaseApi(SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_OTP_LENGTH)
    : backend === 'http'
      ? new HttpApi(API_BASE_URL)
      : new LocalApi();

export { ApiError } from './types';
export type { RingApi } from './types';
