import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import { SpaceHeader } from '../../../core/layout/space-header';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { HorairesService } from './data-access/horaires.service';

/**
 * Heure de début et heure de fin de l'app enfant.
 * L'écran montre la relecture. Il n'invente ni heure ni phrase.
 */
@Component({
  selector: 'app-horaires-page',
  imports: [MatButtonModule, SpaceHeader],
  templateUrl: './horaires.page.html',
  styleUrl: './horaires.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HorairesPage implements OnInit {
  private readonly api = inject(HorairesService);

  readonly opensAt = signal('');
  readonly closesAt = signal('');
  readonly closedMessage = signal('');
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.reload();
  }

  save(): void {
    this.error.set(null);
    this.api.save({ opensAt: this.opensAt(), closesAt: this.closesAt() }).subscribe({
      next: (body) => {
        this.opensAt.set(body.opensAt);
        this.closesAt.set(body.closesAt);
        this.closedMessage.set(body.closedMessage);
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "Les horaires n'ont pas pu être enregistrés."));
      },
    });
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  private reload(): void {
    this.loading.set(true);
    this.api.read().subscribe({
      next: (body) => {
        this.opensAt.set(body.opensAt);
        this.closesAt.set(body.closesAt);
        this.closedMessage.set(body.closedMessage);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, "Les horaires n'ont pas pu être lus."));
      },
    });
  }
}
