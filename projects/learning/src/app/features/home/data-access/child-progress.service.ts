import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildProgressResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Progression enfant (LEARN-31 / BACK-17).
 * XP, streak, palier et semaine viennent uniquement de GET /api/ext/progress.
 */
@Injectable({ providedIn: 'root' })
export class ChildProgressService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly progress = signal<ChildProgressResponse | null>(null);

  load(): Observable<ChildProgressResponse> {
    return this.http
      .get<ChildProgressResponse>(`${environment.apiBaseUrl}/progress`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.progress.set(response)));
  }

  clear(): void {
    this.progress.set(null);
  }
}
