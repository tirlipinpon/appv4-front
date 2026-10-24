import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { JwtTokenResponse, SpaceAccessResponse } from '../api/api-models';
import { AuthService } from './auth.service';

/**
 * Ajoute l'espace qui manque sur le compte déjà connecté (SCRUM-152).
 * Parent : nouveau JWT. Professeur : demande en attente, le jeton ne gagne pas le rôle teacher.
 */
@Injectable({ providedIn: 'root' })
export class SpaceAccessService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** Rôles accordés et état de la demande. Le JWT ne suffit pas après un rechargement. */
  load(): Observable<SpaceAccessResponse> {
    return this.http.get<SpaceAccessResponse>(`${environment.apiBaseUrl}/auth/spaces`);
  }

  openParent(): Observable<void> {
    return this.http
      .post<JwtTokenResponse>(`${environment.apiBaseUrl}/auth/spaces/parent`, null)
      .pipe(
        tap((response) => this.auth.setToken(response.token)),
        map(() => undefined),
      );
  }

  requestTeacher(): Observable<SpaceAccessResponse> {
    return this.http.post<SpaceAccessResponse>(`${environment.apiBaseUrl}/auth/spaces/teacher`, null);
  }
}
