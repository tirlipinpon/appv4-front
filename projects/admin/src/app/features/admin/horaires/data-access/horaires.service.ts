import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { AppHoursRequest, AppHoursResponse } from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/**
 * Horaires de l'app enfant.
 * Le back refuse un compte qui n'est pas admin, et une heure illisible.
 */
@Injectable({ providedIn: 'root' })
export class HorairesService {
  private readonly http = inject(HttpClient);

  read(): Observable<AppHoursResponse> {
    return this.http.get<AppHoursResponse>(`${environment.apiBaseUrl}/admin/app-hours`);
  }

  save(body: AppHoursRequest): Observable<AppHoursResponse> {
    return this.http.put<AppHoursResponse>(`${environment.apiBaseUrl}/admin/app-hours`, body);
  }
}
