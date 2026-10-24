import { Injectable, computed, signal } from '@angular/core';

import { readAdminToken } from './admin-token';

const TOKEN_KEY = 'admin.jwt';

/**
 * Socle auth admin (SCRUM-94, espace actif SCRUM-125).
 * Le JWT en sessionStorage décide de l'espace, y compris après F5.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly revision = signal(0);

  /** Relu depuis le jeton, y compris après F5. */
  readonly session = computed(() => {
    this.revision();
    return readAdminToken(this.getToken());
  });

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
    this.revision.update((value) => value + 1);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.revision.update((value) => value + 1);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.trim().length > 0;
  }

  logout(): void {
    this.clearToken();
  }
}
