import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type { ChildAvatarResponse, SaveChildAvatarStyleRequest } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Personnage de Profil (LEARN-56).
 * Le style, les seuils et les variantes viennent de GET /api/ext/avatar.
 */
@Injectable({ providedIn: 'root' })
export class ChildAvatarService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly avatar = signal<ChildAvatarResponse | null>(null);

  load(): Observable<ChildAvatarResponse> {
    return this.http
      .get<ChildAvatarResponse>(`${environment.apiBaseUrl}/avatar`, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.avatar.set(response)));
  }

  save(styleCode: string, presetId: string | null): Observable<ChildAvatarResponse> {
    const body: SaveChildAvatarStyleRequest = {
      styleCode,
      ...(presetId ? { presetId } : {}),
    };
    return this.http
      .put<ChildAvatarResponse>(`${environment.apiBaseUrl}/avatar`, body, {
        headers: { Authorization: `Bearer ${this.auth.getToken() ?? ''}` },
      })
      .pipe(tap((response) => this.avatar.set(response)));
  }

  clear(): void {
    this.avatar.set(null);
  }
}
