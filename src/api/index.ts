import { supabaseConfigured } from '@/lib/supabase';
import { LocalApi } from './local';
import { SupabaseApi } from './supabase';
import type { RingApi } from './types';

/**
 * Supabase anahtarları .env (yerel) ve eas.json → env (derleme) üzerinden
 * gelir. Tanımlı değilse uygulama cihaz-içi demo moduna düşer; böylece
 * backend hazır olmadan da her ekran denenebilir.
 */
export const isDemoMode = !supabaseConfigured;

export const api: RingApi = isDemoMode ? new LocalApi() : new SupabaseApi();

export { ApiError, CODE_LENGTH } from './types';
export type { RingApi } from './types';
