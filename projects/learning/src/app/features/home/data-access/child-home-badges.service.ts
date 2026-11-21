import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildBadgesResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Bloc badges de l'accueil (LEARN-34).
 * Le jour et l'avertissement viennent de GET /api/ext/badges.
 */
@Injectable({ providedIn: 'root' })
export class ChildHomeBadgesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly badges = signal<ChildBadgesResponse | null>(null);

  load(): Observable<ChildBadgesResponse> {
    return this.http
      .get<ChildBadgesResponse>(`${environment.apiBaseUrl}/badges`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.badges.set(response)));
  }

  clear(): void {
    this.badges.set(null);
  }
}
