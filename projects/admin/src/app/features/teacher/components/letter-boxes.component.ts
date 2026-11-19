import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Input,
  computed,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

/**
 * Cases d'une saisie lettre par lettre (SCRUM-182).
 * Les espaces du mot sont affichés comme un saut (non tapés).
 * Une lettre juste passe en vert et se verrouille.
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

  private expected = '';

  @Input({ required: true })
  set expectedAnswer(value: string) {
    this.expected = value ?? '';
    const mask = maskOf(this.expected);
    this.mask.set(mask);
    this.letters.set(mask === '' ? [] : [...mask].map((ch) => (ch === ' ' ? ' ' : '')));
    this.locked.set(mask === '' ? [] : [...mask].map((ch) => ch === ' '));
    this.wrong.set(mask === '' ? [] : [...mask].map(() => false));
  }

  /** @deprecated préférer expectedAnswer ; gardé pour les anciens appels count-only. */
  @Input()
  set count(value: number) {
    if (this.expected !== '') {
      return;
    }
    const size = value > 0 ? value : 0;
    const mask = '#'.repeat(size);
    this.mask.set(mask);
    this.letters.set(size > 0 ? Array.from({ length: size }, () => '') : []);
    this.locked.set(size > 0 ? Array.from({ length: size }, () => false) : []);
    this.wrong.set(size > 0 ? Array.from({ length: size }, () => false) : []);
  }

  @Input() message = '';
  @Input() busy = false;

  readonly submitted = output<string>();
  readonly letters = signal<string[]>([]);
  readonly locked = signal<boolean[]>([]);
  readonly wrong = signal<boolean[]>([]);
  private readonly mask = signal('');
  readonly words = computed(() => wordGroups(this.mask()));

  isSpace(index: number): boolean {
    return this.mask()[index] === ' ';
  }

  onInput(index: number, event: Event): void {
    if (this.locked()[index] || this.isSpace(index)) {
      return;
    }
    const field = event.target as HTMLInputElement;
    if (event instanceof InputEvent && event.isComposing) {
      return;
    }
    const chars = Array.from(field.value);
    const letter = chars.length === 0 ? '' : chars[chars.length - 1];
    this.letters.update((rows) => rows.map((row, i) => (i === index ? letter : row)));
    field.value = letter;
    this.clearWrongs();
    this.refreshLocks();
    if (letter !== '') {
      const next = this.nextEditable(index);
      if (next !== null) {
        this.focusSlot(next);
      }
    }
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (this.locked()[index] || this.isSpace(index)) {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Backspace' || this.letters()[index] !== '') {
      return;
    }
    const prev = this.prevEditable(index);
    if (prev === null) {
      return;
    }
    event.preventDefault();
    this.letters.update((rows) => rows.map((row, i) => (i === prev ? '' : row)));
    this.clearWrongs();
    this.refreshLocks();
    this.focusSlot(prev);
  }

  complete(): boolean {
    const rows = this.letters();
    return rows.length > 0 && rows.every((letter, index) => this.isSpace(index) || letter !== '');
  }

  submit(): void {
    if (!this.complete() || this.busy) {
      return;
    }
    this.refreshLocks();
    const attempt = this.letters().join('');
    const accepted =
      this.expected !== '' && attempt.trim().toLowerCase() === this.expected.trim().toLowerCase();
    this.markWrongs(!accepted);
    this.submitted.emit(attempt);
  }

  private refreshLocks(): void {
    if (this.expected === '') {
      return;
    }
    const rows = this.letters();
    this.locked.set(
      [...this.expected].map((expCh, index) => {
        if (/\s/.test(expCh)) {
          return true;
        }
        const typed = rows[index] ?? '';
        return typed !== '' && typed.toLowerCase() === expCh.toLowerCase();
      }),
    );
  }

  private markWrongs(show: boolean): void {
    const mask = this.mask();
    if (!show || mask === '') {
      this.wrong.set(mask === '' ? [] : [...mask].map(() => false));
      return;
    }
    const locks = this.locked();
    const rows = this.letters();
    this.wrong.set(
      [...mask].map((ch, index) => ch !== ' ' && rows[index] !== '' && locks[index] !== true),
    );
  }

  private clearWrongs(): void {
    const mask = this.mask();
    this.wrong.set(mask === '' ? [] : [...mask].map(() => false));
  }

  private nextEditable(from: number): number | null {
    const rows = this.letters();
    for (let i = from + 1; i < rows.length; i++) {
      if (!this.isSpace(i) && !this.locked()[i]) {
        return i;
      }
    }
    return null;
  }

  private prevEditable(from: number): number | null {
    for (let i = from - 1; i >= 0; i--) {
      if (!this.isSpace(i) && !this.locked()[i]) {
        return i;
      }
    }
    return null;
  }

  private focusSlot(slotIndex: number): void {
    let inputIndex = 0;
    for (let i = 0; i < slotIndex; i++) {
      if (!this.isSpace(i)) {
        inputIndex += 1;
      }
    }
    this.fields()[inputIndex]?.nativeElement.focus();
  }
}

function maskOf(expected: string): string {
  return [...expected].map((ch) => (/\s/.test(ch) ? ' ' : '#')).join('');
}

function wordGroups(mask: string): { start: number; indexes: number[] }[] {
  const words: { start: number; indexes: number[] }[] = [];
  let indexes: number[] = [];
  let start = 0;
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === ' ') {
      if (indexes.length > 0) {
        words.push({ start, indexes });
        indexes = [];
      }
      continue;
    }
    if (indexes.length === 0) {
      start = i;
    }
    indexes.push(i);
  }
  if (indexes.length > 0) {
    words.push({ start, indexes });
  }
  return words;
}
