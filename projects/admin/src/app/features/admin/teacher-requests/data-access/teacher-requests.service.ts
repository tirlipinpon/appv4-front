import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { TeacherRequestItem, TeacherRequestListResponse } from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/** Liste bornée : le GET n'a que `limit` (plafond back = 100), pas de page suivante. */
export interface TeacherRequestList {
  requests: TeacherRequestItem[];
  truncated: boolean;
}

/**
 * File de modération (SCRUM-143). Le back refuse si le jeton n'est pas admin.
 * `truncated` reste dans la réponse : monter la limite ne donne pas le reste de la file.
 */
@Injectable({ providedIn: 'root' })
export class TeacherRequestsService {
  private readonly http = inject(HttpClient);

  list(): Observable<TeacherRequestList> {
    return this.http
      .get<TeacherRequestListResponse>(`${environment.apiBaseUrl}/admin/teacher-requests`, {
        params: { limit: '100' },
      })
      .pipe(
        map((body) => ({
          requests: body.requests ?? [],
          truncated: body.truncated === true,
        })),
      );
  }

  approve(id: number): Observable<TeacherRequestItem> {
    return this.http.post<TeacherRequestItem>(
      `${environment.apiBaseUrl}/admin/teacher-requests/${id}/approve`,
      {},
    );
  }

  revoke(id: number): Observable<TeacherRequestItem> {
    return this.http.post<TeacherRequestItem>(
      `${environment.apiBaseUrl}/admin/teacher-requests/${id}/revoke`,
      {},
    );
  }
}
