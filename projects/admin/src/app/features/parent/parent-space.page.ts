import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';

import { AuthService } from '../../core/auth/auth.service';
import { RoleSwitch } from '../../core/layout/role-switch';

/**
 * Adresse de l'espace parent (SCRUM-128).
 * Le tableau de bord titré reste SCRUM-131. Ici la page peut rester vide.
 */
@Component({
  selector: 'app-parent-space-page',
  imports: [MatToolbarModule, MatButtonModule, RoleSwitch],
  template: `
    <div class="page">
      <mat-toolbar color="primary">
        <span>appv4 · admin</span>
        <span class="spacer"></span>
        <app-role-switch />
        <button mat-button type="button" (click)="logout()">Déconnexion</button>
      </mat-toolbar>
    </div>
  `,
  styles: `
    .page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      background: #f5f7fb;
    }
    .spacer {
      flex: 1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSpacePage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
