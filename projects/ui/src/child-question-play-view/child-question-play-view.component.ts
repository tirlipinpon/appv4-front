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
  ElementRef,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';

import type {
  ChildPlayViewCard,
  ChildPlayViewChoice,
  ChildPlayViewColumn,
  ChildPlayViewItem,
  ChildPlayViewLink,
  ChildPlayViewPair,
  ChildPlayViewPuzzlePiece,
  ChildPlayViewQuestion,
  ChildPlayViewStatement,
  ChildPlayViewClickPoint,
  ChildPlayViewClickZone,
  ChildPlayViewWord,
} from './child-question-play-view.model';
import {
  PUZZLE_MAGNET_DEFAULT,
  clampPuzzleMagnet,
  cutPuzzlePiece,
  loadImageElement,
  magnetizedPosition,
  placeOnImage,
  punchPuzzlePieces,
  puzzlePieceFrame,
  puzzlePieceHome,
  withinPuzzleMagnet,
  type PuzzleFrame,
  type PuzzlePoint,
} from './puzzle-play';

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

interface ClickMark {
  n: string;
  x: number;
  y: number;
  zoneId?: number;
}

interface PuzzlePiecePlayView {
  key: string;
  pieceId?: number;
  label: string;
  shape: string;
  points: ChildPlayViewClickPoint[];
  slotX?: number | null;
  slotY?: number | null;
  slotWidth?: number | null;
  url: string;
  frame: PuzzleFrame;
  /** Place attendue sur le plateau ; sa largeur est aussi celle de la pièce posée. */
  home: PuzzleFrame;
  placement: PuzzlePoint | null;
}

interface PuzzleGhost {
  url: string;
  left: number;
  top: number;
  width: number;
}

export interface GapPart {
  kind: 'text' | 'hole';
  text: string;
  holeIndex: number;
}

const SOURCE_KEY = 'source';

function imageSource(raw: string | undefined): string {
  if (!raw) {
    return '';
  }
  return raw.startsWith('data:') ? raw : `data:image/webp;base64,${raw}`;
}

