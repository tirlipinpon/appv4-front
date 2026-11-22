import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type {
  HumeurChoiceItem,
  HumeurChoiceListResponse,
  HumeurChoiceRequest,
} from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/**
 * Bibliothèque des humeurs (ADMIN-68).
 * Le back refuse un choix vide et un jeton qui n'est pas admin.
 */
@Injectable({ providedIn: 'root' })
export class HumeursService {
  private readonly http = inject(HttpClient);

  list(): Observable<HumeurChoiceItem[]> {
    return this.http
      .get<HumeurChoiceListResponse>(`${environment.apiBaseUrl}/admin/humeurs`)
      .pipe(map((body) => body.choices ?? []));
  }

  create(body: HumeurChoiceRequest): Observable<HumeurChoiceItem> {
    return this.http.post<HumeurChoiceItem>(`${environment.apiBaseUrl}/admin/humeurs`, body);
  }

  update(id: number, body: HumeurChoiceRequest): Observable<HumeurChoiceItem> {
    return this.http.put<HumeurChoiceItem>(`${environment.apiBaseUrl}/admin/humeurs/${id}`, body);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${environment.apiBaseUrl}/admin/humeurs/${id}`);
  }
}
