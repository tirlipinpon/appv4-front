import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import type { JwtTokenResponse, SwitchRoleRequest } from '../api/api-models';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import type { SpaceRole } from './admin-token';

/**
 * Change l'espace actif (SCRUM-125).
 * Le nouveau JWT remplace l'ancien. L'espace affiché vient de ce jeton.
 */
@Injectable({ providedIn: 'root' })
export class ActiveRoleService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  switchTo(role: SpaceRole): Observable<void> {
    const body: SwitchRoleRequest = { role };
    return this.http
      .post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/switch-role`, body)
      .pipe(
        tap((response) => this.auth.setToken(response.token)),
        map(() => undefined),
      );
  }
}
