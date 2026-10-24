import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import type { TeacherRequestItem, TeacherRequestListResponse } from '../../../../core/api/api-models';
import { environment } from '../../../../../environments/environment';

/**
 * File de modération (SCRUM-143). Le back refuse si le jeton n'est pas admin.
 */
@Injectable({ providedIn: 'root' })
export class TeacherRequestsService {
  private readonly http = inject(HttpClient);

  list(): Observable<TeacherRequestItem[]> {
    return this.http
      .get<TeacherRequestListResponse>(`${environment.apiBaseUrl}/admin/teacher-requests`, {
        params: { limit: '100' },
      })
      .pipe(map((body) => body.requests ?? []));
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
