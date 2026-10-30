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
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { preparePhoto } from '../../../shared/prepare-photo/prepare-photo';
import {
  ClickPoint,
  ClickZone,
  appendPoint,
  changeShape,
  closesDraft,
  defaultEllipse,
  defaultRectangle,
  dropDraftPoint,
  ellipseBox,
  handles,
  moveHandle,
  polygonAttribute,
  rectangleBox,
  relativePoint,
  removePoint,
  pieceFrame,
  translateZone,
} from './click-zone';
import { clampMagnet, cutPiece, magnetizedPosition, placeOnImage, punchPieces } from './puzzle-piece';

/**
 * Dessin des zones sur l'image (SCRUM-181).
 * Les points sont en proportion du dessin : si l'écran change, les formes restent dessus.
 * L'image déposée passe par la même préparation WebP que les photos.
 */
@Component({
  selector: 'app-click-zone-editor',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule],
  templateUrl: './click-zone-editor.component.html',
  styleUrl: './click-zone-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClickZoneEditorComponent {
  readonly imageDataUrl = input('');
  readonly zones = input<ClickZone[]>([]);
  readonly disabled = input(false);
  readonly readonly = input(false);
  /** click : vert et rouge. puzzle : mêmes formes, sans côté juste ou faux. */
  readonly variant = input<'click' | 'puzzle'>('click');
  /** Magnétisme du puzzle, en fraction de la largeur de l'image. */
  readonly magnet = input(0.08);

  readonly imageSelected = output<string>();
  readonly zonesChange = output<ClickZone[]>();
  readonly imageError = output<string>();
  readonly magnetChange = output<number>();

  readonly draft = signal<ClickPoint[]>([]);
  /** Point bleu du tracé en cours que « Supprimer le point » retire. */
  readonly draftHandle = signal<number | null>(null);
  readonly selected = signal<number | null>(null);
  readonly selectedHandle = signal<number | null>(null);
  readonly adding = signal(false);
  /** Vignettes découpées dans les pixels de l'image, dans le même ordre que les pièces. */
  readonly pieceUrls = signal<string[]>([]);
  /** Photo affichée : les pièces déjà découpées y sont des trous transparents. */
  readonly holedUrl = signal('');
  readonly stageImage = computed(() =>
    this.variant() === 'puzzle' && this.holedUrl() ? this.holedUrl() : this.imageDataUrl(),
  );
  /** Coin haut-gauche de chaque pièce posée. Vide = la vignette reste en bas. */
  readonly placements = signal<(ClickPoint | null)[]>([]);
  readonly dragIndex = signal<number | null>(null);
  readonly magnetLive = signal(0.08);
  readonly magnetPercent = computed(() => Math.round(this.magnetLive() * 100));
  readonly ghost = signal<{ url: string; left: number; top: number; width: number } | null>(null);

  private readonly destroyRef = inject(DestroyRef);
  private paintToken = 0;
  private geometryKey = '';
  private stopPieceListeners: (() => void) | null = null;
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
    this.destroyRef.onDestroy(() => this.stopPieceListeners?.());
    effect((onCleanup) => {
      const url = this.imageDataUrl();
      const zones = this.zones();
      const puzzle = this.variant() === 'puzzle';
      if (!puzzle || !url || zones.length === 0) {
        this.pieceUrls.set([]);
        this.holedUrl.set('');
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
    this.placements.set(this.zones().map(() => null));
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
    const home = pieceFrame(this.zones()[drag.index]);
    const left = event.clientX - drag.offsetX;
    const top = event.clientY - drag.offsetY;
    const spot = magnetizedPosition(
      { x: (left - stage.left) / stage.width, y: (top - stage.top) / stage.height },
      home,
      this.magnetLive(),
      stage,
    );
    const url = this.pieceUrls()[drag.index] ?? '';
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
    const home = pieceFrame(this.zones()[drag.index]);
    const placed =
      stage != null && stage.width > 0 && stage.height > 0 && ghost != null
        ? placeOnImage(
            { x: (ghost.left - stage.left) / stage.width, y: (ghost.top - stage.top) / stage.height },
            home,
            this.magnetLive(),
            stage,
          )
        : null;
    this.stopPieceListeners?.();
    this.pieceDrag = null;
    this.dragIndex.set(null);
    this.ghost.set(null);
    this.placements.update((rows) => {
      const next = this.zones().map((_, index) => rows[index] ?? null);
      next[drag.index] = placed;
      return next;
    });
  }

  private paintPieces(url: string, zones: ClickZone[], token: number): void {
    const image = new Image();
    image.onload = () => {
      if (token !== this.paintToken) {
        return;
      }
      this.pieceUrls.set(
        zones.map((zone) => cutPiece(image, image.naturalWidth, image.naturalHeight, zone)),
      );
      this.holedUrl.set(punchPieces(image, image.naturalWidth, image.naturalHeight, zones));
    };
    image.src = url;
  }

  shapeName(zone: ClickZone, index: number): string {
    if (zone.label) {
      return zone.label;
    }
    return this.variant() === 'puzzle' ? `Pièce ${index + 1}` : `Zone ${index + 1}`;
  }

  async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled()) {
      return;
    }
    try {
      const prepared = await preparePhoto(file);
      this.imageSelected.emit(prepared.dataUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message) {
        this.imageError.emit(message);
      }
    }
  }

  onShapeDown(event: PointerEvent, zoneIndex: number): void {
    if (this.readonly() || this.disabled() || this.drag) {
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
    if (this.readonly() || this.disabled() || this.drag || this.shapeDrag) {
      return;
    }
    this.surface()?.nativeElement.setPointerCapture(event.pointerId);
    this.press = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
  }

  onSurfaceUp(event: PointerEvent): void {
    const press = this.press;
    this.press = null;
    if (!press || press.pointer !== event.pointerId || this.readonly() || this.disabled()) {
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
    this.draft.update((points) => [...points, point]);
    this.draftHandle.set(this.draft().length - 1);
    this.selectedHandle.set(null);
  }

  onDraftDown(event: PointerEvent, index: number): void {
    if (this.readonly() || this.disabled()) {
      return;
    }
    event.stopPropagation();
    event.preventDefault();
    this.press = null;
    this.draftHandle.set(index);
    this.selectedHandle.set(null);
  }

  onHandleDown(event: PointerEvent, zoneIndex: number, handleIndex: number): void {
    if (this.readonly() || this.disabled()) {
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
    if (points.length < 3 || this.disabled()) {
      return;
    }
    this.zonesChange.emit([
      ...this.zones(),
      { label: '', correct: true, shape: 'polygon', points },
    ]);
    this.draft.set([]);
    this.draftHandle.set(null);
    this.selectedHandle.set(null);
    this.selected.set(this.zones().length);
  }

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
    this.zonesChange.emit(this.zones().map((zone, current) => (current === index ? { ...zone, correct } : zone)));
  }

  setShape(index: number, shape: string): void {
    if (shape !== 'polygon' && shape !== 'rect' && shape !== 'ellipse') {
      return;
    }
    this.zonesChange.emit(this.zones().map((zone, current) => (current === index ? changeShape(zone, shape) : zone)));
  }

  removeZone(index: number): void {
    this.zonesChange.emit(this.zones().filter((_, current) => current !== index));
    this.selected.set(null);
    this.selectedHandle.set(null);
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
    this.zonesChange.emit([...this.zones(), zone]);
    this.selected.set(this.zones().length);
    this.selectedHandle.set(null);
    this.draft.set([]);
    this.draftHandle.set(null);
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
