import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, type Subscription } from 'rxjs';

import type { ChildRankingResponse } from '../../../core/api/api-models';
import { ChildAuthService, apiErrorMessage } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/** Lecture du classement. L'écran affiche cette réponse, il ne la recalcule pas. */
@Injectable()
export class ChildRankingService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly view = signal<ChildRankingResponse | null>(null);

  load(scope: string | null): void {
    this.request?.unsubscribe();
    const token = this.auth.getToken();
    this.loading.set(true);
    this.error.set(null);
    const params = scope ? { scope } : undefined;
    this.request = this.http.get<ChildRankingResponse>(`${environment.apiBaseUrl}/ranking`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      params,
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (response) => {
        if (this.auth.getToken() === token) {
          this.view.set(response);
        }
      },
      error: (error: HttpErrorResponse) => {
        if (this.auth.getToken() === token) {
          this.view.set(null);
          this.error.set(apiErrorMessage(error, 'Impossible de charger le classement.'));
        }
      },
    });
  }

  photo(scope: string, childId: number) {
    const token = this.auth.getToken();
    return this.http.get(`${environment.apiBaseUrl}/ranking/photo`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
      params: { scope, childId },
      responseType: 'blob',
    });
  }
}
