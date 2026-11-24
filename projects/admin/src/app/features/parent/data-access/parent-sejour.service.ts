import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ParentJourneeMonthResponse, PlafondRequest, PlafondResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Mois d'un enfant et plafond du jour (ADMIN-80, ADMIN-57).
 * La page affiche le libellé, les journées, les minutes et la phrase tels que l'API les envoie.
 */
@Injectable({ providedIn: 'root' })
export class ParentSejourService {
  private readonly http = inject(HttpClient);

  list(childId: number, year?: number, month?: number): Observable<ParentJourneeMonthResponse> {
    let params = new HttpParams();
    if (year != null && month != null) {
      params = params.set('year', String(year)).set('month', String(month));
    }
    return this.http.get<ParentJourneeMonthResponse>(
      `${environment.apiBaseUrl}/parent/children/${childId}/sejours`,
      { params },
    );
  }

  save(childId: number, body: PlafondRequest): Observable<PlafondResponse> {
    return this.http.put<PlafondResponse>(
      `${environment.apiBaseUrl}/parent/children/${childId}/sejours/plafond`,
      body,
    );
  }
}
