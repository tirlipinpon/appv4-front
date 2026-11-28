import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { ParentHumeurChildItem, ParentHumeurListResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Historique des humeurs des enfants (ADMIN-70).
 * La page affiche les libellés reçus, dans l'ordre de l'API. Elle ne formate pas l'instant.
 */
@Injectable({ providedIn: 'root' })
export class ParentHumeurService {
  private readonly http = inject(HttpClient);

  list(): Observable<ParentHumeurChildItem[]> {
    return this.http
      .get<ParentHumeurListResponse>(`${environment.apiBaseUrl}/parent/humeurs`)
      .pipe(map((body) => body.children ?? []));
  }
}
