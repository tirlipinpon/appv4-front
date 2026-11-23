import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildTodayResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Mission du jour (LEARN-32 / BACK-18).
 * Objectif, tâches et lien Play viennent uniquement de GET /api/ext/today.
 */
@Injectable({ providedIn: 'root' })
export class ChildTodayService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly today = signal<ChildTodayResponse | null>(null);

  load(): Observable<ChildTodayResponse> {
    return this.http
      .get<ChildTodayResponse>(`${environment.apiBaseUrl}/today`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.today.set(response)));
  }

  clear(): void {
    this.today.set(null);
  }
}
