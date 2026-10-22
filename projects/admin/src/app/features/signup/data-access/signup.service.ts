import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JwtTokenResponse, SignupRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/** Rôles cochables à l'inscription. `admin` n'est jamais envoyé (SCRUM-122). */
export type SignupRole = 'parent' | 'teacher';

/**
 * Data-access inscription email/mdp (SCRUM-106, rôles SCRUM-122).
 * Appelle POST /auth/signup avec au moins un rôle.
 */
@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);

  signup(
    email: string,
    password: string,
    roles: SignupRole[],
    displayName?: string,
  ): Observable<JwtTokenResponse> {
    const body: SignupRequest = {
      email,
      password,
      displayName: displayName?.trim() || undefined,
      roles,
    };
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/signup`, body);
  }
}
