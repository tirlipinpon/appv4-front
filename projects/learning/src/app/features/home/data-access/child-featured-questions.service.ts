import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildFeaturedQuestionsResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Raccourci de l'accueil (LEARN-35).
 * Les énoncés viennent de GET /api/ext/featured. L'écran ne choisit pas les questions.
 */
@Injectable({ providedIn: 'root' })
export class ChildFeaturedQuestionsService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly featured = signal<ChildFeaturedQuestionsResponse | null>(null);

  load(): Observable<ChildFeaturedQuestionsResponse> {
    return this.http
      .get<ChildFeaturedQuestionsResponse>(`${environment.apiBaseUrl}/featured`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.featured.set(response)));
  }

  clear(): void {
    this.featured.set(null);
  }
}
