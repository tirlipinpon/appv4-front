import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { subjectIconLabel } from './subject-icons';

const ICONIFY_SEARCH = 'https://api.iconify.design/search';

export interface IconifyHit {
  code: string;
  label: string;
}

interface IconifySearchResponse {
  icons?: string[];
}

/**
 * Recherche d'icônes via l'API publique Iconify (pas de clé, ~200 jeux / 200k+ icônes).
 * Le back valide ensuite le code stocké (`prefix:name`).
 */
@Injectable({ providedIn: 'root' })
export class IconifySearchService {
  private readonly http = inject(HttpClient);

  search(query: string, limit = 48): Observable<IconifyHit[]> {
    const q = query.trim();
    if (q.length < 1) {
      return of([]);
    }
    const params = new HttpParams()
      .set('query', q)
      .set('limit', String(Math.max(32, Math.min(limit, 64))));
    return this.http.get<IconifySearchResponse>(ICONIFY_SEARCH, { params }).pipe(
      map((body) =>
        (body.icons ?? [])
          .filter((code) => typeof code === 'string' && code.includes(':') && code.length <= 128)
          .map((code) => ({ code, label: subjectIconLabel(code) })),
      ),
      catchError(() => of([])),
    );
  }
}
