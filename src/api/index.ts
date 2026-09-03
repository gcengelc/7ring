import { HttpApi } from './http';
import { LocalApi } from './local';
import type { RingApi } from './types';

/**
 * Sunucu adresi EAS build profillerinde (eas.json → env) verilir.
 * Boşsa uygulama cihaz-içi demo moduna düşer; böylece backend hazır
 * olmadan da her ekran denenebilir.
 */
export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

export const isDemoMode = API_BASE_URL.length === 0;

export const api: RingApi = isDemoMode ? new LocalApi() : new HttpApi(API_BASE_URL);

export { ApiError } from './types';
export type { RingApi } from './types';
