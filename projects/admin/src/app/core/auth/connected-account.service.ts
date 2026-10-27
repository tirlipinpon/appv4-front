import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { ConnectedAccountResponse } from '../api/api-models';

/**
 * Nom du compte connecté, pour le bandeau.
 * Le JWT ne le porte pas : on le relit, y compris après un changement de profil.
 */
@Injectable({ providedIn: 'root' })
export class ConnectedAccountService {
  private readonly http = inject(HttpClient);
  private generation = 0;

  readonly displayName = signal('');

  load(): Observable<void> {
    const ticket = ++this.generation;
    return this.http.get<ConnectedAccountResponse>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((body) => {
        if (ticket === this.generation && typeof body.displayName === 'string') {
          this.displayName.set(body.displayName);
        }
      }),
      map(() => undefined),
    );
  }

  /** Le profil vient d'enregistrer ce nom : le bandeau le prend sans second appel. */
  remember(name: string): void {
    this.generation += 1;
    this.displayName.set(name);
  }
}
