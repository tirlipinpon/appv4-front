import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface SchoolOption {
  id: number;
  name: string;
  country: string;
  grades: string[];
}

export interface SchoolPage {
  schools: SchoolOption[];
  nextCursor: number | null;
}

@Injectable({ providedIn: 'root' })
export class SchoolCatalogService {
  private readonly http = inject(HttpClient);

  search(country: string, query: string, afterId = 0): Observable<SchoolPage> {
    return this.http.get<SchoolPage>(`${environment.apiBaseUrl}/schools`, {
      params: { country, query, afterId },
    });
  }
}
