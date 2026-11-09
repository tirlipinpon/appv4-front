import { Injectable, computed, inject, signal } from '@angular/core';

import { readAdminToken, isUsableAdminToken } from './admin-token';
import { ConnectedAccountService } from './connected-account.service';

const TOKEN_KEY = 'admin.jwt';

/**
 * Socle auth admin (SCRUM-94, espace actif SCRUM-125).
 * Le JWT en sessionStorage décide de l'espace, y compris après F5.
 * Logout / nouveau jeton : le bandeau est vidé tout de suite (pas l'ancien nom).
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly revision = signal(0);
  private readonly account = inject(ConnectedAccountService);

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
    this.account.clear();
    this.revision.update((value) => value + 1);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.account.clear();
    this.revision.update((value) => value + 1);
  }

  isAuthenticated(): boolean {
    return isUsableAdminToken(this.getToken());
  }

  logout(): void {
    this.clearToken();
  }
}
