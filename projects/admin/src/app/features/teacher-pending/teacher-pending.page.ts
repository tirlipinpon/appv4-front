import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';

import { AuthService } from '../../core/auth/auth.service';
import { landingPath } from '../../core/auth/space-landing';
import { spaceRoleLabel } from '../../core/auth/space-roles';
import { SpaceHeader } from '../../core/layout/space-header';

/**
 * Cible minimale après une inscription avec la case Professeur (SCRUM-122).
 * L'écran d'attente complet (message, statut) reste SCRUM-140.
 */
@Component({
  selector: 'app-teacher-pending-page',
  imports: [RouterLink, MatCardModule, MatButtonModule, SpaceHeader],
  template: `
    <div class="page">
      <app-space-header />
      <main class="content">
        <mat-card class="card">
          <mat-card-header>
            <mat-card-title>Demande en attente</mat-card-title>
            <mat-card-subtitle>Le rôle professeur n'est pas encore ouvert</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>
              Ta demande pour devenir professeur est enregistrée. Un administrateur doit la valider
              avant que l'espace professeur s'ouvre.
            </p>
          </mat-card-content>
          @if (backToSpace(); as back) {
            <mat-card-actions align="end">
              <a mat-flat-button color="primary" [routerLink]="back.path">
                Retour à l'espace {{ back.label }}
              </a>
            </mat-card-actions>
          }
        </mat-card>
      </main>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f7fb;
    }
    .content {
      flex: 1;
      display: grid;
      place-items: center;
      padding: 2rem 1rem;
    }
    .card {
      width: min(100%, 32rem);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherPendingPage {
  private readonly auth = inject(AuthService);

  /** Dernier espace ouvert. Absent tant qu'aucun rôle n'est accordé (on resterait sur cette page). */
  readonly backToSpace = computed(() => {
    const session = this.auth.session();
    if (!session.activeRole) {
      return null;
    }
    return {
      path: landingPath(session),
      label: spaceRoleLabel(session.activeRole),
    };
  });
}
