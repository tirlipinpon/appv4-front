import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildSubjectBoardResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Board matière (LEARN-42 / BACK-33).
 * Hero, progression, Continuer et thèmes viennent de GET /api/ext/subjects/{id}.
 */
@Injectable({ providedIn: 'root' })
export class ChildSubjectBoardService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly board = signal<ChildSubjectBoardResponse | null>(null);

  load(subjectId: number): Observable<ChildSubjectBoardResponse> {
    return this.http
      .get<ChildSubjectBoardResponse>(`${environment.apiBaseUrl}/subjects/${subjectId}`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.board.set(response)));
  }

  clear(): void {
    this.board.set(null);
  }
}
