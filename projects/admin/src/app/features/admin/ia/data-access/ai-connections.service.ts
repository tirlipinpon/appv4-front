import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  CatalogueResponse,
  ConnexionListResponse,
  ConnexionResponse,
  CreateConnexionRequest,
  EssaiResponse,
} from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/**
 * Connexions de modèles (ADMIN-82).
 * La clé part à la création et n'est pas relue.
 */
@Injectable({ providedIn: 'root' })
export class AiConnectionsService {
  private readonly http = inject(HttpClient);

  list(): Observable<ConnexionResponse[]> {
    return this.http
      .get<ConnexionListResponse>(`${environment.apiBaseUrl}/admin/ai/connections`)
      .pipe(map((body) => body.connections ?? []));
  }

  catalog(): Observable<CatalogueResponse> {
    return this.http.get<CatalogueResponse>(`${environment.apiBaseUrl}/admin/ai/catalog`);
  }

  create(body: CreateConnexionRequest): Observable<ConnexionResponse> {
    return this.http.post<ConnexionResponse>(`${environment.apiBaseUrl}/admin/ai/connections`, body);
  }

  test(id: number): Observable<EssaiResponse> {
    return this.http.post<EssaiResponse>(`${environment.apiBaseUrl}/admin/ai/connections/${id}/test`, null);
  }
}
