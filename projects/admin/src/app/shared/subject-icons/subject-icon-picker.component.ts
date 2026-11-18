import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';

import type { AvatarChoice } from '../../core/api/api-models';
import { Icons8Hit, Icons8SearchService } from './icons8-search.service';
import { SubjectIconViewComponent } from './subject-icon-view.component';
import { subjectIconLabel } from './subject-icons';

/**
 * Champ unique : recherche Icons8 (FR) → dropdown nom + icône.
 */
@Component({
  selector: 'app-subject-icon-picker',
  imports: [MatFormFieldModule, MatInputModule, SubjectIconViewComponent],
  templateUrl: './subject-icon-picker.component.html',
  styleUrl: './subject-icon-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectIconPickerComponent implements OnInit {
  private readonly icons8 = inject(Icons8SearchService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly queries = new Subject<string>();

  readonly choices = input<readonly AvatarChoice[]>([]);
  readonly value = input<string>('');
  readonly disabled = input(false);
  readonly testId = input('subject-icon-picker');
  readonly label = input('Icône');

  readonly valueChange = output<string>();

  readonly query = signal('');
  readonly open = signal(false);
  readonly hits = signal<Icons8Hit[]>([]);
  readonly searching = signal(false);

  constructor() {
    effect(() => {
      const selected = this.value();
      if (selected && !this.query()) {
        this.query.set(subjectIconLabel(selected));
      }
    });
  }

  ngOnInit(): void {
    this.queries
      .pipe(
        debounceTime(280),
        distinctUntilChanged(),
        switchMap((q) => {
          const text = q.trim();
          if (text.length < 2) {
            this.searching.set(false);
            return of(this.seedHits());
          }
          this.searching.set(true);
          return this.icons8.search(text);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (rows) => {
          this.searching.set(false);
          this.hits.set(rows);
        },
      });
  }

  onFocus(): void {
    this.open.set(true);
    if (this.hits().length === 0) {
      this.hits.set(this.seedHits());
    }
  }

  onBlur(): void {
    window.setTimeout(() => this.open.set(false), 150);
  }

  onQuery(raw: string): void {
    this.query.set(raw);
    this.open.set(true);
    this.queries.next(raw);
  }

  pick(hit: Icons8Hit): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit(hit.code);
    this.query.set(hit.label);
    this.open.set(false);
  }

  clear(): void {
    if (this.disabled()) {
      return;
    }
    this.valueChange.emit('');
    this.query.set('');
    this.hits.set(this.seedHits());
    this.open.set(true);
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  private seedHits(): Icons8Hit[] {
    return this.choices()
      .filter((c) => !!c.code)
      .map((c) => ({
        code: c.code as string,
        label: c.label || subjectIconLabel(c.code),
      }));
  }
}
