import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import type { CompleteRolesRequest, JwtTokenResponse } from '../../../core/api/api-models';
import { AuthService } from '../../../core/auth/auth.service';
import type { SpaceRole } from '../../../core/auth/space-roles';
import { environment } from '../../../../environments/environment';

/**
 * Enregistre le premier choix de rôle (SCRUM-155).
 * Le nouveau jeton remplace l'ancien.
 */
@Injectable({ providedIn: 'root' })
export class CompleteRolesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  complete(roles: SpaceRole[]): Observable<void> {
    const body: CompleteRolesRequest = { roles };
    return this.http
      .post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/complete-roles`, body)
      .pipe(
        tap((response) => this.auth.setToken(response.token)),
        map(() => undefined),
      );
  }
}
