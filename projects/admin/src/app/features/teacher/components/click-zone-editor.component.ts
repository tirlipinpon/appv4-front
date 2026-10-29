import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
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
  translateZone,
} from './click-zone';

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

  readonly imageSelected = output<string>();
  readonly zonesChange = output<ClickZone[]>();
  readonly imageError = output<string>();

  readonly draft = signal<ClickPoint[]>([]);
  /** Point bleu du tracé en cours que « Supprimer le point » retire. */
  readonly draftHandle = signal<number | null>(null);
  readonly selected = signal<number | null>(null);
  readonly selectedHandle = signal<number | null>(null);
  readonly adding = signal(false);

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

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }

  polygonAttribute = polygonAttribute;
  rectangleBox = rectangleBox;
  ellipseBox = ellipseBox;
  handles = handles;

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
