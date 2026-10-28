import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type {
  TeacherProfileResponse,
  TeacherRemovalPreviewResponse,
  UpdateTeacherProfileRequest,
} from '../../../core/api/api-models';
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

  /** Élèves et matières concernés. Sans année, l'aperçu porte sur l'école entière. */
  preview(schoolId: number, grade?: string): Observable<TeacherRemovalPreviewResponse> {
    let params = new HttpParams().set('schoolId', String(schoolId));
    if (grade) {
      params = params.set('grade', grade);
    }
    return this.http.get<TeacherRemovalPreviewResponse>(
      `${environment.apiBaseUrl}/teacher/profile/removal-preview`,
      { params },
    );
  }
}
