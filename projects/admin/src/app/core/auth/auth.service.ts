import { Injectable } from '@angular/core';

const TOKEN_KEY = 'admin.jwt';

/**
 * Socle auth admin (SCRUM-94) — stockage JWT en sessionStorage.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  setToken(token: string): void {
    sessionStorage.setItem(TOKEN_KEY, token);
  }

  clearToken(): void {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return token !== null && token.trim().length > 0;
  }

  logout(): void {
    this.clearToken();
  }
}
