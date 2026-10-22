import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JwtTokenResponse, LoginRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Data-access connexion email/mdp (SCRUM-118) — appelle POST /auth/login.
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
  private readonly http = inject(HttpClient);

  login(email: string, password: string): Observable<JwtTokenResponse> {
    const body: LoginRequest = { email, password };
    return this.http.post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/login`, body);
  }
}
