import {
  CdkDrag,
  CdkDragDrop,
  CdkDropList,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import type {
  ChildPlayViewCard,
  ChildPlayViewChoice,
  ChildPlayViewColumn,
  ChildPlayViewPair,
  ChildPlayViewQuestion,
  ChildPlayViewStatement,
} from './child-question-play-view.model';

export interface MemoryCardView {
  key: string;
  pairKey: string;
  label: string;
}

export interface ClassCardView {
  key: string;
  cardId?: number;
  label: string;
}

export interface ClassColumnView {
  key: string;
  columnId?: number;
  label: string;
  cards: ClassCardView[];
}

const SOURCE_KEY = 'source';

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

function pairKeyOf(pair: ChildPlayViewPair, index: number): string {
  return pair.pairId != null ? String(pair.pairId) : `i-${index}`;
}

function buildMemoryCards(pairs: readonly ChildPlayViewPair[]): MemoryCardView[] {
  const cards: MemoryCardView[] = [];
  pairs.forEach((pair, index) => {
    const pairKey = pairKeyOf(pair, index);
    cards.push({ key: `${pairKey}-q`, pairKey, label: pair.questionSide });
    cards.push({ key: `${pairKey}-a`, pairKey, label: pair.answerSide });
  });
  return cards;
}

function toClassCard(card: ChildPlayViewCard, index: number): ClassCardView {
  return {
    key: card.cardId != null ? String(card.cardId) : `c-${index}-${card.label}`,
    cardId: card.cardId,
    label: card.label,
  };
}

function toClassColumn(column: ChildPlayViewColumn, index: number): ClassColumnView {
  return {
    key: column.columnId != null ? String(column.columnId) : `col-${index}-${column.label}`,
    columnId: column.columnId,
    label: column.label,
    cards: [],
  };
}

/**
 * Rendu partagé Learning + Teacher : qcm / vrai_faux / memory / classement.
 * Teacher : aperçu. Learning : interaction + envoi géré par la page parente.
 */
@Component({
  selector: 'app-child-question-play-view',
  imports: [CdkDropList, CdkDrag],
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
  readonly memoryChange = output<void>();
  readonly classificationChange = output<void>();

  private readonly layoutTick = signal(0);
  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isQcm = computed(() => this.question().formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question().formCode === 'vrai_faux');
  protected readonly isMemory = computed(() => this.question().formCode === 'memory');
  protected readonly isClassification = computed(() => this.question().formCode === 'classement');
  protected readonly playable = computed(
    () => this.isQcm() || this.isTrueFalse() || this.isMemory() || this.isClassification(),
  );

  readonly sourceCards = signal<ClassCardView[]>([]);
  readonly classColumns = signal<ClassColumnView[]>([]);
  readonly selectedClassCardKey = signal<string | null>(null);

  protected readonly classListIds = computed(() => [
    SOURCE_KEY,
    ...this.classColumns().map((column) => column.key),
  ]);

  protected readonly remainingCount = computed(() => this.sourceCards().length);

  constructor() {
    effect(() => {
      this.layoutTick();
      if (this.question().formCode !== 'classement') {
        return;
      }
      const cards = shuffleCopy((this.question().cards ?? []).map(toClassCard));
      const columns = (this.question().columns ?? []).map(toClassColumn);
      this.sourceCards.set(cards);
      this.classColumns.set(columns);
      this.selectedClassCardKey.set(null);
    });
  }

  protected readonly displayChoices = computed(() => {
    this.layoutTick();
    return shuffleCopy(this.question().choices ?? []);
  });

  protected readonly displayStatements = computed(() => {
    this.layoutTick();
    return shuffleCopy(this.question().statements ?? []);
  });

  protected readonly displayMemoryCards = computed(() => {
    this.layoutTick();
    return shuffleCopy(buildMemoryCards(this.question().pairs ?? []));
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
  readonly matchedPairKeys = signal<ReadonlySet<string>>(new Set());
  readonly flippedKeys = signal<readonly string[]>([]);
  readonly flipBusy = signal(false);

  protected readonly memoryStatus = computed(() => {
    const pairs = this.question().pairs ?? [];
    const matched = this.matchedPairKeys().size;
    if (pairs.length === 0 || matched === 0) {
      return '';
    }
    if (matched >= pairs.length) {
      return 'Toutes les paires sont trouvées.';
    }
    return `Paires trouvées : ${matched}. Il en reste ${pairs.length - matched}.`;
  });

  /** Relance le mélange (rejouer / nouvel aperçu). */
  reshuffle(): void {
    this.clearMismatchTimer();
    this.selectedChoices.set(new Set());
    this.statementValues.set({});
    this.matchedPairKeys.set(new Set());
    this.flippedKeys.set([]);
    this.flipBusy.set(false);
    this.selectedClassCardKey.set(null);
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

  matchedPairIds(): number[] {
    const matched = this.matchedPairKeys();
    const out: number[] = [];
    (this.question().pairs ?? []).forEach((pair, index) => {
      const key = pairKeyOf(pair, index);
      if (!matched.has(key)) {
        return;
      }
      if (pair.pairId != null) {
        out.push(pair.pairId);
      } else {
        out.push(index + 1);
      }
    });
    return out;
  }

  allPairsMatched(): boolean {
    const pairs = this.question().pairs ?? [];
    return pairs.length > 0 && this.matchedPairKeys().size >= pairs.length;
  }

  placements(): { cardId: number; columnId: number }[] {
    const out: { cardId: number; columnId: number }[] = [];
    for (const column of this.classColumns()) {
      if (column.columnId == null) {
        continue;
      }
      for (const card of column.cards) {
        if (card.cardId == null) {
          continue;
        }
        out.push({ cardId: card.cardId, columnId: column.columnId });
      }
    }
    return out;
  }

  allCardsPlaced(): boolean {
    const total = (this.question().cards ?? []).length;
    return total > 0 && this.sourceCards().length === 0 && this.placements().length === total;
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

  protected cardFaceUp(card: MemoryCardView): boolean {
    return this.matchedPairKeys().has(card.pairKey) || this.flippedKeys().includes(card.key);
  }

  protected cardMatched(card: MemoryCardView): boolean {
    return this.matchedPairKeys().has(card.pairKey);
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

  protected onMemoryCard(card: MemoryCardView): void {
    if (!this.interactive() || this.disabled() || this.flipBusy()) {
      return;
    }
    if (this.matchedPairKeys().has(card.pairKey) || this.flippedKeys().includes(card.key)) {
      return;
    }
    const open = this.flippedKeys();
    if (open.length >= 2) {
      return;
    }
    if (open.length === 0) {
      this.flippedKeys.set([card.key]);
      this.memoryChange.emit();
      return;
    }
    const firstKey = open[0]!;
    const first = this.displayMemoryCards().find((c) => c.key === firstKey);
    const nextFlipped = [firstKey, card.key];
    this.flippedKeys.set(nextFlipped);
    if (first && first.pairKey === card.pairKey) {
      this.matchedPairKeys.update((current) => new Set([...current, card.pairKey]));
      this.flippedKeys.set([]);
      this.memoryChange.emit();
      return;
    }
    this.flipBusy.set(true);
    this.clearMismatchTimer();
    this.mismatchTimer = setTimeout(() => {
      this.flippedKeys.set([]);
      this.flipBusy.set(false);
      this.memoryChange.emit();
    }, 700);
    this.memoryChange.emit();
  }

  protected onClassDrop(event: CdkDragDrop<ClassCardView[]>, targetKey: string): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    if (event.previousContainer === event.container) {
      return;
    }
    const previous = [...event.previousContainer.data];
    const current = [...event.container.data];
    transferArrayItem(previous, current, event.previousIndex, event.currentIndex);
    this.writeBucket(event.previousContainer.id, previous);
    this.writeBucket(targetKey, current);
    this.selectedClassCardKey.set(null);
    this.classificationChange.emit();
  }

  protected onClassCardTap(card: ClassCardView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    this.selectedClassCardKey.update((current) => (current === card.key ? null : card.key));
  }

  protected onColumnTap(column: ClassColumnView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const selected = this.selectedClassCardKey();
    if (selected == null) {
      return;
    }
    this.moveCardTo(selected, column.key);
  }

  protected onSourceTap(): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const selected = this.selectedClassCardKey();
    if (selected == null) {
      return;
    }
    this.moveCardTo(selected, SOURCE_KEY);
  }

  private moveCardTo(cardKey: string, targetKey: string): void {
    const from = this.findBucketKey(cardKey);
    if (from == null || from === targetKey) {
      return;
    }
    const previous = [...this.readBucket(from)];
    const index = previous.findIndex((card) => card.key === cardKey);
    if (index < 0) {
      return;
    }
    const current = [...this.readBucket(targetKey)];
    transferArrayItem(previous, current, index, current.length);
    this.writeBucket(from, previous);
    this.writeBucket(targetKey, current);
    this.selectedClassCardKey.set(null);
    this.classificationChange.emit();
  }

  private findBucketKey(cardKey: string): string | null {
    if (this.sourceCards().some((card) => card.key === cardKey)) {
      return SOURCE_KEY;
    }
    for (const column of this.classColumns()) {
      if (column.cards.some((card) => card.key === cardKey)) {
        return column.key;
      }
    }
    return null;
  }

  private readBucket(key: string): ClassCardView[] {
    if (key === SOURCE_KEY) {
      return this.sourceCards();
    }
    return this.classColumns().find((column) => column.key === key)?.cards ?? [];
  }

  private writeBucket(key: string, cards: ClassCardView[]): void {
    if (key === SOURCE_KEY) {
      this.sourceCards.set(cards);
      return;
    }
    this.classColumns.update((columns) =>
      columns.map((column) => (column.key === key ? { ...column, cards } : column)),
    );
  }

  private clearMismatchTimer(): void {
    if (this.mismatchTimer != null) {
      clearTimeout(this.mismatchTimer);
      this.mismatchTimer = null;
    }
  }
}
