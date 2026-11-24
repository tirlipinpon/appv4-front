import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { ConnexionResponse, EssaiResponse } from '../../../core/api/api-models';
import { SpaceHeader } from '../../../core/layout/space-header';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { AdminSectionNav } from '../admin-section-nav/admin-section-nav';
import { AiConnectionsService } from './data-access/ai-connections.service';

/**
 * Zone pour ajouter un modèle et l'essayer (ADMIN-82).
 * La page affiche la liste renvoyée. Elle ne réécrit pas le message d'essai.
 */
@Component({
  selector: 'app-ia-page',
  imports: [MatButtonModule, SpaceHeader, AdminSectionNav],
  templateUrl: './ia.page.html',
  styleUrl: './ia.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IaPage implements OnInit {
  private readonly api = inject(AiConnectionsService);

  readonly connections = signal<ConnexionResponse[]>([]);
  readonly provider = signal('');
  readonly model = signal('');
  readonly apiKey = signal('');
  readonly error = signal<string | null>(null);
  readonly trials = signal<Record<number, EssaiResponse>>({});
  readonly loading = signal(true);

  ngOnInit(): void {
    this.reload();
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  create(): void {
    this.error.set(null);
    this.api
      .create({
        provider: this.provider(),
        model: this.model(),
        apiKey: this.apiKey(),
      })
      .subscribe({
        next: () => {
          this.apiKey.set('');
          this.reload();
        },
        error: (err: HttpErrorResponse) => {
          this.error.set(httpErrorMessage(err, "La connexion n'a pas pu être enregistrée."));
        },
      });
  }

  test(connection: ConnexionResponse): void {
    if (connection.id == null) {
      return;
    }
    const id = connection.id;
    this.error.set(null);
    this.api.test(id).subscribe({
      next: (result) => {
        this.trials.update((current) => ({ ...current, [id]: result }));
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "L'essai n'a pas pu partir."));
      },
    });
  }

  trial(id: number | undefined): EssaiResponse | null {
    if (id == null) {
      return null;
    }
    return this.trials()[id] ?? null;
  }

  private reload(): void {
    this.api.list().subscribe({
      next: (connections) => {
        this.connections.set(connections);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Connexions indisponibles.'));
      },
    });
  }
}
