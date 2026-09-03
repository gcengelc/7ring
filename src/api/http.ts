import type { Sighting } from '@/types';
import { ApiError, type RingApi } from './types';

const TIMEOUT_MS = 12000;

/** server/ klasöründeki servise konuşan gerçek istemci. */
export class HttpApi implements RingApi {
  constructor(private readonly baseUrl: string) {}

  private async request<T>(
    path: string,
    options: { method?: string; body?: unknown; token?: string } = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: controller.signal,
      });

      if (!res.ok) {
        // Sunucu {"error":"..."} döndüğünde mesajı olduğu gibi kullanıcıya göster.
        const payload = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new ApiError(payload?.error ?? messageForStatus(res.status), res.status);
      }
      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ApiError('Sunucuya ulaşılamadı. Bağlantını kontrol et.');
      }
      throw new ApiError('Bağlantı kurulamadı. Daha sonra tekrar dene.');
    } finally {
      clearTimeout(timer);
    }
  }

  requestCode(email: string): Promise<void> {
    return this.request('/auth/request-code', { method: 'POST', body: { email } });
  }

  verifyCode(email: string, code: string): Promise<{ token: string }> {
    return this.request('/auth/verify', { method: 'POST', body: { email, code } });
  }

  async fetchSightings(token: string): Promise<Sighting[]> {
    const data = await this.request<{ sightings: Sighting[] }>('/sightings', { token });
    return data.sightings;
  }

  async report(token: string, stopId: string): Promise<Sighting> {
    const data = await this.request<{ sighting: Sighting }>('/sightings', {
      method: 'POST',
      body: { stopId },
      token,
    });
    return data.sighting;
  }

  registerPushToken(
    token: string,
    pushToken: string,
    prefs: { nearbyOnly: boolean; sound: boolean }
  ): Promise<void> {
    return this.request('/push/register', {
      method: 'POST',
      body: { pushToken, ...prefs },
      token,
    });
  }

  unregisterPushToken(token: string, pushToken: string): Promise<void> {
    return this.request('/push/unregister', { method: 'POST', body: { pushToken }, token });
  }
}

function messageForStatus(status: number): string {
  if (status === 401) return 'Oturumun sona ermiş. Tekrar giriş yap.';
  if (status === 429) return 'Çok sık denedin. Biraz bekle.';
  if (status >= 500) return 'Sunucuda bir sorun var. Birazdan tekrar dene.';
  return 'İstek tamamlanamadı.';
}
