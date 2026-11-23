import { NgTemplateOutlet } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';

import type {
  TeacherAvailableSchool,
  TeacherProfileResponse,
  TeacherRemovalPreviewResponse,
  UpdateTeacherProfileRequest,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { SchoolCatalogService, SchoolOption } from '../../core/api/school-catalog.service';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherProfileService } from './data-access/teacher-profile.service';

interface SchoolBlock {
  key: number;
  country: string | null;
  schoolId: number | null;
  schoolName: string | null;
  grades: string[];
  savedSchoolId: number | null;
  savedSchoolName: string | null;
  savedCountry: string | null;
  savedGrades: string[];
  /** Vrai : formulaire ouvert. Faux : l'école déjà choisie reste en lecture. */
  editing: boolean;
}

interface HoverTip {
  key: number;
  grade: string | null;
  loading: boolean;
  error: string | null;
  view: TeacherRemovalPreviewResponse | null;
}

interface RemovalImpact {
  blockKey: number;
  kind: 'grade' | 'school';
  grade: string | null;
  confirmed: boolean;
  loading: boolean;
  error: string | null;
  view: TeacherRemovalPreviewResponse | null;
  pending: PendingRemoval;
}

type PendingRemoval =
  | { type: 'uncheck-grade'; grade: string }
  | { type: 'remove-school' }
  | { type: 'replace-school'; schoolId: number }
  | { type: 'replace-country'; country: string };

const SCHOOL_REQUIRED = 'Choisis une école dans la liste, ou retire-la.';
const SCHOOL_UNKNOWN = "Cette école n'est pas proposable.";
const SCHOOL_DUPLICATE = 'Cette école est déjà sur le profil.';
const GRADE_REQUIRED = 'Choisis une classe pour cette école, ou retire-la.';
const GRADE_NOT_OFFERED = "Cette classe n'est pas proposée par cette école.";
const COUNTRY_WITHOUT_GRADES = "Ce pays n'a pas de liste de classes.";
const PENDING_EDIT =
  "La version envoyée est enregistrée. La saisie faite pendant l'enregistrement n'est pas encore enregistrée.";

/**
 * Écoles et classes du professeur.
 * Une école déjà choisie s'affiche en lecture, avec Modifier ou Supprimer.
 * Le formulaire ne s'ouvre que pour une nouvelle école, ou après Modifier.
 * Annuler referme ce formulaire sans enregistrer. Enregistrer ne concerne que cette école.
 * Le nom du compte reste sur le profil. L'enregistrement renvoie ce nom,
 * parce que l'API remplace le nom et les écoles ensemble.
 */
