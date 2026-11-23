import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { HumeurChoiceItem } from '../../../core/api/api-models';
import { SpaceHeader } from '../../../core/layout/space-header';
import { httpErrorMessage } from '../../../shared/http-error-message/http-error-message';
import { HumeursService } from './data-access/humeurs.service';

/**
 * Bibliothèque des humeurs (ADMIN-68).
 * L'écran montre la relecture. Il n'ajoute ni icône ni mot.
 */
@Component({
  selector: 'app-humeurs-page',
  imports: [MatButtonModule, SpaceHeader],
  templateUrl: './humeurs.page.html',
  styleUrl: './humeurs.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HumeursPage implements OnInit {
  private readonly api = inject(HumeursService);

  readonly choices = signal<HumeurChoiceItem[]>([]);
  readonly icon = signal('');
  readonly word = signal('');
  readonly editingId = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.reload();
  }

  edit(choice: HumeurChoiceItem): void {
    this.editingId.set(choice.id ?? null);
    this.icon.set(choice.icon ?? '');
    this.word.set(choice.word ?? '');
    this.error.set(null);
  }

  save(): void {
    const body = {
      icon: this.blank(this.icon()),
      word: this.blank(this.word()),
    };
    const id = this.editingId();
    const call = id == null ? this.api.create(body) : this.api.update(id, body);
    this.error.set(null);
    call.subscribe({
      next: () => {
        this.icon.set('');
        this.word.set('');
        this.editingId.set(null);
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "Le choix n'a pas pu être enregistré."));
      },
    });
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  remove(choice: HumeurChoiceItem): void {
    if (choice.id == null) {
      return;
    }
    this.error.set(null);
    this.api.remove(choice.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.error.set(httpErrorMessage(err, "Le choix n'a pas pu être retiré."));
      },
    });
  }

  private reload(): void {
    this.api.list().subscribe({
      next: (choices) => {
        this.choices.set(choices);
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Bibliothèque indisponible.'));
      },
    });
  }

  private blank(value: string): string | undefined {
    const trimmed = value.trim();
    return trimmed.length === 0 ? undefined : trimmed;
  }
}
