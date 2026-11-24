import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { JourneeMonthResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Mois d'un élève de la classe (ADMIN-81).
 * La page affiche le mois et les journées tels que l'API les envoie. Pas de plafond.
 */
@Injectable({ providedIn: 'root' })
export class TeacherSejourService {
  private readonly http = inject(HttpClient);

  list(childId: number, year?: number, month?: number): Observable<JourneeMonthResponse> {
    let params = new HttpParams();
    if (year != null && month != null) {
      params = params.set('year', String(year)).set('month', String(month));
    }
    return this.http.get<JourneeMonthResponse>(
      `${environment.apiBaseUrl}/teacher/students/${childId}/sejours`,
      { params },
    );
  }
}