@Component({
  selector: 'app-teacher-schools-page',
  imports: [
    NgTemplateOutlet,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    SpaceHeader,
  ],
  templateUrl: './teacher-schools.page.html',
  styleUrl: './teacher-schools.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSchoolsPage implements OnInit, OnDestroy {
  private readonly api = inject(TeacherProfileService);
  private readonly schoolCatalog = inject(SchoolCatalogService);
  private readonly schoolSearchSequences = new Map<number, number>();
  private readonly schoolSearchTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextKey = 1;

  readonly displayName = signal('');
  readonly availableSchools = signal<TeacherAvailableSchool[]>([]);
  readonly schoolResults = signal<Readonly<Record<number, SchoolOption[]>>>({});
  readonly schoolQueries = signal<Readonly<Record<number, string>>>({});
  readonly schoolCursors = signal<Readonly<Record<number, number | null>>>({});
  readonly blocks = signal<SchoolBlock[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  /** École dont l'enregistrement est en cours. Les autres boutons restent sur « Enregistrer ». */
  readonly savingKey = signal<number | null>(null);
  readonly ready = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);
  readonly blockErrors = signal<Readonly<Record<number, string>>>({});
  readonly pendingNotice = signal<string | null>(null);
  readonly impacts = signal<RemovalImpact[]>([]);
  /** Infos d'impact affichées au survol, pas dans un panneau avec des boutons. */
  readonly tip = signal<HoverTip | null>(null);
  private tipSeq = 0;
  private readonly previewCache = new Map<string, TeacherRemovalPreviewResponse>();

  readonly awaitingChoice = computed(() => this.impacts().some((item) => !item.confirmed));

  readonly catalogEmpty = computed(() => false);
  readonly countries = computed(() => ['Belgique', 'France']);
  readonly canAdd = computed(() => true);
  /** Une école pas encore enregistrée s'affiche juste sous le bouton, pas en bas de la liste. */
  readonly displayBlocks = computed(() => {
    const drafts: SchoolBlock[] = [];
    const saved: SchoolBlock[] = [];
    for (const block of this.blocks()) {
      if (block.savedSchoolId == null) {
        drafts.push(block);
      } else {
        saved.push(block);
      }
    }
    drafts.reverse();
    return [...drafts, ...saved];
  });

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (profile) => {
        this.apply(profile);
        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.message(err, 'Écoles indisponibles.'));
      },
    });
  }

  ngOnDestroy(): void {
    for (const timer of this.schoolSearchTimers.values()) clearTimeout(timer);
    this.schoolSearchTimers.clear();
    for (const [key, seq] of this.schoolSearchSequences) this.schoolSearchSequences.set(key, seq + 1);
  }

  addSchool(): void {
    if (!this.canAdd()) {
      return;
    }
    this.markDirty();
    this.blocks.update((list) => [
      ...list,
      {
        key: this.nextKey++,
        country: null,
        schoolId: null,
        schoolName: null,
        grades: [],
        savedSchoolId: null,
        savedSchoolName: null,
        savedCountry: null,
        savedGrades: [],
        editing: true,
      },
    ]);
  }

  /** Ouvre le formulaire d'une école déjà affichée. */
  editSchool(key: number): void {
    const block = this.block(key);
    if (!block || this.blocked(key) || this.saving()) {
      return;
    }
    this.patch(key, { editing: true });
  }

  /**
   * Ferme le formulaire sans enregistrer.
   * Une école nouvelle disparaît. Une école déjà enregistrée retrouve son dernier état.
   */
  cancelEdit(key: number): void {
    const block = this.block(key);
    if (!block || this.saving()) {
      return;
    }
    this.stopSearch(key);
    this.dropImpacts(key);
    this.clearBlockError(key);
    if (block.savedSchoolId == null) {
      this.blocks.update((list) => list.filter((item) => item.key !== key));
      return;
    }
    this.patch(key, {
      editing: false,
      country: block.savedCountry,
      schoolId: block.savedSchoolId,
      schoolName: block.savedSchoolName,
      grades: [...block.savedGrades],
    });
  }

  /** Formulaire pour une école nouvelle ou en cours de modification. */
  showsForm(block: SchoolBlock): boolean {
    return block.editing || block.schoolId == null;
  }

  schoolLabel(block: SchoolBlock): string {
    if (block.schoolName) {
      return block.schoolName;
    }
    return this.availableSchools().find((school) => school.id === block.schoolId)?.name ?? '';
  }

  removeSchool(key: number): void {
    const block = this.block(key);
    if (!block || this.blocked(key)) {
      return;
    }
    this.markDirty();
    this.clearBlockError(key);
    this.blocks.update((list) => list.filter((item) => item.key !== key));
    this.dropImpacts(key);
  }

  onCountryChange(key: number, event: MatSelectChange): void {
    const country = String(event.value ?? '');
    const block = this.block(key);
    if (!block || country === block.country) {
      return;
    }
    if (this.blocked(key)) {
      event.source.value = block.country;
      return;
    }
    this.applyCountry(key, country);
  }

  onSchoolChange(key: number, event: MatSelectChange): void {
    const schoolId = Number(event.value);
    const block = this.block(key);
    if (!block || schoolId === block.schoolId) {
      return;
    }
    if (this.blocked(key)) {
      event.source.value = block.schoolId;
      return;
    }
    this.applySchool(key, schoolId);
  }

  onGradeChange(key: number, grade: string, event: MatCheckboxChange): void {
    this.toggleGrade(key, grade, event.checked);
  }

  /** Aperçu au survol : qui est inscrit dans cette année. Enregistrer applique le retrait. */
  showGradeTip(block: SchoolBlock, grade: string): void {
    if (!this.onSavedSchool(block)) {
      return;
    }
    this.showTip(block, grade);
  }

  /** Aperçu au survol de Supprimer : qui est inscrit dans cette école. */
  showSchoolTip(block: SchoolBlock): void {
    if (block.savedSchoolId == null) {
      return;
    }
    this.showTip(block, null);
  }

  hideTip(): void {
    this.tipSeq += 1;
    this.tip.set(null);
  }

  tipMatches(key: number, grade: string | null): boolean {
    const tip = this.tip();
    return tip != null && tip.key === key && tip.grade === grade;
  }

  keep(impact: RemovalImpact): void {
    if (impact.confirmed) {
      return;
    }
    this.impacts.update((list) => list.filter((item) => !this.sameImpact(item, impact)));
  }

  confirmRemoval(impact: RemovalImpact): void {
    if (!impact.view || impact.confirmed || impact.loading) {
      return;
    }
    const block = this.block(impact.blockKey);
    if (!block) {
      return;
    }
    this.markDirty();
    const pending = impact.pending;
    if (pending.type === 'uncheck-grade') {
      this.patch(block.key, {
        grades: block.grades.filter((grade) => grade !== pending.grade),
      });
      this.impacts.update((list) =>
        list.map((item) => (this.sameImpact(item, impact) ? { ...item, confirmed: true } : item)),
      );
      return;
    }
    if (pending.type === 'remove-school') {
      this.clearBlockError(block.key);
      this.blocks.update((list) => list.filter((item) => item.key !== block.key));
      this.dropImpacts(block.key);
      return;
    }
    if (pending.type === 'replace-school') {
      this.applySchool(block.key, pending.schoolId);
      this.dropImpacts(block.key);
      return;
    }
    this.applyCountry(block.key, pending.country);
    this.dropImpacts(block.key);
  }

  impactsFor(key: number): RemovalImpact[] {
    return this.impacts().filter((item) => item.blockKey === key);
  }

  blocked(key: number): boolean {
    return this.impacts().some((item) => item.blockKey === key && !item.confirmed);
  }

  toggleGrade(key: number, grade: string, checked: boolean): void {
    const block = this.block(key);
    if (!block) {
      return;
    }
    if (checked) {
      if (block.grades.includes(grade)) {
        return;
      }
      this.impacts.update((list) =>
        list.filter((item) => !(item.blockKey === key && item.kind === 'grade' && item.grade === grade)),
      );
    } else if (!block.grades.includes(grade)) {
      return;
    }
    this.markDirty();
    this.clearBlockError(key);
    const grades = checked ? [...block.grades, grade] : block.grades.filter((item) => item !== grade);
    this.patch(key, { grades });
  }

  optionsFor(block: SchoolBlock): TeacherAvailableSchool[] {
    if (!block.country) {
      return [];
    }
    const taken = new Set(
      this.blocks()
        .filter((other) => other.key !== block.key && other.schoolId != null)
        .map((other) => other.schoolId),
    );
    const selected = this.availableSchools().filter((school) => school.id === block.schoolId);
    const candidates = [...selected, ...(this.schoolResults()[block.key] ?? [])];
    return candidates.filter((school, index) => {
      if (candidates.findIndex((other) => other.id === school.id) !== index) return false;
      if (school.id == null || school.country !== block.country) {
        return false;
      }
      return school.id === block.schoolId || !taken.has(school.id);
    });
  }

  gradesFor(block: SchoolBlock): string[] {
    if (block.schoolId == null) {
      return [];
    }
    return this.availableSchools().find((school) => school.id === block.schoolId)?.grades ?? [];
  }

  blockError(key: number): string | null {
    return this.blockErrors()[key] ?? null;
  }

  /** Enregistre uniquement cette école. Les autres brouillons restent locaux. */
  saveSchool(key: number): void {
    const block = this.block(key);
    if (!this.ready() || this.saving() || !block || this.blocked(key)) {
      return;
    }
    const problem = this.blockProblem(block, this.seenExcept(key));
    this.blockErrors.update((current) => {
      const next = { ...current };
      if (problem) {
        next[key] = problem;
      } else {
        delete next[key];
      }
      return next;
    });
    if (problem) {
      this.saved.set(false);
      this.pendingNotice.set(null);
      return;
    }
    this.persist(this.payloadFor(key), this.draftSnapshot(key), key);
  }

  save(): void {
    if (!this.ready() || this.saving() || this.awaitingChoice()) {
      return;
    }
    if (!this.validate()) {
      this.saved.set(false);
      this.pendingNotice.set(null);
      return;
    }
    this.persist(this.payload(), [], null);
  }

  private persist(sent: UpdateTeacherProfileRequest, drafts: SchoolBlock[], key: number | null): void {
    this.error.set(null);
    this.saved.set(false);
    this.pendingNotice.set(null);
    this.saving.set(true);
    this.savingKey.set(key);
    this.api.save(sent).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.savingKey.set(null);
        const current = key == null ? this.payload() : this.payloadFor(key);
        if (!this.samePayload(sent, current)) {
          this.saved.set(false);
          this.pendingNotice.set(PENDING_EDIT);
          return;
        }
        this.apply(profile);
        this.restoreDrafts(drafts);
        this.saved.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.savingKey.set(null);
        this.saved.set(false);
        this.error.set(this.message(err, 'Enregistrement impossible.'));
      },
    });
  }

  private validate(): boolean {
    const errors: Record<number, string> = {};
    const seen = new Set<number>();
    for (const block of this.blocks()) {
      const problem = this.blockProblem(block, seen);
      if (problem) {
        errors[block.key] = problem;
      }
    }
    this.blockErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  private blockProblem(block: SchoolBlock, seen: Set<number>): string | null {
    if (block.schoolId == null) {
      return SCHOOL_REQUIRED;
    }
    const school = this.availableSchools().find((item) => item.id === block.schoolId);
    if (!school) {
      return SCHOOL_UNKNOWN;
    }
    if (seen.has(block.schoolId)) {
      return SCHOOL_DUPLICATE;
    }
    seen.add(block.schoolId);
    const offered = school.grades ?? [];
    if (offered.length === 0) {
      return COUNTRY_WITHOUT_GRADES;
    }
    if (block.grades.length === 0) {
      return GRADE_REQUIRED;
    }
    if (block.grades.some((grade) => !offered.includes(grade))) {
      return GRADE_NOT_OFFERED;
    }
    return null;
  }

  /** N'envoie pas le nom : seul l'écran Profil le change (évite l'écrasement croisé). */
  private payload(): UpdateTeacherProfileRequest {
    return {
      schools: this.blocks().map((block) => ({
        schoolId: block.schoolId ?? undefined,
        grades: block.grades,
      })),
    };
  }

  /**
   * L'API remplace toute la liste. On envoie cette école telle qu'elle est saisie,
   * et les autres écoles déjà enregistrées sans leur brouillon.
   */
  private payloadFor(key: number): UpdateTeacherProfileRequest {
    return {
      schools: this.blocks().flatMap((block) => {
        if (block.key === key) {
          return [{ schoolId: block.schoolId ?? undefined, grades: block.grades }];
        }
        if (block.savedSchoolId == null) {
          return [];
        }
        return [{
          schoolId: block.editing ? block.savedSchoolId : (block.schoolId ?? undefined),
          grades: block.editing ? block.savedGrades : block.grades,
        }];
      }),
    };
  }

  /** Identifiants déjà présents dans l'enregistrement, hors l'école en cours. */
  private seenExcept(key: number): Set<number> {
    const seen = new Set<number>();
    for (const block of this.blocks()) {
      if (block.key === key || block.savedSchoolId == null) {
        continue;
      }
      const schoolId = block.editing ? block.savedSchoolId : block.schoolId;
      if (schoolId != null) {
        seen.add(schoolId);
      }
    }
    return seen;
  }

  private draftSnapshot(exceptKey: number): SchoolBlock[] {
    return this.blocks()
      .filter((block) => block.key !== exceptKey && (block.savedSchoolId == null || block.editing))
      .map((block) => ({
        ...block,
        grades: [...block.grades],
        savedGrades: [...block.savedGrades],
      }));
  }

  private restoreDrafts(drafts: SchoolBlock[]): void {
    if (drafts.length === 0) {
      return;
    }
    this.blocks.update((list) => {
      const next = [...list];
      for (const draft of drafts) {
        if (draft.savedSchoolId == null) {
          next.push(draft);
          continue;
        }
        const index = next.findIndex((block) => block.schoolId === draft.savedSchoolId);
        if (index < 0) {
          next.push(draft);
          continue;
        }
        next[index] = {
          ...draft,
          key: next[index].key,
          savedSchoolId: next[index].savedSchoolId,
          savedSchoolName: next[index].savedSchoolName,
          savedCountry: next[index].savedCountry,
          savedGrades: [...next[index].savedGrades],
        };
      }
      return next;
    });
  }

  private samePayload(left: UpdateTeacherProfileRequest, right: UpdateTeacherProfileRequest): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private markDirty(): void {
    this.saved.set(false);
    this.pendingNotice.set(null);
  }

  private clearBlockError(key: number): void {
    this.blockErrors.update((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  private apply(profile: TeacherProfileResponse): void {
    this.displayName.set(profile.displayName ?? '');
    this.availableSchools.set(profile.availableSchools ?? []);
    this.impacts.set([]);
    this.blocks.set(
      (profile.schools ?? []).map((school) => ({
        key: this.nextKey++,
        country: school.country ?? null,
        schoolId: school.schoolId ?? null,
        schoolName: school.schoolName ?? null,
        grades: [...(school.grades ?? [])],
        savedSchoolId: school.schoolId ?? null,
        savedSchoolName: school.schoolName ?? null,
        savedCountry: school.country ?? null,
        savedGrades: [...(school.grades ?? [])],
        editing: false,
      })),
    );
  }

  private patch(key: number, partial: Partial<SchoolBlock>): void {
    this.blocks.update((list) =>
      list.map((block) => (block.key === key ? { ...block, ...partial } : block)),
    );
  }

  private message(err: HttpErrorResponse, fallback: string): string {
    return httpErrorMessage(err, fallback);
  }

  private block(key: number): SchoolBlock | undefined {
    return this.blocks().find((item) => item.key === key);
  }

  private onSavedSchool(block: SchoolBlock): boolean {
    return block.savedSchoolId != null && block.schoolId === block.savedSchoolId;
  }

  private showTip(block: SchoolBlock, grade: string | null): void {
    if (block.savedSchoolId == null) {
      return;
    }
    const schoolId = block.savedSchoolId;
    const cacheKey = `${schoolId}|${grade ?? ''}`;
    const seq = ++this.tipSeq;
    const cached = this.previewCache.get(cacheKey);
    this.tip.set({
      key: block.key,
      grade,
      loading: cached == null,
      error: null,
      view: cached ?? null,
    });
    if (cached) {
      return;
    }
    this.api.preview(schoolId, grade ?? undefined).subscribe({
      next: (view) => {
        this.previewCache.set(cacheKey, view);
        if (this.tipSeq !== seq) {
          return;
        }
        this.tip.set({ key: block.key, grade, loading: false, error: null, view });
      },
      error: (err: HttpErrorResponse) => {
        if (this.tipSeq !== seq) {
          return;
        }
        this.tip.set({
          key: block.key,
          grade,
          loading: false,
          error: this.message(err, 'Aperçu indisponible.'),
          view: null,
        });
      },
    });
  }

  private openImpact(
    block: SchoolBlock,
    kind: RemovalImpact['kind'],
    grade: string | null,
    pending: PendingRemoval,
  ): void {
    if (block.savedSchoolId == null || this.blocked(block.key)) {
      return;
    }
    const schoolId = block.savedSchoolId;
    const impact: RemovalImpact = {
      blockKey: block.key,
      kind,
      grade,
      confirmed: false,
      loading: true,
      error: null,
      view: null,
      pending,
    };
    this.impacts.update((list) => [...list, impact]);
    this.api.preview(schoolId, grade ?? undefined).subscribe({
      next: (view) => this.fillImpact(block.key, kind, grade, { loading: false, view, error: null }),
      error: (err: HttpErrorResponse) =>
        this.fillImpact(block.key, kind, grade, {
          loading: false,
          error: this.message(err, 'Aperçu indisponible.'),
        }),
    });
  }

  private fillImpact(
    blockKey: number,
    kind: RemovalImpact['kind'],
    grade: string | null,
    patch: Partial<RemovalImpact>,
  ): void {
    this.impacts.update((list) =>
      list.map((item) =>
        item.blockKey === blockKey && item.kind === kind && item.grade === grade && !item.confirmed
          ? { ...item, ...patch }
          : item,
      ),
    );
  }

  private dropImpacts(key: number): void {
    this.impacts.update((list) => list.filter((item) => item.blockKey !== key));
  }

  private sameImpact(item: RemovalImpact, impact: RemovalImpact): boolean {
    return item.blockKey === impact.blockKey && item.kind === impact.kind && item.grade === impact.grade;
  }

  private stopSearch(key: number): void {
    const timer = this.schoolSearchTimers.get(key);
    if (timer) {
      clearTimeout(timer);
    }
    this.schoolSearchTimers.delete(key);
    this.schoolSearchSequences.set(key, (this.schoolSearchSequences.get(key) ?? 0) + 1);
  }

  private applyCountry(key: number, country: string): void {
    const timer = this.schoolSearchTimers.get(key);
    if (timer) clearTimeout(timer);
    this.schoolSearchTimers.delete(key);
    this.markDirty();
    this.clearBlockError(key);
    this.patch(key, { country, schoolId: null, schoolName: null, grades: [] });
    this.searchSchools(key, '', 0);
  }

  onSchoolSearch(key: number, event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    const timer = this.schoolSearchTimers.get(key);
    if (timer) clearTimeout(timer);
    this.schoolSearchSequences.set(key, (this.schoolSearchSequences.get(key) ?? 0) + 1);
    this.schoolQueries.update((current) => ({ ...current, [key]: query }));
    this.schoolResults.update((current) => ({ ...current, [key]: [] }));
    this.schoolCursors.update((current) => ({ ...current, [key]: null }));
    this.schoolSearchTimers.set(key, setTimeout(() => {
      this.schoolSearchTimers.delete(key);
      this.searchSchools(key, query, 0);
    }, 300));
  }

  moreSchools(key: number): void {
    const cursor = this.schoolCursors()[key];
    if (cursor != null) this.searchSchools(key, this.schoolQueries()[key] ?? '', cursor);
  }

  private searchSchools(key: number, query: string, afterId: number): void {
    const country = this.block(key)?.country;
    if (!country) return;
    const seq = (this.schoolSearchSequences.get(key) ?? 0) + 1;
    this.schoolSearchSequences.set(key, seq);
    this.schoolQueries.update((current) => ({ ...current, [key]: query }));
    this.schoolCatalog.search(country, query, afterId).subscribe({
      next: (page) => {
        if (this.schoolSearchSequences.get(key) !== seq || !this.block(key)) return;
        this.schoolResults.update((current) => ({
          ...current, [key]: afterId ? [...(current[key] ?? []), ...page.schools] : page.schools,
        }));
        this.schoolCursors.update((current) => ({ ...current, [key]: page.nextCursor ?? null }));
      },
      error: () => {
        if (this.schoolSearchSequences.get(key) === seq) this.error.set('Recherche des écoles impossible.');
      },
    });
  }

  private applySchool(key: number, schoolId: number): void {
    this.markDirty();
    this.clearBlockError(key);
    const selected = (this.schoolResults()[key] ?? []).find((school) => school.id === schoolId)
      ?? this.availableSchools().find((school) => school.id === schoolId);
    if (selected) this.availableSchools.update((schools) => [...schools.filter((school) => school.id !== schoolId), selected]);
    this.patch(key, { schoolId, schoolName: selected?.name ?? null, grades: [] });
  }
}
