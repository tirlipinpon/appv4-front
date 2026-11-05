import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { ConnectedAccountResponse } from '../api/api-models';

/**
 * Nom du compte connecté, pour le bandeau.
 * Le JWT ne le porte pas : on le relit, y compris après un changement de profil.
 * À la déconnexion / nouveau jeton, {@link clear} vide immédiatement l'affichage.
 */
@Injectable({ providedIn: 'root' })
export class ConnectedAccountService {
  private readonly http = inject(HttpClient);
  private generation = 0;
  /** Change à chaque clear : ignore remember/load d'une session précédente. */
  private epoch = 0;

  readonly displayName = signal('');
  readonly avatarCode = signal<string | null>(null);

  /** À capturer avant une sauvegarde profil pour ignorer une réponse tardive. */
  bannerEpoch(): number {
    return this.epoch;
  }

  /** Vide le bandeau (logout ou nouveau jeton). */
  clear(): void {
    this.epoch += 1;
    this.generation += 1;
    this.displayName.set('');
    this.avatarCode.set(null);
  }

  load(): Observable<void> {
    const ticket = ++this.generation;
    const session = this.epoch;
    return this.http.get<ConnectedAccountResponse>(`${environment.apiBaseUrl}/auth/me`).pipe(
      tap((body) => {
        if (ticket !== this.generation || session !== this.epoch) {
          return;
        }
        if (typeof body.displayName === 'string') {
          this.displayName.set(body.displayName);
        }
        this.avatarCode.set(body.avatarCode?.trim() ? body.avatarCode.trim() : null);
      }),
      map(() => undefined),
    );
  }

  /**
   * Le profil vient d'enregistrer ce nom. Le bandeau le prend sans second appel.
   * Sans avatar en argument, le dessin déjà affiché reste.
   * {@code epoch} : ignore si la session bandeau a changé entre-temps.
   */
  remember(name: string, avatarCode?: string | null, epoch?: number): void {
    if (epoch != null && epoch !== this.epoch) {
      return;
    }
    this.generation += 1;
    this.displayName.set(name);
    if (avatarCode !== undefined) {
      this.avatarCode.set(avatarCode?.trim() ? avatarCode.trim() : null);
    }
  }
}
