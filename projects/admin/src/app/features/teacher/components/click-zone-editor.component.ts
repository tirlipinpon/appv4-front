import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { preparePhoto } from '../../../shared/prepare-photo/prepare-photo';
import {
  ClickPoint,
  ClickZone,
  appendClickZone,
  appendDraftPoint,
  appendPoint,
  changeShape,
  closesDraft,
  compactClickOrders,
  defaultEllipse,
  defaultRectangle,
  dropDraftPoint,
  ellipseBox,
  handles,
  moveClickOrder,
  moveHandle,
  polygonAttribute,
  POLYGON_POINTS_MAX,
  rectangleBox,
  relativePoint,
  removePoint,
  pieceFrame,
  translateZone,
  withClickSide,
  zoneCenter,
  zoneContains,
} from './click-zone';
import { clampMagnet, cutPiece, magnetizedPosition, placeOnImage, punchPieces } from './puzzle-piece';
import { PuzzleBoardMode, PUZZLE_BOARD_MODE } from './question-form.model';

/**
 * Dessin des zones sur l'image (SCRUM-181).
 * Les points sont en proportion du dessin : si l'écran change, les formes restent dessus.
 * L'image déposée passe par la même préparation WebP que les photos.
 * En puzzle : image de découpe pour tracer les pièces ; plateau de jeu selon
 * {@link boardMode} (fond dédié, cadre blanc, ou image trouée).
 */
