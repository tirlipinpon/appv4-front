import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import type {
  TeacherAvailableSchool,
  TeacherProfileResponse,
  UpdateTeacherProfileRequest,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherProfileService } from './data-access/teacher-profile.service';

interface SchoolBlock {
  key: number;
  country: string | null;
  schoolId: number | null;
  grades: string[];
}

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
 * Le nom du compte reste sur le profil. L'enregistrement renvoie ce nom,
 * parce que l'API remplace le nom et les écoles ensemble.
 */
@Component({
  selector: 'app-teacher-schools-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatCheckboxModule,
    SpaceHeader,
  ],
  templateUrl: './teacher-schools.page.html',
  styleUrl: './teacher-schools.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSchoolsPage implements OnInit {
  private readonly api = inject(TeacherProfileService);
  private nextKey = 1;

  readonly displayName = signal('');
  readonly availableSchools = signal<TeacherAvailableSchool[]>([]);
  readonly blocks = signal<SchoolBlock[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);
  readonly blockErrors = signal<Readonly<Record<number, string>>>({});
  readonly pendingNotice = signal<string | null>(null);

  readonly catalogEmpty = computed(
    () => this.availableSchools().length === 0 && this.blocks().length === 0,
  );
  readonly countries = computed(() => {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const school of this.availableSchools()) {
      const country = school.country?.trim();
      if (country && !seen.has(country)) {
        seen.add(country);
        list.push(country);
      }
    }
    return list;
  });
  readonly canAdd = computed(() => {
    const available = this.availableSchools().filter((school) => school.id != null);
    return available.length > 0 && this.blocks().length < available.length;
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

  addSchool(): void {
    if (!this.canAdd()) {
      return;
    }
    this.markDirty();
    this.blocks.update((list) => [
      ...list,
      { key: this.nextKey++, country: null, schoolId: null, grades: [] },
    ]);
  }

  removeSchool(key: number): void {
    this.markDirty();
    this.clearBlockError(key);
    this.blocks.update((list) => list.filter((block) => block.key !== key));
  }

  onCountry(key: number, country: string): void {
    this.markDirty();
    this.clearBlockError(key);
    this.patch(key, { country, schoolId: null, grades: [] });
  }

  onSchool(key: number, schoolId: number): void {
    this.markDirty();
    this.clearBlockError(key);
    this.patch(key, { schoolId, grades: [] });
  }

  toggleGrade(key: number, grade: string, checked: boolean): void {
    this.markDirty();
    this.clearBlockError(key);
    const block = this.blocks().find((item) => item.key === key);
    if (!block) {
      return;
    }
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
    return this.availableSchools().filter((school) => {
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

  save(): void {
    if (!this.ready() || this.saving()) {
      return;
    }
    if (!this.validate()) {
      this.saved.set(false);
      this.pendingNotice.set(null);
      return;
    }
    const sent = this.payload();
    this.error.set(null);
    this.saved.set(false);
    this.pendingNotice.set(null);
    this.saving.set(true);
    this.api.save(sent).subscribe({
      next: (profile) => {
        this.saving.set(false);
        if (!this.samePayload(sent, this.payload())) {
          this.saved.set(false);
          this.pendingNotice.set(PENDING_EDIT);
          return;
        }
        this.apply(profile);
        this.saved.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
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

  private payload(): UpdateTeacherProfileRequest {
    return {
      displayName: this.displayName().trim(),
      schools: this.blocks().map((block) => ({
        schoolId: block.schoolId ?? undefined,
        grades: block.grades,
      })),
    };
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
    this.blocks.set(
      (profile.schools ?? []).map((school) => ({
        key: this.nextKey++,
        country: school.country ?? null,
        schoolId: school.schoolId ?? null,
        grades: [...(school.grades ?? [])],
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
}
