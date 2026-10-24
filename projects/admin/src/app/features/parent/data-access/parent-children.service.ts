import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  CreateParentChildRequest,
  ParentChildResponse,
  ParentChildrenResponse,
} from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Enfants du parent connecté (SCRUM-156).
 * Le front envoie le formulaire. La base est écrite par l'API.
 */
@Injectable({ providedIn: 'root' })
export class ParentChildrenService {
  private readonly http = inject(HttpClient);

  load(): Observable<ParentChildrenResponse> {
    return this.http.get<ParentChildrenResponse>(`${environment.apiBaseUrl}/parent/children`);
  }

  add(body: CreateParentChildRequest): Observable<ParentChildResponse> {
    return this.http.post<ParentChildResponse>(`${environment.apiBaseUrl}/parent/children`, body);
  }

  photo(id: number): Observable<Blob> {
    return this.http.get(`${environment.apiBaseUrl}/parent/children/${id}/photo`, {
      responseType: 'blob',
    });
  }
}
