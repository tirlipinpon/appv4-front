import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';

/**
 * Stub recovery email (cible du lien SCRUM-109).
 * Parcours métier complet = tickets ultérieurs.
 */
@Component({
  selector: 'app-account-recovery-page',
  imports: [RouterLink, MatToolbarModule, MatCardModule, MatButtonModule],
  template: `
    <div class="page">
      <mat-toolbar color="primary">
        <span>appv4 · admin · récupération</span>
      </mat-toolbar>
      <main class="content">
        <mat-card class="card">
          <mat-card-header>
            <mat-card-title>Je ne me souviens plus de mon email</mat-card-title>
            <mat-card-subtitle>Parcours à venir</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>Cette aide n’est pas encore disponible. Reviens à la connexion ou contacte le support.</p>
          </mat-card-content>
          <mat-card-actions align="end">
            <a mat-button routerLink="/forgot-password">Mot de passe oublié</a>
            <a mat-flat-button color="primary" routerLink="/login">Retour à la connexion</a>
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
export class AccountRecoveryPage {}
