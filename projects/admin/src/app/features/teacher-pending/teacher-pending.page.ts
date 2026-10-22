import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

/**
 * Cible minimale après une inscription avec la case Professeur (SCRUM-122).
 * L'écran d'attente complet (message, statut) reste SCRUM-140.
 */
@Component({
  selector: 'app-teacher-pending-page',
  imports: [RouterLink, MatToolbarModule, MatCardModule, MatButtonModule],
  template: `
    <div class="page">
      <mat-toolbar color="primary">
        <span>appv4 · admin · professeur</span>
      </mat-toolbar>
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
          <mat-card-actions align="end">
            <a mat-flat-button color="primary" routerLink="/">Aller à l'accueil</a>
          </mat-card-actions>
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
export class TeacherPendingPage {}
