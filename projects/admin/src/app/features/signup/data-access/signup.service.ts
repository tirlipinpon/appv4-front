import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JwtTokenResponse, SignupRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access inscription email/mdp (SCRUM-106) — appelle POST /auth/signup.
 */
@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);

  signup(email: string, password: string, displayName?: string): Observable<JwtTokenResponse> {
    const body: SignupRequest = {
      email,
      password,
      displayName: displayName?.trim() || undefined,
    };
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/signup`, body);
  }
}
