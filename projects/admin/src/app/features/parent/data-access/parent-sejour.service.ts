import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ParentSejourListResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Séjours d'un enfant (ADMIN-78).
 * La page affiche date, heure, durée et lignes tels que l'API les envoie.
 */
@Injectable({ providedIn: 'root' })
export class ParentSejourService {
  private readonly http = inject(HttpClient);

  list(childId: number): Observable<ParentSejourListResponse> {
    return this.http.get<ParentSejourListResponse>(
      `${environment.apiBaseUrl}/parent/children/${childId}/sejours`,
    );
  }
}
