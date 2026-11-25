/**
 * THROWAWAY PROTOTYPE. Six parent cases, three layouts, ?variant= on
 * /parent/classement-prototype. Not the fiche, not saved.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { SpaceHeader } from '../../core/layout/space-header';
import { PrototypeChoice, PrototypeSwitcher } from './classement-prototype-switcher';

interface CaseRow {
  key: string;
  label: string;
  sentence: string;
}

const CASES: readonly CaseRow[] = [
  { key: 'classe', label: 'Ma classe', sentence: 'Akira apparaît dans sa classe' },
  { key: 'annee', label: 'Mon année', sentence: 'Akira apparaît dans son année' },
  { key: 'pays', label: 'Mon pays', sentence: 'Akira apparaît dans son pays' },
  { key: 'tous', label: 'Tout le monde', sentence: 'Akira apparaît parmi tout le monde' },
  { key: 'age', label: 'Mon âge', sentence: 'Akira apparaît avec les enfants de son âge' },
  { key: 'amitie', label: 'Amitié', sentence: 'Amitié est gardée pour plus tard' },
];

const CHOICES: readonly PrototypeChoice[] = [
  { key: 'tuiles', name: 'Tuiles' },
  { key: 'liste', name: 'Liste' },
  { key: 'phrases', name: 'Phrases' },
];

@Component({
  selector: 'app-classement-prototype-page',
  imports: [SpaceHeader, PrototypeSwitcher],
  template: `
    <app-space-header />
    <main class="page">
      <p class="who">Akira · 🐻</p>
      @switch (variant()) {
        @case ('liste') {
          <ul class="list">
            @for (row of cases; track row.key) {
              <li>
                <span>{{ row.label }}</span>
                <button type="button" [class.on]="on(row.key)" (click)="toggle(row.key)">
                  {{ on(row.key) ? 'Oui' : 'Non' }}
                </button>
              </li>
            }
          </ul>
        }
        @case ('phrases') {
          <div class="sentences">
            @for (row of cases; track row.key) {
              <button type="button" [class.on]="on(row.key)" (click)="toggle(row.key)">
                <span>{{ on(row.key) ? '✓' : '' }}</span>
                {{ row.sentence }}
              </button>
            }
          </div>
        }
        @default {
          <div class="tiles">
            @for (row of cases; track row.key) {
              <button type="button" [class.on]="on(row.key)" (click)="toggle(row.key)">
                {{ row.label }}
                <small>{{ on(row.key) ? 'visible' : 'caché' }}</small>
              </button>
            }
          </div>
        }
      }
    </main>
    <app-prototype-switcher
      [choices]="choices"
      [current]="variant()"
      [state]="stateLine()"
      (step)="move($event)"
    />
  `,
  styles: `
    .page { padding: 16px 16px 9rem; }
    .who { font-size: 1.4rem; font-weight: 800; }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .tiles button, .sentences button, .list button {
      border: 0;
      border-radius: 16px;
      background: #ece8ff;
      font: inherit;
      font-weight: 800;
      cursor: pointer;
    }
    .tiles button { min-height: 6rem; display: grid; }
    .tiles button.on, .sentences button.on, .list button.on { background: #6d5efc; color: #fff; }
    .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .list li { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .sentences { display: grid; gap: 8px; }
    .sentences button { text-align: left; padding: 14px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClassementPrototypePage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly choices = CHOICES;
  protected readonly cases = CASES;
  protected readonly flags = signal<Record<string, boolean>>({
    classe: true,
    annee: true,
    pays: true,
    tous: true,
    age: true,
    amitie: true,
  });
  private readonly variantParam = toSignal(
    this.route.queryParamMap.pipe(map((params) => params.get('variant') ?? 'tuiles')),
    { initialValue: 'tuiles' },
  );

  protected readonly variant = computed(() => {
    const key = this.variantParam();
    return CHOICES.some((choice) => choice.key === key) ? key : 'tuiles';
  });

  protected readonly stateLine = computed(() => {
    const off = CASES.filter((row) => !this.flags()[row.key]).map((row) => row.label);
    return off.length === 0 ? 'six cases cochées' : `décochées : ${off.join(', ')}`;
  });

  protected on(key: string): boolean {
    return this.flags()[key] !== false;
  }

  protected toggle(key: string): void {
    this.flags.update((flags) => ({ ...flags, [key]: !flags[key] }));
  }

  protected move(delta: number): void {
    const keys = CHOICES.map((choice) => choice.key);
    const index = keys.indexOf(this.variant());
    const next = keys[(index + delta + keys.length) % keys.length];
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { variant: next },
      queryParamsHandling: 'merge',
    });
  }
}
