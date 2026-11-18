import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import type {
  ChildPlayViewChoice,
  ChildPlayViewQuestion,
  ChildPlayViewStatement,
} from './child-question-play-view.model';

function shuffleCopy<T>(items: readonly T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = next[i]!;
    next[i] = next[j]!;
    next[j] = tmp;
  }
  return next;
}

function randomTrueFalseOrder(): readonly boolean[] {
  return Math.random() < 0.5 ? [true, false] : [false, true];
}

/**
 * Rendu partagé Learning + Teacher : présentation visuelle enfant (vrai_faux / qcm).
 * Teacher : aperçu. Learning : interaction + envoi géré par la page parente.
 */
@Component({
  selector: 'app-child-question-play-view',
  templateUrl: './child-question-play-view.component.html',
  styleUrl: './child-question-play-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChildQuestionPlayViewComponent {
  readonly question = input.required<ChildPlayViewQuestion>();
  /** false = aperçu teacher (cliquable visuellement, sans submit parent). */
  readonly interactive = input(true);
  readonly disabled = input(false);

  readonly choiceToggle = output<number>();
  readonly statementPick = output<{ statementKey: string; value: boolean }>();

  private readonly layoutTick = signal(0);

  protected readonly isQcm = computed(() => this.question().formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question().formCode === 'vrai_faux');
  protected readonly playable = computed(() => this.isQcm() || this.isTrueFalse());

  protected readonly displayChoices = computed(() => {
    this.layoutTick();
    return shuffleCopy(this.question().choices ?? []);
  });

  protected readonly displayStatements = computed(() => {
    this.layoutTick();
    return shuffleCopy(this.question().statements ?? []);
  });

  protected readonly tfOrders = computed(() => {
    this.layoutTick();
    const orders: Record<string, readonly boolean[]> = {};
    for (const statement of this.question().statements ?? []) {
      orders[this.statementKey(statement)] = randomTrueFalseOrder();
    }
    return orders;
  });

  readonly selectedChoices = signal<ReadonlySet<number>>(new Set());
  readonly statementValues = signal<Readonly<Record<string, boolean>>>({});

  /** Relance le mélange (rejouer / nouvel aperçu). */
  reshuffle(): void {
    this.selectedChoices.set(new Set());
    this.statementValues.set({});
    this.layoutTick.update((n) => n + 1);
  }

  selectedChoiceIds(): number[] {
    return [...this.selectedChoices()];
  }

  /** Réponses vrai/faux indexées par statementId (ignore les clés sans id). */
  statementAnswers(): { statementId: number; value: boolean }[] {
    const values = this.statementValues();
    const out: { statementId: number; value: boolean }[] = [];
    for (const statement of this.displayStatements()) {
      if (statement.statementId == null) {
        continue;
      }
      const key = String(statement.statementId);
      if (values[key] === undefined) {
        continue;
      }
      out.push({ statementId: statement.statementId, value: values[key] === true });
    }
    return out;
  }

  allStatementsAnswered(): boolean {
    const statements = this.displayStatements();
    if (statements.length === 0) {
      return false;
    }
    const values = this.statementValues();
    return statements.every((s, i) => values[this.statementKey(s, i)] !== undefined);
  }

  protected statementKey(statement: ChildPlayViewStatement, index = 0): string {
    return statement.statementId != null ? String(statement.statementId) : `i-${index}-${statement.label}`;
  }

  protected tfOrderFor(key: string): readonly boolean[] {
    return this.tfOrders()[key] ?? [true, false];
  }

  protected choiceSelected(choiceId: number | undefined): boolean {
    return choiceId != null && this.selectedChoices().has(choiceId);
  }

  protected statementValue(key: string): boolean | undefined {
    return this.statementValues()[key];
  }

  protected onChoice(choice: ChildPlayViewChoice): void {
    if (!this.interactive() || this.disabled() || choice.choiceId == null) {
      return;
    }
    this.selectedChoices.update((current) => {
      const next = new Set(current);
      if (next.has(choice.choiceId!)) {
        next.delete(choice.choiceId!);
      } else {
        next.add(choice.choiceId!);
      }
      return next;
    });
    this.choiceToggle.emit(choice.choiceId);
  }

  protected onStatement(key: string, value: boolean): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    this.statementValues.update((current) => ({ ...current, [key]: value }));
    this.statementPick.emit({ statementKey: key, value });
  }
}
