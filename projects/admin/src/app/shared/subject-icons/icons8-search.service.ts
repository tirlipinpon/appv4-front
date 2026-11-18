import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

const ICONS8_SEARCH = 'https://search.icons8.com/api/iconsets/v4/search';

export interface Icons8Hit {
  /** Stocké en base : icons8:{id} */
  code: string;
  label: string;
}

interface Icons8Icon {
  id?: string | number;
  name?: string;
  commonName?: string;
  free?: boolean;
  platform?: string;
}

interface Icons8SearchResponse {
  icons?: Icons8Icon[];
}

/**
 * Recherche multilangue Icons8 (fr-FR, en-US, …) — pas de traduction locale.
 */
@Injectable({ providedIn: 'root' })
export class Icons8SearchService {
  private readonly http = inject(HttpClient);

  search(query: string, amount = 40): Observable<Icons8Hit[]> {
    const term = query.trim();
    if (term.length < 1) {
      return of([]);
    }
    const params = new HttpParams()
      .set('term', term)
      .set('language', 'fr-FR')
      .set('amount', String(Math.min(Math.max(amount, 10), 50)))
      .set('platform', 'color')
      .set('exact_amount', 'true');
    return this.http.get<Icons8SearchResponse>(ICONS8_SEARCH, { params }).pipe(
      map((body) => {
        const hits: Icons8Hit[] = [];
        for (const icon of body.icons ?? []) {
          const id = icon.id == null ? '' : String(icon.id).trim();
          if (!id || id.length > 64) {
            continue;
          }
          const label = (icon.name || icon.commonName || id).trim();
          hits.push({ code: `icons8:${id}`, label });
        }
        return hits;
      }),
      catchError(() => of([])),
    );
  }
}
