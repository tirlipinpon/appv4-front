import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  ChangeResponse,
  ChangesResponse,
  CreateRouteRequest,
  RouteResponse,
  RoutesResponse,
  UsageResponse,
} from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/**
 * Besoins, consommation et historique (ADMIN-49).
 * La page affiche la lecture. Elle ne calcule pas le jour ni les totaux.
 */
@Injectable({ providedIn: 'root' })
export class AiRoutesService {
  private readonly http = inject(HttpClient);

  list(): Observable<RoutesResponse> {
    return this.http.get<RoutesResponse>(`${environment.apiBaseUrl}/admin/ai/routes`);
  }

  create(body: CreateRouteRequest): Observable<RouteResponse> {
    return this.http.post<RouteResponse>(`${environment.apiBaseUrl}/admin/ai/routes`, body);
  }

  change(code: string, provider: string, model: string): Observable<RouteResponse> {
    return this.http.put<RouteResponse>(`${environment.apiBaseUrl}/admin/ai/routes/${code}`, { provider, model });
  }

  active(code: string, actif: boolean): Observable<RouteResponse> {
    return this.http.put<RouteResponse>(`${environment.apiBaseUrl}/admin/ai/routes/${code}/active`, { active: actif });
  }

  usage(from: string, to: string): Observable<UsageResponse> {
    let params = new HttpParams();
    if (from.length > 0) {
      params = params.set('from', from);
    }
    if (to.length > 0) {
      params = params.set('to', to);
    }
    return this.http.get<UsageResponse>(`${environment.apiBaseUrl}/admin/ai/usage`, { params });
  }

  changes(): Observable<ChangeResponse[]> {
    return this.http
      .get<ChangesResponse>(`${environment.apiBaseUrl}/admin/ai/route-changes`)
      .pipe(map((body) => body.changes ?? []));
  }
}
