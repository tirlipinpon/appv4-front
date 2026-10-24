import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { TeacherProfileResponse, UpdateTeacherProfileRequest } from '../../../core/api/api-models';
import { environment } from '../../../../environments/environment';

/**
 * Profil du professeur connecté (SCRUM-159).
 * L'écriture en base reste côté API : ce service ne fait qu'envoyer le formulaire.
 */
@Injectable({ providedIn: 'root' })
export class TeacherProfileService {
  private readonly http = inject(HttpClient);

  load(): Observable<TeacherProfileResponse> {
    return this.http.get<TeacherProfileResponse>(`${environment.apiBaseUrl}/teacher/profile`);
  }

  save(body: UpdateTeacherProfileRequest): Observable<TeacherProfileResponse> {
    return this.http.put<TeacherProfileResponse>(`${environment.apiBaseUrl}/teacher/profile`, body);
  }
}