@Component({
  selector: 'app-click-zone-editor',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule],
  templateUrl: './click-zone-editor.component.html',
  styleUrl: './click-zone-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClickZoneEditorComponent {
  readonly imageDataUrl = input('');
  /** Plateau de jeu : fond | blanc | trous. */
  readonly boardMode = input<PuzzleBoardMode>(PUZZLE_BOARD_MODE.TROUS);
  /** Fond de jeu puzzle : utilisé seulement en mode fond. */
  readonly boardImageDataUrl = input('');
  readonly zones = input<ClickZone[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  /** click : vert et rouge. puzzle : mêmes formes, sans côté juste ou faux. */
  readonly variant = input<'click' | 'puzzle'>('click');
  /** Magnétisme du puzzle, en fraction de la largeur de l'image. */
  readonly magnet = input(0.08);

  readonly imageSelected = output<string>();
  readonly boardModeChange = output<PuzzleBoardMode>();
  readonly boardImageSelected = output<string>();
  readonly zonesChange = output<ClickZone[]>();
  readonly imageError = output<string>();
  readonly magnetChange = output<number>();

  readonly boardModes = PUZZLE_BOARD_MODE;

  readonly draft = signal<ClickPoint[]>([]);
  /** Point bleu du tracé en cours que « Supprimer le point » retire. */
  readonly draftHandle = signal<number | null>(null);
  readonly selected = signal<number | null>(null);
  readonly selectedHandle = signal<number | null>(null);
  readonly adding = signal(false);
  /** Vignettes découpées dans les pixels de l'image, dans le même ordre que les pièces. */
  readonly pieceUrls = signal<string[]>([]);
  /** Image de découpe avec les emplacements des pièces en transparent (secours sans fond). */
  readonly punchedUrl = signal('');
  /**
   * En édition : image de découpe pleine.
   * En jeu (aperçu / lecture seule) : plateau selon {@link boardMode}.
   */
  readonly playPreview = signal(false);
  readonly inPlayView = computed(
    () => this.variant() === 'puzzle' && (this.readonly() || this.playPreview()),
  );
  /**
   * Mode fond : image de plateau distincte de la découpe.
   * Sinon (même fichier / migration) : pas de vrai fond dédié.
   */
  readonly hasDistinctBoard = computed(() => {
    if (this.boardMode() !== PUZZLE_BOARD_MODE.FOND) {
      return false;
    }
    const board = this.boardImageDataUrl();
    const cut = this.imageDataUrl();
    return !!board && !!cut && board !== cut;
  });
  /** Plateau prêt pour l'aperçu enfant selon le mode choisi. */
  readonly playBoardReady = computed(() => {
    switch (this.boardMode()) {
      case PUZZLE_BOARD_MODE.FOND:
        return this.hasDistinctBoard();
      case PUZZLE_BOARD_MODE.BLANC:
        return !!this.imageDataUrl();
      case PUZZLE_BOARD_MODE.TROUS:
        return !!this.punchedUrl();
    }
  });
  readonly showingBoard = computed(() => this.inPlayView() && this.playBoardReady());
  readonly usingCustomBoard = computed(
    () => this.inPlayView() && this.boardMode() === PUZZLE_BOARD_MODE.FOND && this.hasDistinctBoard(),
  );
  readonly usingBlankBoard = computed(
    () => this.inPlayView() && this.boardMode() === PUZZLE_BOARD_MODE.BLANC,
  );
  readonly usingPunchedBoard = computed(
    () => this.inPlayView() && this.boardMode() === PUZZLE_BOARD_MODE.TROUS,
  );
  readonly stageSrc = computed(() => {
    if (!this.inPlayView()) {
      return this.imageDataUrl();
    }
    switch (this.boardMode()) {
      case PUZZLE_BOARD_MODE.FOND:
        return this.hasDistinctBoard() ? this.boardImageDataUrl() : this.imageDataUrl();
      case PUZZLE_BOARD_MODE.BLANC:
        // Garde le ratio de la découpe ; le CSS blanchit le plateau.
        return this.imageDataUrl();
      case PUZZLE_BOARD_MODE.TROUS:
        return this.punchedUrl() || this.imageDataUrl();
    }
  });
  /** En mode jeu, index des formes déjà révélées par un clic. */
  readonly shown = signal<number[]>([]);
  /** Coin haut-gauche de chaque pièce posée. Vide = la vignette reste en bas. */
  readonly placements = signal<(ClickPoint | null)[]>([]);
  readonly dragIndex = signal<number | null>(null);
  readonly magnetLive = signal(0.08);
  readonly magnetPercent = computed(() => Math.round(this.magnetLive() * 100));
  readonly ghost = signal<{ url: string; left: number; top: number; width: number } | null>(null);
  /** Index des pièces qui viennent de coller à l'emplacement (contour vert ~2 s). */
  readonly fitFlash = signal<ReadonlySet<number>>(new Set());

  private readonly destroyRef = inject(DestroyRef);
  private paintToken = 0;
  private geometryKey = '';
  /** Évite de forcer le plateau à chaque tick une fois l'utilisateur revenu à la découpe. */
  private autoPlayArmed = false;
  private stopPieceListeners: (() => void) | null = null;
  private readonly fitFlashTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private pieceDrag: {
    index: number;
    pointer: number;
    offsetX: number;
    offsetY: number;
    width: number;
  } | null = null;

  private readonly stage = viewChild<ElementRef<HTMLElement>>('stage');
  private readonly surface = viewChild<ElementRef<SVGSVGElement>>('surface');
  private readonly zoneList = viewChild<ElementRef<HTMLUListElement>>('zoneList');
  private drag: { zone: number; handle: number; pointer: number } | null = null;
  private shapeDrag: {
    zone: number;
    pointer: number;
    origin: ClickZone;
    start: ClickPoint;
    moved: boolean;
  } | null = null;
  private press: { x: number; y: number; pointer: number } | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopPieceListeners?.();
      this.clearFitFlash();
    });
    effect((onCleanup) => {
      const url = this.imageDataUrl();
      const zones = this.zones();
      const puzzle = this.variant() === 'puzzle';
      if (!puzzle || !url || zones.length === 0) {
        this.pieceUrls.set([]);
        this.punchedUrl.set('');
        this.playPreview.set(false);
        return;
      }
      const token = ++this.paintToken;
      const snapshot = zones.map((zone) => ({
        ...zone,
        points: zone.points.map((point) => ({ ...point })),
      }));
      const timer = setTimeout(() => this.paintPieces(url, snapshot, token), 40);
      onCleanup(() => clearTimeout(timer));
    });

    effect(() => {
      this.magnetLive.set(clampMagnet(this.magnet()));
    });

    effect(() => {
      const ready =
        this.variant() === 'puzzle' &&
        !this.readonly() &&
        this.boardMode() === PUZZLE_BOARD_MODE.FOND &&
        this.hasDistinctBoard() &&
        this.zones().length >= 2;
      if (!ready) {
        this.autoPlayArmed = false;
        return;
      }
      if (!this.autoPlayArmed) {
        this.autoPlayArmed = true;
        this.playPreview.set(true);
        this.clearPlacements();
      }
    });

    effect(() => {
      // Changer de mode plateau ramène à l'édition pour éviter un aperçu incohérent.
      this.boardMode();
      untracked(() => {
        if (this.playPreview()) {
          this.playPreview.set(false);
          this.clearPlacements();
        }
      });
    });

    effect(() => {
      const key = this.zones()
        .map((zone) => {
          const frame = pieceFrame(zone);
          return `${zone.shape}:${frame.x}:${frame.y}:${frame.width}:${frame.height}`;
        })
        .join('|');
      if (key === this.geometryKey) {
        return;
      }
      this.geometryKey = key;
      this.stopPieceListeners?.();
      this.pieceDrag = null;
      this.dragIndex.set(null);
      this.ghost.set(null);
      this.clearFitFlash();
      this.placements.set(this.zones().map(() => null));
    });
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  polygonAttribute = polygonAttribute;
  rectangleBox = rectangleBox;
  ellipseBox = ellipseBox;
  handles = handles;
  pieceFrame = pieceFrame;

  pieceWidth(zone: ClickZone): number {
    return this.pieceFrame(zone).width * 100;
  }

  /** En édition les formes restent visibles. En jeu, seulement après un clic dessus. */
  shapeShown(index: number): boolean {
    if (this.variant() !== 'click') {
      return false;
    }
    if (!this.readonly()) {
      return true;
    }
    return this.shown().includes(index);
  }

  inTray(index: number): boolean {
    return this.dragIndex() !== index && this.placements()[index] == null;
  }

  placedSpot(index: number): ClickPoint | null {
    if (this.dragIndex() === index) {
      return null;
    }
    return this.placements()[index] ?? null;
  }

  setMagnet(raw: string): void {
    const value = clampMagnet(Number(raw) / 100);
    this.magnetLive.set(value);
    this.magnetChange.emit(value);
  }

  clearPlacements(): void {
    this.stopPieceListeners?.();
    this.pieceDrag = null;
    this.dragIndex.set(null);
    this.ghost.set(null);
    this.clearFitFlash();
    this.placements.set(this.zones().map(() => null));
  }

  /** True pendant ~2 s après un lâcher collé sur l'emplacement. */
  isFitFlash(index: number): boolean {
    return this.fitFlash().has(index);
  }

  setBoardMode(mode: PuzzleBoardMode): void {
    if (this.disabled() || this.readonly() || this.variant() !== 'puzzle') {
      return;
    }
    this.boardModeChange.emit(mode);
  }

  /** Passe en aperçu enfant (fond / blanc / trous) ou revient à l'édition. */
  togglePlayPreview(): void {
    if (this.readonly() || this.variant() !== 'puzzle') {
      return;
    }
    if (!this.playPreview() && !this.playBoardReady()) {
      return;
    }
    const next = !this.playPreview();
    this.playPreview.set(next);
    if (next) {
      this.selected.set(null);
      this.selectedHandle.set(null);
      this.draft.set([]);
      this.draftHandle.set(null);
      this.adding.set(false);
      if (this.boardMode() === PUZZLE_BOARD_MODE.BLANC) {
        // En édition : montrer les emplacements déjà posés par le prof.
        this.placements.set(this.zones().map((zone) => (zone.slot ? { ...zone.slot } : null)));
      } else {
        this.clearPlacements();
      }
    }
  }

  /**
   * Cible du magnétisme : découpe (trous/fond), ou slot posé par le prof (blanc).
   * Sans slot en mode blanc : hors plateau pour ne pas coller sur la découpe.
   */
  private pieceHome(zone: ClickZone): { x: number; y: number; width: number; height: number } {
    const frame = pieceFrame(zone);
    if (this.boardMode() !== PUZZLE_BOARD_MODE.BLANC) {
      return frame;
    }
    if (zone.slot) {
      return { x: zone.slot.x, y: zone.slot.y, width: frame.width, height: frame.height };
    }
    return { x: -1, y: -1, width: frame.width, height: frame.height };
  }

  /**
   * Pose des emplacements en cadre blanc (édition professeur).
   * Pas de magnétisme : sinon la pièce recolle sur l'ancien slot et on ne peut plus la décaler.
   */
  private placingBlancSlots(): boolean {
    return (
      !this.readonly() &&
      this.variant() === 'puzzle' &&
      this.boardMode() === PUZZLE_BOARD_MODE.BLANC
    );
  }

  /** Lâcher libre sur le plateau (sans coller) : reste si la pièce touche encore l'image. */
  private freePlaceOnImage(
    raw: { x: number; y: number },
    frame: { width: number; height: number },
  ): { x: number; y: number } | null {
    const onImage =
      raw.x < 1 && raw.y < 1 && raw.x + frame.width > 0 && raw.y + frame.height > 0;
    if (!onImage) {
      return null;
    }
    return { x: raw.x, y: raw.y };
  }

  /** Édition des formes : pas en lecture seule ni en aperçu trous. */
  canEditShapes(): boolean {
    return !this.readonly() && !this.playPreview();
  }

  onPieceDown(event: PointerEvent, index: number): void {
    if (this.disabled() || this.variant() !== 'puzzle') {
      return;
    }
    const target = event.currentTarget;
    const url = this.pieceUrls()[index];
    if (!(target instanceof HTMLElement) || !url) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.stopPieceListeners?.();
    const rect = target.getBoundingClientRect();
    const pointer = event.pointerId;
    this.pieceDrag = {
      index,
      pointer,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
    };
    this.dragIndex.set(index);
    this.ghost.set({ url, left: rect.left, top: rect.top, width: rect.width });
    const move = (next: PointerEvent) => {
      if (next.pointerId === pointer) {
        this.onPieceMove(next);
      }
    };
    const up = (next: PointerEvent) => {
      if (next.pointerId !== pointer) {
        return;
      }
      this.finishPieceDrag(next);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    this.stopPieceListeners = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      this.stopPieceListeners = null;
    };
  }

  private onPieceMove(event: PointerEvent): void {
    const drag = this.pieceDrag;
    const stage = this.stage()?.nativeElement.getBoundingClientRect();
    if (!drag || event.pointerId !== drag.pointer || !stage || stage.width <= 0 || stage.height <= 0) {
      return;
    }
    if (event.cancelable) {
      event.preventDefault();
    }
    const left = event.clientX - drag.offsetX;
    const top = event.clientY - drag.offsetY;
    const url = this.pieceUrls()[drag.index] ?? '';
    // Pose libre des slots : le fantôme suit le doigt, sans coller à l'ancien emplacement.
    if (this.placingBlancSlots()) {
      this.ghost.set({ url, left, top, width: drag.width });
      return;
    }
    const home = this.pieceHome(this.zones()[drag.index]);
    const spot = magnetizedPosition(
      { x: (left - stage.left) / stage.width, y: (top - stage.top) / stage.height },
      home,
      this.magnetLive(),
      stage,
    );
    this.ghost.set(
      spot.snapped
        ? {
            url,
            left: stage.left + home.x * stage.width,
            top: stage.top + home.y * stage.height,
            width: home.width * stage.width,
          }
        : { url, left, top, width: drag.width },
    );
  }

  private finishPieceDrag(event: PointerEvent): void {
    const drag = this.pieceDrag;
    if (!drag || event.pointerId !== drag.pointer) {
      return;
    }
    const stage = this.stage()?.nativeElement.getBoundingClientRect();
    const ghost = this.ghost();
    const zone = this.zones()[drag.index];
    const home = this.pieceHome(zone);
    const raw =
      stage != null && stage.width > 0 && stage.height > 0 && ghost != null
        ? {
            x: (ghost.left - stage.left) / stage.width,
            y: (ghost.top - stage.top) / stage.height,
          }
        : null;
    const placingSlots = this.placingBlancSlots();
    const snap =
      raw != null && stage != null && !placingSlots
        ? magnetizedPosition(raw, home, this.magnetLive(), stage)
        : null;
    const placed =
      raw == null
        ? null
        : placingSlots
          ? this.freePlaceOnImage(raw, home)
          : placeOnImage(raw, home, this.magnetLive(), stage!);
    this.stopPieceListeners?.();
    this.pieceDrag = null;
    this.dragIndex.set(null);
    this.ghost.set(null);
    this.placements.update((rows) => {
      const next = this.zones().map((_, index) => rows[index] ?? null);
      next[drag.index] = placed;
      return next;
    });
    // Cadre blanc en édition : la pose du prof devient l'emplacement cible enregistré.
    // Pas de clamp 0–1 : une pièce déjà au bord gauche (ex. roue arrière) doit pouvoir déborder un peu.
    if (placed && placingSlots) {
      const slot = { x: placed.x, y: placed.y };
      this.placements.update((rows) => {
        const next = this.zones().map((_, index) => rows[index] ?? null);
        next[drag.index] = slot;
        return next;
      });
      this.zonesChange.emit(
        this.zones().map((row, index) => (index === drag.index ? { ...row, slot } : row)),
      );
    } else if (placed && snap?.snapped) {
      this.flashFit(drag.index);
    }
  }

  /** Contour vert ~2 s quand la pièce colle sur son emplacement. */
  private flashFit(index: number): void {
    const previous = this.fitFlashTimers.get(index);
    if (previous != null) {
      clearTimeout(previous);
    }
    this.fitFlash.update((rows) => new Set([...rows, index]));
    const timer = setTimeout(() => {
      this.fitFlashTimers.delete(index);
      this.fitFlash.update((rows) => {
        const next = new Set(rows);
        next.delete(index);
        return next;
      });
    }, 2000);
    this.fitFlashTimers.set(index, timer);
  }

  private clearFitFlash(): void {
    for (const timer of this.fitFlashTimers.values()) {
      clearTimeout(timer);
    }
    this.fitFlashTimers.clear();
    this.fitFlash.set(new Set());
  }

  private paintPieces(url: string, zones: ClickZone[], token: number): void {
    const image = new Image();
    image.onload = () => {
      if (token !== this.paintToken) {
        return;
      }
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      this.pieceUrls.set(zones.map((zone) => cutPiece(image, width, height, zone)));
      this.punchedUrl.set(punchPieces(image, width, height, zones));
    };
    image.src = url;
  }

  shapeName(zone: ClickZone, index: number): string {
    if (zone.label) {
      return zone.label;
    }
    return this.variant() === 'puzzle' ? `Pièce ${index + 1}` : `Zone ${index + 1}`;
  }

  async onFile(event: Event, kind: 'cut' | 'board' = 'cut'): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled()) {
      return;
    }
    try {
      const prepared = await preparePhoto(file);
      if (kind === 'board') {
        this.boardImageSelected.emit(prepared.dataUrl);
      } else {
        this.imageSelected.emit(prepared.dataUrl);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message) {
        this.imageError.emit(message);
      }
    }
  }

  onShapeDown(event: PointerEvent, zoneIndex: number): void {
    if (!this.canEditShapes() || this.disabled() || this.drag) {
      return;
    }
    const point = this.eventPoint(event);
    const zone = this.zones()[zoneIndex];
    if (!point || !zone) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    try {
      (event.currentTarget as Element).setPointerCapture(event.pointerId);
    } catch {
      // La sélection reste valable même si le navigateur refuse la capture.
    }
    this.shapeDrag = { zone: zoneIndex, pointer: event.pointerId, origin: zone, start: point, moved: false };
    this.selectZone(zoneIndex);
    this.press = null;
  }

  onShapeMove(event: PointerEvent): void {
    const drag = this.shapeDrag;
    if (!drag || event.pointerId !== drag.pointer) {
      return;
    }
    const point = this.eventPoint(event);
    if (!point) {
      return;
    }
    const dx = point.x - drag.start.x;
    const dy = point.y - drag.start.y;
    if (Math.hypot(dx, dy) > 0.01) {
      drag.moved = true;
    }
    const moved = translateZone(drag.origin, dx, dy);
    this.zonesChange.emit(this.zones().map((row, index) => (index === drag.zone ? moved : row)));
  }

  onShapeUp(event: PointerEvent): void {
    const drag = this.shapeDrag;
    if (drag?.pointer !== event.pointerId) {
      return;
    }
    this.shapeDrag = null;
    if (!drag.moved) {
      this.revealSelected();
    }
  }

  onSurfaceDown(event: PointerEvent): void {
    if (this.disabled() || this.drag || this.shapeDrag) {
      return;
    }
    // Édition des formes, ou clic en lecture seule pour révéler une zone.
    if (!this.canEditShapes() && !(this.readonly() && this.variant() === 'click')) {
      return;
    }
    try {
      this.surface()?.nativeElement.setPointerCapture(event.pointerId);
    } catch {
      // Le clic reste valable si le navigateur refuse la capture.
    }
    this.press = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
  }

  onSurfaceUp(event: PointerEvent): void {
    const press = this.press;
    this.press = null;
    if (!press || press.pointer !== event.pointerId || this.disabled()) {
      return;
    }
    if (this.readonly()) {
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) {
        return;
      }
      const point = this.eventPoint(event);
      if (point) {
        this.revealAt(point);
      }
      return;
    }
    if (!this.canEditShapes()) {
      return;
    }
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > 4) {
      return;
    }
    const point = this.eventPoint(event);
    if (!point) {
      return;
    }
    if (closesDraft(this.draft(), point)) {
      this.finishDraft();
      return;
    }
    const selected = this.selected();
    if (this.adding() && selected != null) {
      const zone = this.zones()[selected];
      if (zone) {
        this.zonesChange.emit(this.zones().map((row, index) => (index === selected ? appendPoint(row, point) : row)));
      }
      this.adding.set(false);
      return;
    }
    if (this.draft().length >= POLYGON_POINTS_MAX) {
      return;
    }
    this.draft.update((points) => appendDraftPoint(points, point));
    this.draftHandle.set(this.draft().length - 1);
    this.selectedHandle.set(null);
  }

  onDraftDown(event: PointerEvent, index: number): void {
    if (!this.canEditShapes() || this.disabled()) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.press = null;
    this.draftHandle.set(index);
    this.selectedHandle.set(null);
  }

  onHandleDown(event: PointerEvent, zoneIndex: number, handleIndex: number): void {
    if (!this.canEditShapes() || this.disabled()) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    this.drag = { zone: zoneIndex, handle: handleIndex, pointer: event.pointerId };
    this.selected.set(zoneIndex);
    this.selectedHandle.set(handleIndex);
    this.press = null;
  }

  onHandleMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointer) {
      return;
    }
    const point = this.eventPoint(event);
    const zone = this.zones()[drag.zone];
    if (!point || !zone) {
      return;
    }
    this.zonesChange.emit(
      this.zones().map((row, index) => (index === drag.zone ? moveHandle(row, drag.handle, point) : row)),
    );
  }

  onHandleUp(event: PointerEvent): void {
    if (this.drag?.pointer === event.pointerId) {
      this.drag = null;
    }
  }

  finishDraft(): void {
    const points = this.draft();
    // Refuse un polygone hors bornes backend (3–24) plutôt que de le tronquer à l'envoi.
    if (points.length < 3 || points.length > POLYGON_POINTS_MAX || this.disabled()) {
      return;
    }
    const zone: ClickZone = { label: '', correct: true, shape: 'polygon', points };
    this.zonesChange.emit(this.variant() === 'click' ? appendClickZone(this.zones(), zone) : [...this.zones(), zone]);
    this.draft.set([]);
    this.draftHandle.set(null);
    this.selectedHandle.set(null);
    this.selected.set(this.zones().length);
  }

  /** Plafond visible pendant le tracé : même règle que le backend. */
  readonly draftPointsMax = POLYGON_POINTS_MAX;

  addRectangle(): void {
    this.emitZone(defaultRectangle());
  }

  addEllipse(): void {
    this.emitZone(defaultEllipse());
  }

  selectZone(index: number): void {
    this.selected.set(index);
    this.selectedHandle.set(null);
    this.adding.set(false);
  }

  rename(index: number, label: string): void {
    this.zonesChange.emit(this.zones().map((zone, current) => (current === index ? { ...zone, label } : zone)));
  }

  mark(index: number, correct: boolean): void {
    this.zonesChange.emit(withClickSide(this.zones(), index, correct));
  }

  /** Échange le rang de clic avec la zone correcte précédente ou suivante. */
  moveClick(index: number, delta: -1 | 1): void {
    if (!this.canMoveClick(index, delta)) {
      return;
    }
    this.zonesChange.emit(moveClickOrder(this.zones(), index, delta));
  }

  canMoveClick(index: number, delta: -1 | 1): boolean {
    const zone = this.zones()[index];
    const order = zone?.clickOrder;
    if (!zone?.correct || order == null || this.disabled() || !this.canEditShapes()) {
      return false;
    }
    const target = order + delta;
    return this.zones().some((row) => row.correct && row.clickOrder === target);
  }

  showClickOrder(zone: ClickZone): boolean {
    return this.variant() === 'click' && zone.correct && zone.clickOrder != null;
  }

  orderSpot(zone: ClickZone): ClickPoint {
    return zoneCenter(zone);
  }

  setShape(index: number, shape: string): void {
    if (shape !== 'polygon' && shape !== 'rect' && shape !== 'ellipse') {
      return;
    }
    this.zonesChange.emit(this.zones().map((zone, current) => (current === index ? changeShape(zone, shape) : zone)));
  }

  removeZone(index: number): void {
    const remaining = this.zones().filter((_, current) => current !== index);
    this.zonesChange.emit(this.variant() === 'click' ? compactClickOrders(remaining) : remaining);
    this.selected.set(null);
    this.selectedHandle.set(null);
  }

  /**
   * Change la superposition : index bas = derrière, index haut = devant.
   * {@code delta} −1 = derrière, +1 = devant.
   */
  moveLayer(index: number, delta: -1 | 1): void {
    const next = index + delta;
    const zones = this.zones();
    if (next < 0 || next >= zones.length || this.disabled() || !this.canEditShapes()) {
      return;
    }
    const reordered = [...zones];
    const [piece] = reordered.splice(index, 1);
    reordered.splice(next, 0, piece);
    const placements = this.zones().map((_, i) => this.placements()[i] ?? null);
    const [spot] = placements.splice(index, 1);
    placements.splice(next, 0, spot ?? null);
    this.placements.set(placements);
    // Aligne la clé géométrie pour que l'effet ne vide pas les poses après le reorder.
    this.geometryKey = reordered
      .map((zone) => {
        const frame = pieceFrame(zone);
        return `${zone.shape}:${frame.x}:${frame.y}:${frame.width}:${frame.height}`;
      })
      .join('|');
    this.selected.set(next);
    this.selectedHandle.set(null);
    this.zonesChange.emit(reordered);
  }

  canMoveLayer(index: number, delta: -1 | 1): boolean {
    const next = index + delta;
    return next >= 0 && next < this.zones().length && this.canEditShapes() && !this.disabled();
  }

  startAdding(): void {
    const selected = this.selected();
    const zone = selected == null ? undefined : this.zones()[selected];
    if (!zone || zone.shape !== 'polygon') {
      return;
    }
    this.adding.set(true);
  }

  deleteSelectedPoint(): void {
    if (this.draft().length > 0) {
      const index = this.draftHandle() ?? this.draft().length - 1;
      const next = dropDraftPoint(this.draft(), index);
      this.draft.set(next);
      this.draftHandle.set(next.length === 0 ? null : Math.min(index, next.length - 1));
      return;
    }
    const zoneIndex = this.selected();
    const handle = this.selectedHandle();
    if (zoneIndex == null || handle == null) {
      return;
    }
    const zone = this.zones()[zoneIndex];
    if (!zone) {
      return;
    }
    this.zonesChange.emit(
      this.zones().map((row, index) => (index === zoneIndex ? removePoint(row, handle) : row)),
    );
    this.selectedHandle.set(null);
  }

  canDeletePoint(): boolean {
    if (this.draft().length > 0) {
      return true;
    }
    const zoneIndex = this.selected();
    const zone = zoneIndex == null ? undefined : this.zones()[zoneIndex];
    return !!zone && zone.shape === 'polygon' && zone.points.length > 3 && this.selectedHandle() != null;
  }

  private revealSelected(): void {
    queueMicrotask(() => {
      this.zoneList()?.nativeElement.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
    });
  }

  private emitZone(zone: ClickZone): void {
    if (this.disabled()) {
      return;
    }
    const next = this.variant() === 'click' ? appendClickZone(this.zones(), zone) : [...this.zones(), zone];
    this.zonesChange.emit(next);
    this.selected.set(this.zones().length);
    this.selectedHandle.set(null);
    this.draft.set([]);
    this.draftHandle.set(null);
  }

  private revealAt(point: ClickPoint): void {
    const zones = this.zones();
    for (let index = zones.length - 1; index >= 0; index -= 1) {
      const zone = zones[index];
      if (zone && zoneContains(zone, point)) {
        this.shown.update((ids) => (ids.includes(index) ? ids : [...ids, index]));
        return;
      }
    }
  }

  private eventPoint(event: PointerEvent): ClickPoint | null {
    const svg = this.surface()?.nativeElement;
    if (!svg) {
      return null;
    }
    const bounds = svg.getBoundingClientRect();
    return relativePoint(bounds, event.clientX, event.clientY);
  }
}
