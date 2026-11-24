import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JourneeMonthResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Mois d'un enfant (ADMIN-80).
 * La page affiche le libellé, les journées et les lignes tels que l'API les envoie.
 */
@Injectable({ providedIn: 'root' })
export class ParentSejourService {
  private readonly http = inject(HttpClient);

  list(childId: number, year?: number, month?: number): Observable<JourneeMonthResponse> {
    let params = new HttpParams();
    if (year != null && month != null) {
      params = params.set('year', String(year)).set('month', String(month));
    }
    return this.http.get<JourneeMonthResponse>(
      `${environment.apiBaseUrl}/parent/children/${childId}/sejours`,
      { params },
    );
  }
}
