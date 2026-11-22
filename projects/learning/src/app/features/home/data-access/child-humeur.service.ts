import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import type {
  ChildHumeurAnswerRequest,
  ChildHumeurPromptResponse,
} from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';

/**
 * Popup d'humeur de l'accueil (LEARN-72).
 * La liste et la demande viennent de GET /api/ext/humeur. L'écran ne les invente pas.
 */
@Injectable({ providedIn: 'root' })
export class ChildHumeurService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  readonly prompt = signal<ChildHumeurPromptResponse | null>(null);

  load(): Observable<ChildHumeurPromptResponse> {
    return this.http
      .get<ChildHumeurPromptResponse>(`${environment.apiBaseUrl}/humeur`, {
        headers: this.headers(),
      })
      .pipe(tap((response) => this.prompt.set(response)));
  }

  answer(body: ChildHumeurAnswerRequest): Observable<void> {
    return this.http.post<void>(`${environment.apiBaseUrl}/humeur`, body, {
      headers: this.headers(),
    });
  }

  clear(): void {
    this.prompt.set(null);
  }

  private headers(): { Authorization: string } {
    return { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
  }
}