function playZoneContains(zone: ChildPlayViewClickZone, point: ChildPlayViewClickPoint): boolean {
  const points = zone.points ?? [];
  if (zone.shape === 'rect' && points.length >= 2) {
    const x = Math.min(points[0].x, points[1].x);
    const y = Math.min(points[0].y, points[1].y);
    const width = Math.abs(points[1].x - points[0].x);
    const height = Math.abs(points[1].y - points[0].y);
    return point.x >= x && point.y >= y && point.x <= x + width && point.y <= y + height;
  }
  if (zone.shape === 'ellipse' && points.length >= 2) {
    const rx = Math.max(0.02, points[1].x - points[0].x);
    const ry = Math.max(0.02, points[1].y - points[0].y);
    const dx = (point.x - points[0].x) / rx;
    const dy = (point.y - points[0].y) / ry;
    return dx * dx + dy * dy <= 1;
  }
  let inside = false;
  for (let index = 0, previous = points.length - 1; index < points.length; previous = index, index += 1) {
    const current = points[index];
    const before = points[previous];
    const crosses =
      current.y > point.y !== before.y > point.y &&
      point.x < ((before.x - current.x) * (point.y - current.y)) / (before.y - current.y) + current.x;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
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
  readonly imageChange = output<void>();
  readonly lettersChange = output<void>();
  readonly puzzleChange = output<void>();

  private readonly layoutTick = signal(0);
  private mismatchTimer: ReturnType<typeof setTimeout> | null = null;
  private puzzleBuildSeq = 0;
  private pieceDrag: {
    pointer: number;
    index: number;
    offsetX: number;
    offsetY: number;
    width: number;
    /** True une fois collé : on garde le trou jusqu'à un vrai écart. */
    snapped: boolean;
  } | null = null;
  private stopPieceListeners: (() => void) | null = null;

  protected readonly isQcm = computed(() => this.question().formCode === 'qcm');
  protected readonly isTrueFalse = computed(() => this.question().formCode === 'vrai_faux');
  protected readonly isMemory = computed(() => this.question().formCode === 'memory');
  protected readonly isOrder = computed(() => this.question().formCode === 'order');
  protected readonly isTimeline = computed(() => this.isOrder() && this.question().timelineEnabled === true);
  protected readonly isClassification = computed(() => this.question().formCode === 'classement');
  protected readonly isLinks = computed(() => this.question().formCode === 'liens');
  protected readonly isGaps = computed(() => this.question().formCode === 'case_vide');
  protected readonly isImage = computed(() => this.question().formCode === 'image_interactive');
  protected readonly isOrderedImage = computed(
    () => this.isImage() && this.question().clicksOrdered !== false && (this.question().clickSteps ?? []).length > 0,
  );
  protected readonly isLetters = computed(() => this.question().formCode === 'reponse_libre');
  protected readonly isPuzzle = computed(() => this.question().formCode === 'puzzle');
  protected readonly playable = computed(
    () =>
      this.isQcm() ||
      this.isTrueFalse() ||
      this.isMemory() ||
      this.isOrder() ||
      this.isClassification() ||
      this.isLinks() ||
      this.isGaps() ||
      this.isImage() ||
      this.isLetters() ||
      this.isPuzzle(),
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

  protected readonly clickStep = signal(0);
  private readonly clickedZoneIds = signal<number[]>([]);
  protected readonly clickMarks = signal<ClickMark[]>([]);
  protected readonly clickMiss = signal(false);

  private readonly letterFields = viewChildren<ElementRef<HTMLInputElement>>('letterBox');
  private readonly puzzleStage = viewChild<ElementRef<HTMLElement>>('puzzleStage');
  protected readonly letterBoxes = signal<string[]>([]);
  /** Verrou par case (espace toujours true ; lettre juste → true). */
  protected readonly letterLocks = signal<boolean[]>([]);
  /** Cases incorrectes après Valider (rouge). */
  protected readonly letterWrongs = signal<boolean[]>([]);
  /** Mots (groupes de cases) pour ne pas couper un mot à la ligne. */
  protected readonly letterWords = computed(() => letterWordGroups(this.letterMaskValue()));

  protected readonly puzzlePieces = signal<PuzzlePiecePlayView[]>([]);
  protected readonly puzzleBoardSrc = signal('');
  /** Ratio largeur/hauteur de l'image à découper — plateau blanc stable (pas le rail). */
  protected readonly puzzleBoardAspect = signal('4 / 3');
  protected readonly puzzleGhost = signal<PuzzleGhost | null>(null);
  protected readonly puzzleDragIndex = signal<number | null>(null);
  protected readonly puzzleFitFlash = signal<ReadonlySet<number>>(new Set());
  private readonly puzzleFitTimers = new Map<number, ReturnType<typeof setTimeout>>();

  protected readonly imageSrc = computed(() => imageSource(this.question().imageWebp));
  protected readonly puzzleMagnet = computed(() => {
    const value = this.question().snapDistance;
    return value == null || !Number.isFinite(value)
      ? PUZZLE_MAGNET_DEFAULT
      : clampPuzzleMagnet(value);
  });
  protected readonly puzzleBoardBlank = computed(() => this.question().boardMode === 'blanc');
  protected readonly puzzleTrayPieces = computed(() =>
    this.puzzlePieces()
      .map((piece, index) => ({ piece, index }))
      .filter((row) => row.piece.placement == null),
  );

  protected readonly currentClickPrompt = computed(() => {
    const steps = this.question().clickSteps ?? [];
    if (steps.length === 0) {
      return '';
    }
    const index = Math.min(this.clickStep(), steps.length - 1);
    return steps[index]?.prompt ?? '';
  });

  protected readonly clickProgress = computed(() => {
    const total = (this.question().clickSteps ?? []).length;
    if (total === 0) {
      return '';
    }
    const current = Math.min(this.clickStep() + 1, total);
    return `Question ${current} sur ${total}`;
  });

  /** Numéro du marqueur sur l'image, par zone (mode sans ordre). */
  protected readonly clickMarkByZoneId = computed(() => {
    const map = new Map<number, string>();
    for (const mark of this.clickMarks()) {
      if (mark.zoneId != null) {
        map.set(mark.zoneId, mark.n);
      }
    }
    return map;
  });

  protected markForZone(zoneId: number | undefined): string | null {
    if (zoneId === undefined) {
      return null;
    }
    return this.clickMarkByZoneId().get(zoneId) ?? null;
  }

  protected readonly classListIds = computed(() => [
    SOURCE_KEY,
    ...this.classColumns().map((column) => column.key),
  ]);

  protected readonly remainingCount = computed(() => this.sourceCards().length);

  constructor() {
    effect(() => {
      this.question();
      this.layoutTick();
      this.clickStep.set(0);
      this.clickedZoneIds.set([]);
      this.clickMarks.set([]);
      this.clickMiss.set(false);
      this.resetLetterSlots();
    });
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
    effect(() => {
      this.layoutTick();
      const q = this.question();
      if (q.formCode !== 'puzzle') {
        this.puzzlePieces.set([]);
        this.puzzleBoardSrc.set('');
        return;
      }
      void this.rebuildPuzzleBoard(q);
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
    this.clickStep.set(0);
    this.clickedZoneIds.set([]);
    this.clickMarks.set([]);
    this.clickMiss.set(false);
    this.resetLetterSlots();
    this.clearPuzzleDrag();
    this.puzzleFitFlash.set(new Set());
    this.layoutTick.update((n) => n + 1);
  }

  letterAttempt(): string {
    return this.letterBoxes().join('');
  }

  /** Tentative partielle : case vide = \\0 pour le check des verrous côté API. */
  letterAttemptForLocks(): string {
    return this.letterBoxes()
      .map((letter, index) => {
        if (this.isSpaceSlot(index)) {
          return ' ';
        }
        return letter === '' ? '\0' : letter;
      })
      .join('');
  }

  allLettersFilled(): boolean {
    const rows = this.letterBoxes();
    if (rows.length === 0) {
      return false;
    }
    return rows.every((letter, index) => this.isSpaceSlot(index) || letter !== '');
  }

  applyLetterLocks(locks: boolean[]): void {
    const mask = this.letterMaskValue();
    const next = mask.split('').map((ch, index) => {
      if (ch === ' ') {
        return true;
      }
      return locks[index] === true;
    });
    this.letterLocks.set(next);
  }

  /**
   * Après Valider : les cases non verrouillées (incorrectes) passent en rouge.
   * Si tout est bon, aucun rouge.
   */
  markLetterWrongs(showWrongs: boolean): void {
    const mask = this.letterMaskValue();
    if (!showWrongs || mask === '') {
      this.letterWrongs.set(mask === '' ? [] : [...mask].map(() => false));
      return;
    }
    const locks = this.letterLocks();
    const boxes = this.letterBoxes();
    this.letterWrongs.set(
      [...mask].map((ch, index) => {
        if (ch === ' ') {
          return false;
        }
        return boxes[index] !== '' && locks[index] !== true;
      }),
    );
  }

  /** Aperçu teacher : recalcule les verts à partir de {@code letterExpected}. */
  refreshLocalLetterLocksFromExpected(): void {
    this.refreshLocalLetterLocks();
  }

  protected isSpaceSlot(index: number): boolean {
    return this.letterMaskValue()[index] === ' ';
  }

  protected letterLocked(index: number): boolean {
    return this.letterLocks()[index] === true;
  }

  protected letterWrong(index: number): boolean {
    return this.letterWrongs()[index] === true;
  }

  protected onLetterInput(index: number, event: Event): void {
    if (this.disabled() || !this.interactive() || this.letterLocked(index) || this.isSpaceSlot(index)) {
      return;
    }
    const field = event.target as HTMLInputElement;
    if (event instanceof InputEvent && event.isComposing) {
      return;
    }
    const chars = Array.from(field.value);
    const letter = chars.length === 0 ? '' : chars[chars.length - 1];
    this.letterBoxes.update((rows) => rows.map((row, i) => (i === index ? letter : row)));
    field.value = letter;
    this.clearLetterWrongs();
    this.refreshLocalLetterLocks();
    if (letter !== '') {
      const next = this.nextEditableSlot(index);
      if (next !== null) {
        this.focusLetterSlot(next);
      }
    }
    this.lettersChange.emit();
  }

  protected onLetterKeydown(index: number, event: KeyboardEvent): void {
    if (this.letterLocked(index) || this.isSpaceSlot(index)) {
      event.preventDefault();
      return;
    }
    if (event.key !== 'Backspace' || this.letterBoxes()[index] !== '') {
      return;
    }
    const prev = this.prevEditableSlot(index);
    if (prev === null) {
      return;
    }
    event.preventDefault();
    this.letterBoxes.update((rows) => rows.map((row, i) => (i === prev ? '' : row)));
    this.clearLetterWrongs();
    this.refreshLocalLetterLocks();
    this.focusLetterSlot(prev);
    this.lettersChange.emit();
  }

  private resetLetterSlots(): void {
    const mask = this.letterMaskValue();
    this.letterBoxes.set(mask === '' ? [] : [...mask].map((ch) => (ch === ' ' ? ' ' : '')));
    this.letterLocks.set(mask === '' ? [] : [...mask].map((ch) => ch === ' '));
    this.letterWrongs.set(mask === '' ? [] : [...mask].map(() => false));
  }

  private clearLetterWrongs(): void {
    const mask = this.letterMaskValue();
    this.letterWrongs.set(mask === '' ? [] : [...mask].map(() => false));
  }

  private letterMaskValue(): string {
    const fromApi = this.question().letterMask;
    if (fromApi != null && fromApi !== '') {
      return fromApi;
    }
    const expected = this.question().letterExpected;
    if (expected != null && expected !== '') {
      return [...expected].map((ch) => (/\s/.test(ch) ? ' ' : '#')).join('');
    }
    const count = this.question().letterCount ?? 0;
    return count > 0 ? '#'.repeat(count) : '';
  }

  private refreshLocalLetterLocks(): void {
    const expected = this.question().letterExpected;
    if (expected == null || expected === '') {
      return;
    }
    const boxes = this.letterBoxes();
    const locks = [...expected].map((expCh, index) => {
      if (/\s/.test(expCh)) {
        return true;
      }
      const typed = boxes[index] ?? '';
      if (typed === '') {
        return false;
      }
      return typed.toLowerCase() === expCh.toLowerCase();
    });
    this.letterLocks.set(locks);
  }

  private nextEditableSlot(from: number): number | null {
    const boxes = this.letterBoxes();
    for (let i = from + 1; i < boxes.length; i++) {
      if (!this.isSpaceSlot(i) && !this.letterLocked(i)) {
        return i;
      }
    }
    return null;
  }

  private prevEditableSlot(from: number): number | null {
    for (let i = from - 1; i >= 0; i--) {
      if (!this.isSpaceSlot(i) && !this.letterLocked(i)) {
        return i;
      }
    }
    return null;
  }

  private focusLetterSlot(slotIndex: number): void {
    let inputIndex = 0;
    for (let i = 0; i < slotIndex; i++) {
      if (!this.isSpaceSlot(i)) {
        inputIndex += 1;
      }
    }
    this.letterFields()[inputIndex]?.nativeElement.focus();
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

  imageReady(): boolean {
    if (!this.isImage()) {
      return false;
    }
    if (this.isOrderedImage()) {
      const steps = this.question().clickSteps ?? [];
      return steps.length > 0 && this.clickStep() >= steps.length;
    }
    return this.clickedZoneIds().length > 0;
  }

  zoneClicks(): number[] {
    if (this.isOrderedImage()) {
      return this.clickMarks().flatMap((mark) => (mark.zoneId == null ? [] : [mark.zoneId]));
    }
    return this.clickedZoneIds();
  }

  allPuzzlePiecesPlaced(): boolean {
    const pieces = this.puzzlePieces();
    return pieces.length > 0 && pieces.every((piece) => piece.placement != null);
  }

  puzzlePlacements(): { pieceId: number; x: number; y: number }[] {
    const out: { pieceId: number; x: number; y: number }[] = [];
    for (const piece of this.puzzlePieces()) {
      if (piece.pieceId == null || piece.placement == null) {
        continue;
      }
      out.push({ pieceId: piece.pieceId, x: piece.placement.x, y: piece.placement.y });
    }
    return out;
  }

  /** Aperçu teacher : pièces assez près de leur home (même rayon que le serveur). */
  puzzleCorrectCount(): { ok: number; total: number } {
    const pieces = this.puzzlePieces();
    const magnet = this.puzzleMagnet();
    let ok = 0;
    for (const piece of pieces) {
      if (piece.placement == null) {
        continue;
      }
      if (withinPuzzleMagnet(piece.placement.x, piece.placement.y, piece.home, magnet)) {
        ok += 1;
      }
    }
    return { ok, total: pieces.length };
  }

  protected pieceWidthPercent(piece: PuzzlePiecePlayView): number {
    return piece.home.width * 100;
  }

  /**
   * Largeur réelle de dépôt (= % du plateau). Dès le drag, le fantôme
   * prend cette taille, même si la vignette du rail est petite.
   */
  private pieceDepositWidthPx(piece: PuzzlePiecePlayView): number {
    const stage = this.puzzleStage()?.nativeElement.getBoundingClientRect();
    if (stage != null && stage.width > 0 && piece.home.width > 0) {
      return piece.home.width * stage.width;
    }
    return 64;
  }

  protected onPuzzlePieceDown(event: PointerEvent, index: number): void {
    if (this.disabled() || !this.interactive() || event.button !== 0) {
      return;
    }
    const piece = this.puzzlePieces()[index];
    if (!piece?.url) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const rect = target.getBoundingClientRect();
    const depositWidth = this.pieceDepositWidthPx(piece);
    // Hauteur du fantôme = ratio réel de l'image (height:auto sur le ghost).
    const depositHeight =
      target instanceof HTMLImageElement && target.naturalWidth > 0
        ? depositWidth * (target.naturalHeight / target.naturalWidth)
        : piece.frame.width > 0
          ? depositWidth * (piece.frame.height / piece.frame.width)
          : Math.max(rect.height, 1);
    // Garde le point cliqué sous la souris en passant vignette → taille dépôt.
    const scaleX = rect.width > 0 ? depositWidth / rect.width : 1;
    const scaleY = rect.height > 0 ? depositHeight / rect.height : scaleX;
    const offsetX = (event.clientX - rect.left) * scaleX;
    const offsetY = (event.clientY - rect.top) * scaleY;
    const left = event.clientX - offsetX;
    const top = event.clientY - offsetY;
    this.clearPuzzleDrag();
    this.pieceDrag = {
      pointer: event.pointerId,
      index,
      offsetX,
      offsetY,
      width: depositWidth,
      snapped: false,
    };
    this.puzzleDragIndex.set(index);
    this.puzzleGhost.set({
      url: piece.url,
      left,
      top,
      width: depositWidth,
    });
    const onMove = (move: PointerEvent) => this.onPuzzlePieceMove(move);
    const onUp = (up: PointerEvent) => this.finishPuzzlePieceDrag(up);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    this.stopPieceListeners = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }

  private onPuzzlePieceMove(event: PointerEvent): void {
    const drag = this.pieceDrag;
    const stage = this.puzzleStage()?.nativeElement.getBoundingClientRect();
    if (!drag || event.pointerId !== drag.pointer || !stage || stage.width <= 0 || stage.height <= 0) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    const freeLeft = event.clientX - drag.offsetX;
    const freeTop = event.clientY - drag.offsetY;
    const piece = this.puzzlePieces()[drag.index];
    const url = piece?.url ?? '';
    const home = piece?.home;
    if (!home) {
      this.puzzleGhost.set({ url, left: freeLeft, top: freeTop, width: drag.width });
      return;
    }
    const freeRaw = {
      x: (freeLeft - stage.left) / stage.width,
      y: (freeTop - stage.top) / stage.height,
    };
    const magnet = this.puzzleMagnet();
    // Déjà collé : rayon ×2 pour ne pas décrocher au micro-mouvement (ex. magnétisme 2 %).
    const spot = magnetizedPosition(
      freeRaw,
      home,
      drag.snapped ? clampPuzzleMagnet(magnet * 2) : magnet,
      stage,
    );
    if (spot.snapped) {
      if (!drag.snapped) {
        // Recaler l'offset sur le trou : sinon le prochain move recalcule loin du home et décroche.
        drag.offsetX = event.clientX - (stage.left + home.x * stage.width);
        drag.offsetY = event.clientY - (stage.top + home.y * stage.height);
        drag.snapped = true;
      }
      this.puzzleGhost.set({
        url,
        left: stage.left + home.x * stage.width,
        top: stage.top + home.y * stage.height,
        width: home.width * stage.width,
      });
      return;
    }
    drag.snapped = false;
    this.puzzleGhost.set({ url, left: freeLeft, top: freeTop, width: drag.width });
  }

  private finishPuzzlePieceDrag(event: PointerEvent): void {
    const drag = this.pieceDrag;
    if (!drag || event.pointerId !== drag.pointer) {
      return;
    }
    // Dernier move avec la position du lâcher (évite un fantôme en retard).
    this.onPuzzlePieceMove(event);
    const stage = this.puzzleStage()?.nativeElement.getBoundingClientRect();
    const piece = this.puzzlePieces()[drag.index];
    const home = piece?.home;
    const magnet = this.puzzleMagnet();
    let placed: PuzzlePoint | null = null;
    let snapped = false;
    if (home != null && stage != null && stage.width > 0 && stage.height > 0) {
      if (drag.snapped) {
        placed = { x: home.x, y: home.y };
        snapped = true;
      } else {
        const freeLeft = event.clientX - drag.offsetX;
        const freeTop = event.clientY - drag.offsetY;
        const raw = {
          x: (freeLeft - stage.left) / stage.width,
          y: (freeTop - stage.top) / stage.height,
        };
        placed = placeOnImage(raw, home, magnet, stage);
        snapped =
          placed != null && magnetizedPosition(placed, home, magnet, stage).snapped;
      }
    }
    this.clearPuzzleDrag();
    this.puzzlePieces.update((rows) =>
      rows.map((row, index) => (index === drag.index ? { ...row, placement: placed } : row)),
    );
    if (placed && snapped) {
      this.flashPuzzleFit(drag.index);
    }
    this.puzzleChange.emit();
  }

  private flashPuzzleFit(index: number): void {
    const previous = this.puzzleFitTimers.get(index);
    if (previous != null) {
      clearTimeout(previous);
    }
    this.puzzleFitFlash.update((rows) => new Set([...rows, index]));
    const timer = setTimeout(() => {
      this.puzzleFitTimers.delete(index);
      this.puzzleFitFlash.update((rows) => {
        const next = new Set(rows);
        next.delete(index);
        return next;
      });
    }, 1800);
    this.puzzleFitTimers.set(index, timer);
  }

  protected isPuzzleFit(index: number): boolean {
    return this.puzzleFitFlash().has(index);
  }

  private clearPuzzleDrag(): void {
    this.stopPieceListeners?.();
    this.stopPieceListeners = null;
    this.pieceDrag = null;
    this.puzzleDragIndex.set(null);
    this.puzzleGhost.set(null);
  }

  private async rebuildPuzzleBoard(q: ChildPlayViewQuestion): Promise<void> {
    const seq = ++this.puzzleBuildSeq;
    const cutSrc = imageSource(q.imageWebp);
    const pieces = q.puzzlePieces ?? [];
    if (!cutSrc || pieces.length === 0) {
      this.puzzlePieces.set([]);
      this.puzzleBoardSrc.set('');
      this.puzzleBoardAspect.set('4 / 3');
      return;
    }
    try {
      const cutImage = await loadImageElement(cutSrc);
      if (seq !== this.puzzleBuildSeq) {
        return;
      }
      const width = cutImage.naturalWidth || cutImage.width;
      const height = cutImage.naturalHeight || cutImage.height;
      const boardMode = q.boardMode ?? 'trous';
      let boardSrc = '';
      if (boardMode === 'fond') {
        boardSrc = imageSource(q.boardImageWebp);
      } else if (boardMode === 'blanc') {
        boardSrc = '';
      } else {
        boardSrc = punchPuzzlePieces(cutImage, width, height, pieces);
      }
      const views: PuzzlePiecePlayView[] = pieces.map((piece, index) =>
        toPuzzlePlayView(piece, index, cutImage, width, height, boardMode),
      );
      // Même ratio que l'image source : les slotX/Y restent justes sur le plateau blanc.
      this.puzzleBoardAspect.set(
        width > 0 && height > 0 ? `${width} / ${height}` : '4 / 3',
      );
      this.puzzleBoardSrc.set(boardSrc);
      this.puzzlePieces.set(views);
    } catch {
      if (seq !== this.puzzleBuildSeq) {
        return;
      }
      this.puzzlePieces.set([]);
      this.puzzleBoardSrc.set('');
      this.puzzleBoardAspect.set('4 / 3');
    }
  }

  protected onImageClick(event: MouseEvent): void {
    // Sans ordre, imageReady() autorise Valider dès le 1er clic : il ne doit pas bloquer les suivants.
    if (this.disabled() || !this.interactive()) {
      return;
    }
    if (this.isOrderedImage() && this.imageReady()) {
      return;
    }
    const host = event.currentTarget;
    if (!(host instanceof HTMLElement)) {
      return;
    }
    const bounds = host.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }
    const point = {
      x: (event.clientX - bounds.left) / bounds.width,
      y: (event.clientY - bounds.top) / bounds.height,
    };
    const zones = this.question().clickZones ?? [];
    let hit: ChildPlayViewClickZone | null = null;
    for (let index = zones.length - 1; index >= 0; index -= 1) {
      if (playZoneContains(zones[index], point)) {
        hit = zones[index];
        break;
      }
    }
    if (hit?.zoneId == null) {
      this.clickMiss.set(this.isOrderedImage());
      return;
    }
    const zoneId = hit.zoneId;
    if (this.isOrderedImage()) {
      const step = (this.question().clickSteps ?? [])[this.clickStep()];
      if (step?.zoneId !== zoneId) {
        this.clickMiss.set(true);
        return;
      }
      this.clickMiss.set(false);
      const rank = String(this.clickStep() + 1);
      this.clickMarks.update((marks) => [...marks, { n: rank, x: point.x, y: point.y, zoneId }]);
      this.clickStep.update((stepIndex) => stepIndex + 1);
      this.imageChange.emit();
      return;
    }
    const targetIds = new Set(
      (this.question().clickSteps ?? []).flatMap((step) =>
        step.zoneId === undefined ? [] : [step.zoneId],
      ),
    );
    // Sans ordre : seuls les éléments de la liste comptent (pas les leurres).
    if (targetIds.size > 0 && !targetIds.has(zoneId)) {
      this.clickMiss.set(true);
      return;
    }
    this.clickMiss.set(false);
    const ids = this.clickedZoneIds();
    if (ids.includes(zoneId)) {
      this.clickedZoneIds.set(ids.filter((id) => id !== zoneId));
      this.clickMarks.update((marks) =>
        marks
          .filter((mark) => mark.zoneId !== zoneId)
          .map((mark, index) => ({ ...mark, n: String(index + 1) })),
      );
    } else {
      this.clickedZoneIds.set([...ids, zoneId]);
      this.clickMarks.update((marks) => [
        ...marks,
        { n: String(ids.length + 1), x: point.x, y: point.y, zoneId },
      ]);
    }
    this.imageChange.emit();
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

function toPuzzlePlayView(
  piece: ChildPlayViewPuzzlePiece,
  index: number,
  cutImage: HTMLImageElement,
  width: number,
  height: number,
  boardMode: string,
): PuzzlePiecePlayView {
  const shape = {
    shape: piece.shape,
    points: piece.points,
    slotX: piece.slotX,
    slotY: piece.slotY,
    slotWidth: piece.slotWidth,
  };
  const frame = puzzlePieceFrame(shape);
  const home = puzzlePieceHome(shape, boardMode);
  return {
    key: piece.pieceId != null ? `p-${piece.pieceId}` : `p-${index}-${piece.label}`,
    pieceId: piece.pieceId,
    label: piece.label,
    shape: piece.shape,
    points: piece.points,
    slotX: piece.slotX,
    slotY: piece.slotY,
    slotWidth: piece.slotWidth,
    url: cutPuzzlePiece(cutImage, width, height, shape),
    frame,
    home,
    placement: null,
  };
}

/** Découpe le masque en mots pour un retour à la ligne sans couper un mot. */
function letterWordGroups(mask: string): { start: number; indexes: number[] }[] {
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
