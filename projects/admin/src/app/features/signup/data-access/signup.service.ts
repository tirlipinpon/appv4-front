import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JwtTokenResponse, SignupRequest } from '../../../core/api/api-models';
import type { SpaceRole } from '../../../core/auth/space-roles';
import { environment } from '../../../../environments/environment';

/**
 * Data-access inscription email/mdp (SCRUM-106, rôles SCRUM-122).
 * Appelle POST /auth/signup avec au moins un rôle. `admin` n'est jamais envoyé.
 */
@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);

  signup(
    email: string,
    password: string,
    roles: SpaceRole[],
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
