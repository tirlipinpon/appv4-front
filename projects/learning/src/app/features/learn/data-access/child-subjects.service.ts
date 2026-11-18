import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildLearningSubjectsResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Matières liées de l'enfant (LEARN-29 / BACK-15).
 * GET /api/ext/subjects — rien n'est inventé ici.
 */
@Injectable({ providedIn: 'root' })
export class ChildSubjectsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly subjects = signal<NonNullable<ChildLearningSubjectsResponse['subjects']>>([]);

  load(): Observable<ChildLearningSubjectsResponse> {
    return this.http
      .get<ChildLearningSubjectsResponse>(`${environment.apiBaseUrl}/subjects`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(
        tap((response) => {
          this.subjects.set(response.subjects ?? []);
        }),
      );
  }

  clear(): void {
    this.subjects.set([]);
  }
}
