import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { TeacherRequestItem } from '../../../core/api/api-models';
import { SpaceHeader } from '../../../core/layout/space-header';
import { TeacherRequestsService } from './data-access/teacher-requests.service';

/**
 * File des demandes professeur (SCRUM-143).
 * Seul le rôle admin arrive ici.
 * Révoquer sort de Déjà traitées. Re-valider, dans Révoquées, y ramène.
 */
@Component({
  selector: 'app-teacher-requests-page',
  imports: [MatButtonModule, SpaceHeader],
  templateUrl: './teacher-requests.page.html',
  styleUrl: './teacher-requests.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherRequestsPage implements OnInit {
  private readonly api = inject(TeacherRequestsService);

  readonly requests = signal<TeacherRequestItem[]>([]);
  readonly pending = computed(() => this.requests().filter((item) => item.status === 'pending'));
  readonly approved = computed(() => this.requests().filter((item) => item.status === 'approved'));
  readonly revoked = computed(() => this.requests().filter((item) => item.status === 'revoked'));
  readonly approvingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  approve(item: TeacherRequestItem): void {
    this.change(item, this.api.approve(item.id!));
  }

  revoke(item: TeacherRequestItem): void {
    this.change(item, this.api.revoke(item.id!));
  }

  validatedOn(item: TeacherRequestItem): string {
    return `Validée le ${this.when(item.reviewedAt)}`;
  }

  revokedOn(item: TeacherRequestItem): string {
    return `Révoquée le ${this.when(item.revokedAt)}`;
  }

  private change(item: TeacherRequestItem, call: ReturnType<TeacherRequestsService['approve']>): void {
    if (item.id == null || this.approvingId() != null) {
      return;
    }
    this.error.set(null);
    this.approvingId.set(item.id);
    call.subscribe({
      next: () => this.load(),
      error: (err: HttpErrorResponse) => {
        this.approvingId.set(null);
        this.error.set(this.extractMessage(err));
      },
    });
  }

  age(createdAt: string | undefined): string {
    return requestAgeLabel(createdAt);
  }

  when(value: string | undefined): string {
    return requestDateLabel(value);
  }

  private load(): void {
    this.api.list().subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.approvingId.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.approvingId.set(null);
        this.error.set(this.extractMessage(err));
      },
    });
  }

  private extractMessage(err: HttpErrorResponse): string {
    const message = (err.error as { message?: string } | null)?.message;
    return message || 'Impossible de charger les demandes.';
  }
}

/** Date lisible : demande (`createdAt`) ou validation (`reviewedAt`). */
export function requestDateLabel(value: string | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

/** Ancienneté affichée à côté de l'email. */
export function requestAgeLabel(createdAt: string | undefined, now = Date.now()): string {
  if (!createdAt) {
    return '';
  }
  const elapsed = now - new Date(createdAt).getTime();
  if (Number.isNaN(elapsed) || elapsed < 60_000) {
    return 'à l’instant';
  }
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 60) {
    return `depuis ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 48) {
    return `depuis ${hours} h`;
  }
  return `depuis ${Math.floor(hours / 24)} j`;
}
