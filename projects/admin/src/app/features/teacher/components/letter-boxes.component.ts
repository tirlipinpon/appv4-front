import { ChangeDetectionStrategy, Component, ElementRef, Input, output, signal, viewChildren } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * Cases d'une saisie lettre par lettre (SCRUM-182).
 * Le nombre de cases vient du mot enregistré. Valider ne part pas tant qu'une case est vide.
 * Le verdict affiché est celui renvoyé par l'API.
 */
@Component({
  selector: 'app-letter-boxes',
  imports: [MatButtonModule],
  templateUrl: './letter-boxes.component.html',
  styleUrl: './letter-boxes.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LetterBoxesComponent {
  private readonly fields = viewChildren<ElementRef<HTMLInputElement>>('box');

  @Input({ required: true })
  set count(value: number) {
    const size = value > 0 ? value : 0;
    if (size !== this.letters().length) {
      this.letters.set(Array.from({ length: size }, () => ''));
    }
  }

  @Input() message = '';
  @Input() busy = false;

  readonly submitted = output<string>();
  readonly letters = signal<string[]>([]);

  onInput(index: number, event: Event): void {
    const field = event.target as HTMLInputElement;
    if (event instanceof InputEvent && event.isComposing) {
      return;
    }
    const chars = Array.from(field.value);
    const letter = chars.length === 0 ? '' : chars[chars.length - 1];
    this.letters.update((rows) => rows.map((row, i) => (i === index ? letter : row)));
    field.value = letter;
    if (letter !== '' && index + 1 < this.letters().length) {
      this.fields()[index + 1]?.nativeElement.focus();
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key !== 'Backspace' || this.letters()[index] !== '') {
      return;
    }
    if (index === 0) {
      return;
    }
    this.letters.update((rows) => rows.map((row, i) => (i === index - 1 ? '' : row)));
    this.fields()[index - 1]?.nativeElement.focus();
  }

  complete(): boolean {
    const rows = this.letters();
    return rows.length > 0 && rows.every((letter) => letter !== '');
  }

  submit(): void {
    if (!this.complete() || this.busy) {
      return;
    }
    this.submitted.emit(this.letters().join(''));
  }
}
