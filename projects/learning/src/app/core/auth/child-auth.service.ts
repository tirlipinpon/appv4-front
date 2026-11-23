import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildLoginRequest, ChildLoginResponse, ChildSessionResponse } from '../api/api-models';
import { environment } from '../../../environments/environment';

const TOKEN_KEY = 'learning.jwt';

/**
 * Session de l'app enfant (LEARN-26).
 * Le jeton reste dans ce navigateur jusqu'à la fermeture de l'onglet.
 * Le prénom affiché vient de l'API, pas d'un texte inventé ici.
 */
@Injectable({ providedIn: 'root' })
export class ChildAuthService {
  private readonly http = inject(HttpClient);
  readonly firstName = signal<string | null>(null);
  /** Phrase à montrer à l'entrée après une fermeture, lue une seule fois. */
  private pendingEntryMessage: string | null = null;

  getToken(): string | null {
    return sessionStorage.getItem(TOKEN_KEY);
  }

  login(firstName: string, pin: string): Observable<ChildLoginResponse> {
    const body: ChildLoginRequest = { firstName, pin };
    return this.http.post<ChildLoginResponse>(`${environment.apiBaseUrl}/auth/login`, body).pipe(
      tap((response) => {
        sessionStorage.setItem(TOKEN_KEY, response.token);
        this.firstName.set(response.firstName);
      }),
    );
  }

  session(): Observable<ChildSessionResponse> {
    return this.http
      .get<ChildSessionResponse>(`${environment.apiBaseUrl}/auth/session`, {
        headers: { Authorization: `Bearer ${this.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.firstName.set(response.firstName)));
  }

  logout(): void {
    sessionStorage.removeItem(TOKEN_KEY);
    this.firstName.set(null);
  }

  /** Garde la phrase de l'API pour l'entrée, sans la réécrire. */
  rememberEntryMessage(message: string): void {
    this.pendingEntryMessage = message;
  }

  /** L'entrée affiche la phrase, puis l'oublie. */
  takeEntryMessage(): string | null {
    const message = this.pendingEntryMessage;
    this.pendingEntryMessage = null;
    return message;
  }
}

export function apiErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const body = err.error;
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}
