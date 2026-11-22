import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, type Subscription } from 'rxjs';

import type { ChildBadgesResponse } from '../../core/api/api-models';
import { ChildAuthService, apiErrorMessage } from '../../core/auth/child-auth.service';
import { environment } from '../../../environments/environment';

/** Une lecture des badges par écran ouvert, avec la session qui a lancé la requête. */
@Injectable()
export class ChildBadgesService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly collection = signal<ChildBadgesResponse | null>(null);

  load(): void {
    this.request?.unsubscribe();
    const token = this.auth.getToken();
    this.loading.set(true);
    this.error.set(null);
    this.collection.set(null);
    this.request = this.http.get<ChildBadgesResponse>(`${environment.apiBaseUrl}/badges`, {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    }).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: (response) => {
        if (this.auth.getToken() === token) {
          this.collection.set(response);
        }
      },
      error: (error: HttpErrorResponse) => {
        if (this.auth.getToken() === token) {
          this.error.set(apiErrorMessage(error, 'Impossible de charger les badges.'));
        }
      },
    });
  }
}
