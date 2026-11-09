import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ParentProfileResponse, UpdateParentProfileRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Fiche du parent connecté (SCRUM-200).
 * L'écriture en base reste côté API : ce service envoie le formulaire.
 */
@Injectable({ providedIn: 'root' })
export class ParentProfileService {
  private readonly http = inject(HttpClient);

  load(): Observable<ParentProfileResponse> {
    return this.http.get<ParentProfileResponse>(`${environment.apiBaseUrl}/parent/profile`);
  }

  save(body: UpdateParentProfileRequest): Observable<ParentProfileResponse> {
    return this.http.put<ParentProfileResponse>(`${environment.apiBaseUrl}/parent/profile`, body);
  }
}
