import {
  CdkDrag,
  CdkDragDrop,
  CdkDragHandle,
  CdkDropList,
  moveItemInArray,
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
  ChildPlayViewItem,
  ChildPlayViewLink,
  ChildPlayViewPair,
  ChildPlayViewQuestion,
  ChildPlayViewStatement,
  ChildPlayViewWord,
} from './child-question-play-view.model';

export interface OrderItemView {
  key: string;
  itemId?: number;
  label: string;
  axisLabel?: string;
}

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

export interface LinkSideView {
  key: string;
  linkId?: number;
  label: string;
}

export interface GapWordView {
  key: string;
  wordId?: number;
  label: string;
}

export interface GapPart {
  kind: 'text' | 'hole';
  text: string;
  holeIndex: number;
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

function toOrderViews(items: readonly ChildPlayViewItem[]): OrderItemView[] {
  return items.map((item, index) => ({
    key: item.itemId != null ? String(item.itemId) : `i-${index}-${item.label}`,
    itemId: item.itemId,
    label: item.label,
    axisLabel: item.axisLabel,
  }));
}

function toClassCard(card: ChildPlayViewCard, index: number): ClassCardView {
  return {
    key: card.cardId != null ? String(card.cardId) : `c-${index}-${card.label}`,
    cardId: card.cardId,
    label: card.label,
  };
}

const GAP_HOLE = '___';

function toGapWord(word: ChildPlayViewWord, index: number): GapWordView {
  return {
    key: word.wordId != null ? `w-${word.wordId}` : `i-${index}`,
    wordId: word.wordId,
    label: word.label,
  };
}

function splitGapSentence(sentence: string): GapPart[] {
  const parts: GapPart[] = [];
  let from = 0;
  let holeIndex = 0;
  while (from <= sentence.length) {
    const at = sentence.indexOf(GAP_HOLE, from);
    if (at < 0) {
      if (from < sentence.length) {
        parts.push({ kind: 'text', text: sentence.slice(from), holeIndex: -1 });
      }
      break;
    }
    if (at > from) {
      parts.push({ kind: 'text', text: sentence.slice(from, at), holeIndex: -1 });
    }
    parts.push({ kind: 'hole', text: '', holeIndex });
    holeIndex++;
    from = at + GAP_HOLE.length;
  }
  return parts;
}

function toLinkSide(link: ChildPlayViewLink, index: number, side: 'l' | 'r'): LinkSideView {
  const idPart = link.linkId != null ? String(link.linkId) : `i-${index}`;
  return {
    key: `${side}-${idPart}`,
    linkId: link.linkId,
    label: side === 'l' ? link.leftLabel : link.rightLabel,
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
 * Rendu partagé Learning + Teacher : qcm / vrai_faux / memory / order (frise optionnelle) / classement / liens / case vide.
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
  readonly classificationChange = output<void>();
  readonly linksChange = output<void>();
  readonly gapsChange = output<void>();

  private readonly layoutTick = signal(0);
  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isQcm = computed(() => this.question().formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question().formCode === 'vrai_faux');
  protected readonly isMemory = computed(() => this.question().formCode === 'memory');
  protected readonly isOrder = computed(() => this.question().formCode === 'order');
  protected readonly isTimeline = computed(() => this.isOrder() && this.question().timelineEnabled === true);
  protected readonly isClassification = computed(() => this.question().formCode === 'classement');
  protected readonly isLinks = computed(() => this.question().formCode === 'liens');
  protected readonly isGaps = computed(() => this.question().formCode === 'case_vide');
  protected readonly playable = computed(
    () =>
      this.isQcm() ||
      this.isTrueFalse() ||
      this.isMemory() ||
      this.isOrder() ||
      this.isClassification() ||
      this.isLinks() ||
      this.isGaps(),
  );

  readonly orderedItems = signal<OrderItemView[]>([]);

  readonly sourceCards = signal<ClassCardView[]>([]);
  readonly classColumns = signal<ClassColumnView[]>([]);
  readonly selectedClassCardKey = signal<string | null>(null);

  readonly linkLefts = signal<LinkSideView[]>([]);
  readonly linkRights = signal<LinkSideView[]>([]);
  readonly selectedLinkKey = signal<string | null>(null);
  private readonly linkPairs = signal<Readonly<Record<string, string>>>({});

  readonly gapWords = signal<GapWordView[]>([]);
  /** Trou choisi : le prochain clic sur un mot s'y place. */
  readonly selectedGapHole = signal<number | null>(null);
  private readonly gapPlacements = signal<Readonly<Record<number, string>>>({});

  protected readonly classListIds = computed(() => [
    SOURCE_KEY,
    ...this.classColumns().map((column) => column.key),
  ]);

  protected readonly remainingCount = computed(() => this.sourceCards().length);

  constructor() {
    effect(() => {
      const items = this.question().items ?? [];
      this.layoutTick();
      if (this.question().formCode === 'order') {
        this.orderedItems.set(shuffleCopy(toOrderViews(items)));
      }
    });
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
    effect(() => {
      this.layoutTick();
      if (this.question().formCode !== 'liens') {
        return;
      }
      const links = this.question().links ?? [];
      this.linkLefts.set(shuffleCopy(links.map((link, index) => toLinkSide(link, index, 'l'))));
      this.linkRights.set(shuffleCopy(links.map((link, index) => toLinkSide(link, index, 'r'))));
      this.linkPairs.set({});
      this.selectedLinkKey.set(null);
    });
    effect(() => {
      this.layoutTick();
      if (this.question().formCode !== 'case_vide') {
        return;
      }
      const words = this.question().words ?? [];
      this.gapWords.set(shuffleCopy(words.map((word, index) => toGapWord(word, index))));
      this.gapPlacements.set({});
      this.selectedGapHole.set(null);
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

  protected readonly linksStatus = computed(() => {
    const total = this.linkLefts().length;
    const done = Object.keys(this.linkPairs()).length;
    if (total === 0 || done === 0) {
      return '';
    }
    if (done >= total) {
      return 'Tous les mots sont reliés.';
    }
    return `Liens faits : ${done}. Il en reste ${total - done}.`;
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
    this.selectedLinkKey.set(null);
    this.linkPairs.set({});
    this.selectedGapHole.set(null);
    this.gapPlacements.set({});
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

  linkMatches(): { leftId: number; rightId: number }[] {
    const pairs = this.linkPairs();
    const rights = new Map(this.linkRights().map((row) => [row.key, row]));
    const out: { leftId: number; rightId: number }[] = [];
    for (const left of this.linkLefts()) {
      const right = rights.get(pairs[left.key] ?? '');
      if (left.linkId == null || right?.linkId == null) {
        continue;
      }
      out.push({ leftId: left.linkId, rightId: right.linkId });
    }
    return out;
  }

  gapFills(): { holeIndex: number; wordId: number }[] {
    const byKey = new Map(this.gapWords().map((word) => [word.key, word]));
    const out: { holeIndex: number; wordId: number }[] = [];
    for (const [hole, key] of Object.entries(this.gapPlacements())) {
      const word = byKey.get(key);
      if (word?.wordId == null) {
        continue;
      }
      out.push({ holeIndex: Number(hole), wordId: word.wordId });
    }
    return out;
  }

  allGapsFilled(): boolean {
    const holes = splitGapSentence(this.question().sentence ?? '').filter((part) => part.kind === 'hole');
    if (holes.length === 0) {
      return false;
    }
    const placed = this.gapPlacements();
    return holes.every((part) => placed[part.holeIndex] != null);
  }

  allLinksMatched(): boolean {
    const lefts = this.linkLefts();
    if (lefts.length === 0) {
      return false;
    }
    const pairs = this.linkPairs();
    const used = new Set<string>();
    for (const left of lefts) {
      const rightKey = pairs[left.key];
      if (rightKey == null || used.has(rightKey)) {
        return false;
      }
      used.add(rightKey);
    }
    return used.size === lefts.length;
  }

  protected readonly gapParts = computed(() => splitGapSentence(this.question().sentence ?? ''));

  /** Même largeur vide ou rempli, pour que la phrase ne bouge pas. */
  protected readonly gapHoleSize = computed(() => {
    const longest = this.gapWords().reduce((max, word) => Math.max(max, word.label.length), 1);
    return `${Math.min(Math.max(longest + 2, 4), 16)}ch`;
  });

  protected readonly gapBank = computed(() => {
    const placed = new Set(Object.values(this.gapPlacements()));
    return this.gapWords().filter((word) => !placed.has(word.key));
  });

  protected readonly gapsStatus = computed(() => {
    const holes = this.gapParts().filter((part) => part.kind === 'hole');
    const done = holes.filter((part) => this.gapPlacements()[part.holeIndex] != null).length;
    if (holes.length === 0 || done === 0) {
      return '';
    }
    if (done >= holes.length) {
      return 'Tous les trous sont remplis.';
    }
    return `Trous remplis : ${done}. Il en reste ${holes.length - done}.`;
  });

  protected readonly gapDropIds = computed(() => [
    'gap-bank',
    ...this.gapParts()
      .filter((part) => part.kind === 'hole')
      .map((part) => `gap-hole-${part.holeIndex}`),
  ]);

  protected gapHoleWords(holeIndex: number): GapWordView[] {
    const key = this.gapPlacements()[holeIndex];
    const word = this.gapWords().find((row) => row.key === key);
    return word ? [word] : [];
  }

  protected onGapHole(holeIndex: number): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    this.selectedGapHole.update((selected) => (selected === holeIndex ? null : holeIndex));
    this.gapsChange.emit();
  }

  protected onGapWord(word: GapWordView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const hole = this.selectedGapHole();
    if (hole == null) {
      return;
    }
    this.placeGapWord(word.key, hole);
    this.gapsChange.emit();
  }

  protected onGapChip(word: GapWordView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    this.clearGapWord(word.key);
    this.gapsChange.emit();
  }

  protected onGapDrop(event: CdkDragDrop<GapWordView[]>, holeIndex: number | null): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    if (event.previousContainer === event.container && event.previousIndex === event.currentIndex) {
      return;
    }
    const word = event.item.data as GapWordView | undefined;
    if (word == null) {
      return;
    }
    if (holeIndex == null) {
      this.clearGapWord(word.key);
    } else {
      this.placeGapWord(word.key, holeIndex);
    }
    this.gapsChange.emit();
  }

  private placeGapWord(wordKey: string, holeIndex: number): void {
    const current = { ...this.gapPlacements() };
    for (const [hole, key] of Object.entries(current)) {
      if (key === wordKey || Number(hole) === holeIndex) {
        delete current[Number(hole)];
      }
    }
    current[holeIndex] = wordKey;
    this.gapPlacements.set(current);
    this.selectedGapHole.set(null);
  }

  private clearGapWord(wordKey: string): void {
    const current = { ...this.gapPlacements() };
    for (const [hole, key] of Object.entries(current)) {
      if (key === wordKey) {
        delete current[Number(hole)];
      }
    }
    this.gapPlacements.set(current);
  }

  protected linkLeftSelected(key: string): boolean {
    return this.selectedLinkKey() === key;
  }

  protected linkSidePaired(key: string, side: 'left' | 'right'): boolean {
    const pairs = this.linkPairs();
    if (side === 'left') {
      return pairs[key] != null;
    }
    return Object.values(pairs).includes(key);
  }

  protected onLinkLeft(row: LinkSideView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const current = { ...this.linkPairs() };
    if (current[row.key] != null) {
      delete current[row.key];
      this.linkPairs.set(current);
    }
    this.selectedLinkKey.update((selected) => (selected === row.key ? null : row.key));
    this.linksChange.emit();
  }

  protected onLinkRight(row: LinkSideView): void {
    if (!this.interactive() || this.disabled()) {
      return;
    }
    const selected = this.selectedLinkKey();
    const current = { ...this.linkPairs() };
    if (selected == null) {
      const owner = Object.entries(current).find(([, rightKey]) => rightKey === row.key)?.[0];
      if (owner != null) {
        delete current[owner];
        this.linkPairs.set(current);
        this.linksChange.emit();
      }
      return;
    }
    for (const [leftKey, rightKey] of Object.entries(current)) {
      if (rightKey === row.key || leftKey === selected) {
        delete current[leftKey];
      }
    }
    current[selected] = row.key;
    this.linkPairs.set(current);
    this.selectedLinkKey.set(null);
    this.linksChange.emit();
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
