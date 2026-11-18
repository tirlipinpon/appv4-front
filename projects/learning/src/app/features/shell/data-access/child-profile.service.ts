import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildProfileResponse } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Profil de l'enfant connecté (LEARN-28 / BACK-14).
 * Prénom, avatar et photo viennent de GET /api/ext/me — rien n'est inventé ici.
 */
@Injectable({ providedIn: 'root' })
export class ChildProfileService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly profile = signal<ChildProfileResponse | null>(null);
  readonly photoUrl = signal<string | null>(null);

  load(): Observable<ChildProfileResponse> {
    return this.http
      .get<ChildProfileResponse>(`${environment.apiBaseUrl}/me`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(
        tap((response) => {
          this.profile.set(response);
          this.auth.firstName.set(response.firstName);
          if (response.hasPhoto) {
            this.fetchPhoto();
          } else {
            this.clearPhoto();
          }
        }),
      );
  }

  clear(): void {
    this.profile.set(null);
    this.clearPhoto();
  }

  private fetchPhoto(): void {
    this.http
      .get(`${environment.apiBaseUrl}/me/photo`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
        responseType: 'blob',
      })
      .subscribe({
        next: (blob) => {
          this.clearPhoto();
          this.photoUrl.set(URL.createObjectURL(blob));
        },
        error: () => this.clearPhoto(),
      });
  }

  private clearPhoto(): void {
    const current = this.photoUrl();
    if (current) {
      URL.revokeObjectURL(current);
    }
    this.photoUrl.set(null);
  }
}
