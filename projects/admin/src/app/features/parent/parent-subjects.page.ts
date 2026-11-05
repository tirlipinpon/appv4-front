import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  ChildSubjectOffer,
  ChildSubjectsResponse,
  ParentChildResponse,
  ParentSubjectsResponse,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { avatarEmoji } from '../../shared/avatars/account-avatars';
import { PhotoObjectUrlBag } from '../../shared/photos/photo-object-url-bag';
import { sexLabel } from './child-sex';
import { ChildSubjectsService } from './data-access/child-subjects.service';
import { ParentChildrenService } from './data-access/parent-children.service';

/**
 * Chaque enfant avec ses matières (SCRUM-162).
 * Celles de son école et de son année sont déjà dans la liste.
 * Le portrait vient de la fiche enfant, comme sur la page Mes enfants.
 */
@Component({
  selector: 'app-parent-subjects-page',
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, SpaceHeader],
  templateUrl: './parent-subjects.page.html',
  styleUrl: './child-subjects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentSubjectsPage implements OnInit, OnDestroy {
  private readonly api = inject(ChildSubjectsService);
  private readonly childrenApi = inject(ParentChildrenService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly photoBag = new PhotoObjectUrlBag();

  readonly emoji = avatarEmoji;
  readonly sexLabel = sexLabel;
  readonly children = signal<ChildSubjectsResponse[]>([]);
  readonly searchQueries = signal<Readonly<Record<number, string>>>({});
  readonly searchGrades = signal<Readonly<Record<number, string>>>({});
  readonly searchResults = signal<Readonly<Record<number, ChildSubjectOffer[]>>>({});
  readonly searchCursors = signal<Readonly<Record<number, number | null>>>({});
  readonly searchHistory = signal<Readonly<Record<number, number[]>>>({});
  readonly searched = signal<Readonly<Record<number, boolean>>>({});
  readonly searchLoading = signal<Readonly<Record<number, boolean>>>({});
  private readonly searchSeq = new Map<number, number>();
  readonly profiles = signal<ParentChildResponse[]>([]);
  readonly photos = signal<Record<number, string>>({});
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly pending = signal<{ childId: number; subjectId: number } | null>(null);

  ngOnInit(): void {
    this.api
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => this.show(body),
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          this.error.set(httpErrorMessage(err, 'Matières indisponibles.'));
        },
      });
    this.childrenApi
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (body) => {
          const rows = body.children ?? [];
          this.profiles.set(rows);
          this.loadPhotos(rows);
        },
        error: () => {
          this.profiles.set([]);
        },
      });
  }

  ngOnDestroy(): void {
    for (const [childId, seq] of this.searchSeq) this.searchSeq.set(childId, seq + 1);
    this.photoBag.destroy();
    this.photos.set({});
  }

  profile(childId: number | undefined): ParentChildResponse | undefined {
    if (childId === undefined || childId === null) {
      return undefined;
    }
    return this.profiles().find((child) => child.id === childId);
  }

  photoOf(childId: number | undefined): string | null {
    const face = this.profile(childId);
    if (childId === undefined || childId === null || !face?.hasPhoto) {
      return null;
    }
    return this.photos()[childId] ?? null;
  }

  showAge(face: ParentChildResponse | undefined): boolean {
    return face?.age !== undefined && face.age !== null;
  }

  hasClass(child: ChildSubjectsResponse): boolean {
    return child.schoolId != null && !!child.grade?.trim();
  }

  catalogEmpty(child: ChildSubjectsResponse): boolean {
    return (child.chosen ?? []).length === 0 && this.searched()[child.childId ?? -1] === true
      && (this.searchResults()[child.childId ?? -1] ?? []).length === 0;
  }

  chosen(child: ChildSubjectsResponse, scolaire: boolean): ChildSubjectOffer[] {
    const order = new Intl.Collator('fr', { sensitivity: 'base' });
    return this.lines(child.chosen, scolaire).sort((left, right) =>
      order.compare(left.name ?? '', right.name ?? '') || order.compare(left.teacherName ?? '', right.teacherName ?? ''),
    );
  }

  proposed(child: ChildSubjectsResponse, scolaire: boolean): ChildSubjectOffer[] {
    return this.lines(this.searchResults()[child.childId ?? -1], scolaire);
  }

  add(childId: number | undefined, subjectId: number | undefined): void {
    if (this.saving() || childId == null || subjectId == null) {
      return;
    }
    this.error.set(null);
    this.searchSeq.set(childId, (this.searchSeq.get(childId) ?? 0) + 1);
    this.searchLoading.update((rows) => ({ ...rows, [childId]: false }));
    this.saving.set(true);
    this.api.add(childId, subjectId).subscribe({
      next: (offer) => {
        this.children.update((rows) => rows.map((child) => child.childId === childId
          ? { ...child, chosen: [...(child.chosen ?? []), offer] } : child));
        this.searchResults.update((rows) => ({
          ...rows, [childId]: (rows[childId] ?? []).filter((item) => item.subjectId !== offer.subjectId),
        }));
        this.saving.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Ajout impossible.'));
      },
    });
  }

  askRemove(childId: number | undefined, subjectId: number | undefined): void {
    if (childId == null || subjectId == null) {
      return;
    }
    this.pending.set({ childId, subjectId });
  }

  cancelRemove(): void {
    this.pending.set(null);
  }

  pendingFor(childId: number | undefined, subjectId: number | undefined): boolean {
    const current = this.pending();
    return current != null && current.childId === childId && current.subjectId === subjectId;
  }

  confirmText(child: ChildSubjectsResponse, offer: ChildSubjectOffer): string {
    return `Retirer ${offer.name} de ${offer.teacherName} de la liste de ${child.firstName} ?`;
  }

  confirmRemove(childId: number | undefined, subjectId: number | undefined): void {
    if (this.saving() || childId == null || subjectId == null) {
      return;
    }
    this.error.set(null);
    this.searchSeq.set(childId, (this.searchSeq.get(childId) ?? 0) + 1);
    this.searchLoading.update((rows) => ({ ...rows, [childId]: false }));
    this.saving.set(true);
    this.api.remove(childId, subjectId).subscribe({
      next: () => {
        this.children.update((rows) => rows.map((child) => child.childId === childId
          ? { ...child, chosen: (child.chosen ?? []).filter((item) => item.subjectId !== subjectId) } : child));
        this.pending.set(null);
        this.saving.set(false);
        if (this.searched()[childId]) this.search(childId);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Retrait impossible.'));
      },
    });
  }

  setSearchQuery(childId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQueries.update((rows) => ({ ...rows, [childId]: value }));
    this.invalidateSearch(childId);
  }

  setSearchGrade(childId: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchGrades.update((rows) => ({ ...rows, [childId]: value }));
    this.invalidateSearch(childId);
  }

  search(childId: number, afterId = 0): void {
    if (afterId === 0) this.searchHistory.update((rows) => ({ ...rows, [childId]: [0] }));
    const seq = (this.searchSeq.get(childId) ?? 0) + 1;
    this.searchSeq.set(childId, seq);
    this.searchLoading.update((rows) => ({ ...rows, [childId]: true }));
    this.error.set(null);
    this.api.search(childId, this.searchQueries()[childId] ?? '', this.searchGrades()[childId] ?? '', afterId)
      .subscribe({
        next: (page) => {
          if (this.searchSeq.get(childId) !== seq) return;
          this.searchLoading.update((rows) => ({ ...rows, [childId]: false }));
          this.searchResults.update((rows) => ({ ...rows, [childId]: page.offers ?? [] }));
          this.searchCursors.update((rows) => ({ ...rows, [childId]: page.nextCursor ?? null }));
          this.searched.update((rows) => ({ ...rows, [childId]: true }));
        },
        error: (err: HttpErrorResponse) => {
          if (this.searchSeq.get(childId) === seq) {
            this.searchLoading.update((rows) => ({ ...rows, [childId]: false }));
            this.error.set(httpErrorMessage(err, 'Recherche impossible.'));
          }
        },
      });
  }

  nextOffers(childId: number): void {
    if (this.searchLoading()[childId]) return;
    const cursor = this.searchCursors()[childId];
    if (cursor != null) {
      this.searchHistory.update((rows) => ({ ...rows, [childId]: [...(rows[childId] ?? [0]), cursor] }));
      this.search(childId, cursor);
    }
  }

  previousOffers(childId: number): void {
    if (this.searchLoading()[childId]) return;
    const history = this.searchHistory()[childId] ?? [0];
    if (history.length <= 1) return;
    const previous = history.slice(0, -1);
    this.searchHistory.update((rows) => ({ ...rows, [childId]: previous }));
    this.search(childId, previous[previous.length - 1]);
  }

  private invalidateSearch(childId: number): void {
    this.searchSeq.set(childId, (this.searchSeq.get(childId) ?? 0) + 1);
    this.searchLoading.update((rows) => ({ ...rows, [childId]: false }));
    this.searchResults.update((rows) => ({ ...rows, [childId]: [] }));
    this.searchCursors.update((rows) => ({ ...rows, [childId]: null }));
    this.searched.update((rows) => ({ ...rows, [childId]: false }));
  }

  private show(body: ParentSubjectsResponse): void {
    this.children.set(body.children ?? []);
    this.pending.set(null);
    this.loading.set(false);
    this.saving.set(false);
  }

  private lines(offers: ChildSubjectOffer[] | undefined, scolaire: boolean): ChildSubjectOffer[] {
    return (offers ?? []).filter((offer) => offer.scolaire === scolaire);
  }

  private loadPhotos(rows: ParentChildResponse[]): void {
    const ticket = this.photoBag.invalidate();
    this.photos.set({});
    for (const child of rows) {
      if (!child.hasPhoto || child.id == null) {
        continue;
      }
      const id = child.id;
      this.childrenApi
        .photo(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (blob) => {
            if (this.photoBag.putIfCurrent(ticket, id, blob)) {
              this.photos.set(this.photoBag.snapshot());
            }
          },
        });
    }
  }
}
