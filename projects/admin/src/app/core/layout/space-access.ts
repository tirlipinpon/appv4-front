import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

import type { SpaceAccessResponse } from '../api/api-models';
import { AuthService } from '../auth/auth.service';
import { landingPath } from '../auth/space-landing';
import { SpaceAccessService } from '../auth/space-access.service';
import { SpaceRoles } from '../auth/space-roles';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';

/**
 * Boutons d'en-tête pour l'espace qui manque encore (SCRUM-152).
 * À côté du changement d'espace : celui-là ne crée pas de rôle.
 */
@Component({
  selector: 'app-space-access',
  imports: [MatButtonModule],
  templateUrl: './space-access.html',
  styleUrl: './space-access.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpaceAccess implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly spaces = inject(SpaceAccessService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly access = signal<SpaceAccessResponse | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Pas encore parent : on peut l'ouvrir tout de suite. */
  readonly showOpenParent = computed(() => {
    const current = this.access();
    if (!current) {
      return false;
    }
    return !this.hasRole(current, SpaceRoles.parent);
  });

  /** Parent sans rôle teacher et sans demande en cours. */
  readonly showRequestTeacher = computed(() => {
    const current = this.access();
    if (!current) {
      return false;
    }
    return (
      this.hasRole(current, SpaceRoles.parent) &&
      !this.hasRole(current, SpaceRoles.teacher) &&
      current.teacherRequest !== 'pending'
    );
  });

  /** La demande existe déjà : on y retourne, sans second POST. */
  readonly showViewRequest = computed(() => {
    const current = this.access();
    if (!current || this.router.url.startsWith('/teacher-pending')) {
      return false;
    }
    return (
      this.hasRole(current, SpaceRoles.parent) &&
      !this.hasRole(current, SpaceRoles.teacher) &&
      current.teacherRequest === 'pending'
    );
  });

  ngOnInit(): void {
    this.spaces
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (access) => this.access.set(access),
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  openParent(): void {
    this.loading.set(true);
    this.error.set(null);
    this.spaces
      .openParent()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: () => {
        this.loading.set(false);
        void this.router.navigateByUrl(landingPath(this.auth.session()));
      },
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  requestTeacher(): void {
    this.loading.set(true);
    this.error.set(null);
    this.spaces
      .requestTeacher()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (access) => {
        this.access.set(access);
        this.loading.set(false);
        void this.router.navigateByUrl('/teacher-pending');
      },
      error: (err: HttpErrorResponse) => this.fail(err),
    });
  }

  viewRequest(): void {
    void this.router.navigateByUrl('/teacher-pending');
  }

  private hasRole(current: SpaceAccessResponse, role: string): boolean {
    return (current.roles ?? []).includes(role);
  }

  private fail(err: HttpErrorResponse): void {
    this.loading.set(false);
    this.error.set(httpErrorMessage(err, 'Action impossible pour le moment.'));
  }
}
