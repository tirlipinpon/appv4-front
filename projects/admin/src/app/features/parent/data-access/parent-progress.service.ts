import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ParentProgressResponse } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Lecture du suivi d'un enfant (ADMIN-83).
 * La page affiche la photo, les jours et les blocs tels que l'API les envoie.
 */
@Injectable({ providedIn: 'root' })
export class ParentProgressService {
  private readonly http = inject(HttpClient);

  read(childId: number): Observable<ParentProgressResponse> {
    return this.http.get<ParentProgressResponse>(
      `${environment.apiBaseUrl}/parent/children/${childId}/progress`,
    );
  }
}
