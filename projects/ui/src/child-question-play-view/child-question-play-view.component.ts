import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
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
  ChildPlayViewChoice,
  ChildPlayViewItem,
  ChildPlayViewPair,
  ChildPlayViewQuestion,
  ChildPlayViewStatement,
} from './child-question-play-view.model';

export interface OrderItemView {
  key: string;
  itemId?: number;
  label: string;
}

export interface MemoryCardView {
  key: string;
  pairKey: string;
  label: string;
}

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

function toOrderViews(items: readonly ChildPlayViewItem[]): OrderItemView[] {
  return items.map((item, index) => ({
    key: item.itemId != null ? String(item.itemId) : `i-${index}-${item.label}`,
    itemId: item.itemId,
    label: item.label,
  }));
}

/**
 * Rendu partagé Learning + Teacher : présentation visuelle enfant (vrai_faux / qcm / memory / order).
 * Teacher : aperçu. Learning : interaction + envoi géré par la page parente.
 */
@Component({
  selector: 'app-child-question-play-view',
  imports: [CdkDropList, CdkDrag, CdkDragHandle],
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
  readonly orderChange = output<void>();

  private readonly layoutTick = signal(0);
  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isQcm = computed(() => this.question().formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question().formCode === 'vrai_faux');
  protected readonly isMemory = computed(() => this.question().formCode === 'memory');
  protected readonly isOrder = computed(() => this.question().formCode === 'order');
  protected readonly playable = computed(
    () => this.isQcm() || this.isTrueFalse() || this.isMemory() || this.isOrder(),
  );

  readonly orderedItems = signal<OrderItemView[]>([]);

  constructor() {
    effect(() => {
      const items = this.question().items ?? [];
      this.layoutTick();
      if (this.question().formCode === 'order') {
        this.orderedItems.set(shuffleCopy(toOrderViews(items)));
      }
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

  orderedItemIds(): number[] {
    return this.orderedItems()
      .map((row) => row.itemId)
      .filter((id): id is number => id != null);
  }

  hasOrderItems(): boolean {
    return this.orderedItems().length > 0;
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

  protected onOrderDrop(event: CdkDragDrop<OrderItemView[]>): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    if (event.previousIndex === event.currentIndex) {
      return;
    }
    this.orderedItems.update((rows) => {
      const next = [...rows];
      moveItemInArray(next, event.previousIndex, event.currentIndex);
      return next;
    });
    this.orderChange.emit();
  }

  protected moveOrderItem(index: number, delta: -1 | 1): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const target = index + delta;
    const rows = this.orderedItems();
    if (target < 0 || target >= rows.length) {
      return;
    }
    this.orderedItems.update((current) => {
      const next = [...current];
      moveItemInArray(next, index, target);
      return next;
    });
    this.orderChange.emit();
  }

  private clearMismatchTimer(): void {
    if (this.mismatchTimer != null) {
      clearTimeout(this.mismatchTimer);
      this.mismatchTimer = null;
    }
  }
}
