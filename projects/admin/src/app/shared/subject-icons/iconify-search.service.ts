import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { iconSearchQuery } from './fr-icon-query';
import { subjectIconLabel } from './subject-icons';

const ICONIFY_SEARCH = 'https://api.iconify.design/search';

/** Jeux colorés d'abord (mieux pour l'enfant), puis outlines. */
const PREFERRED_PREFIX = [
  'fluent-emoji',
  'noto',
  'twemoji',
  'emojione',
  'openmoji',
  'fxemoji',
  'mdi',
  'material-symbols',
];

export interface IconifyHit {
  code: string;
  label: string;
}

interface IconifySearchResponse {
  icons?: string[];
}

/**
 * Recherche Iconify (API publique, index **anglais uniquement**).
 * On traduit la saisie FR → EN avant l'appel.
 */
@Injectable({ providedIn: 'root' })
export class IconifySearchService {
  private readonly http = inject(HttpClient);

  search(query: string, limit = 48): Observable<IconifyHit[]> {
    const english = iconSearchQuery(query);
    if (!english) {
      return of([]);
    }
    const params = new HttpParams()
      .set('query', english)
      .set('limit', String(Math.max(32, Math.min(limit, 64))));
    return this.http.get<IconifySearchResponse>(ICONIFY_SEARCH, { params }).pipe(
      map((body) => {
        const codes = (body.icons ?? []).filter(
          (code) => typeof code === 'string' && code.includes(':') && code.length <= 128,
        );
        return sortPreferred(codes).map((code) => ({
          code,
          label: subjectIconLabel(code),
        }));
      }),
      catchError(() => of([])),
    );
  }
}

function sortPreferred(codes: string[]): string[] {
  return [...codes].sort((a, b) => prefixRank(a) - prefixRank(b));
}

function prefixRank(code: string): number {
  const prefix = code.slice(0, code.indexOf(':'));
  const idx = PREFERRED_PREFIX.indexOf(prefix);
  return idx === -1 ? PREFERRED_PREFIX.length : idx;
}
