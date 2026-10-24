import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatToolbarModule } from '@angular/material/toolbar';

import type {
  TeacherAvailableSchool,
  TeacherCurriculumOption,
  TeacherProfileResponse,
  UpdateTeacherProfileRequest,
} from '../../core/api/api-models';
import { AuthService } from '../../core/auth/auth.service';
import { RoleSwitch } from '../../core/layout/role-switch';
import { SpaceAccess } from '../../core/layout/space-access';
import { TeacherProfileService } from './data-access/teacher-profile.service';

interface SchoolBlock {
  key: number;
  schoolId: number | null;
  curriculum: string | null;
  grades: string[];
}

/**
 * Profil professeur (SCRUM-159) : nom du compte, puis écoles si le référentiel en propose.
 * La liste des écoles vient de SCRUM-163. Tant qu'elle est vide, on ne saisit pas un nom libre.
 */
@Component({
  selector: 'app-teacher-profile-page',
  imports: [
    FormsModule,
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatCheckboxModule,
    RoleSwitch,
    SpaceAccess,
  ],
  templateUrl: './teacher-profile.page.html',
  styleUrl: './teacher-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherProfilePage implements OnInit {
  private readonly api = inject(TeacherProfileService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private nextKey = 1;

  readonly email = signal('');
  readonly displayName = signal('');
  readonly availableSchools = signal<TeacherAvailableSchool[]>([]);
  readonly curricula = signal<TeacherCurriculumOption[]>([]);
  readonly blocks = signal<SchoolBlock[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);

  readonly catalogEmpty = computed(
    () => this.availableSchools().length === 0 && this.blocks().length === 0,
  );
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
        this.error.set(this.message(err, 'Profil indisponible.'));
      },
    });
  }

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }

  onName(value: string): void {
    this.saved.set(false);
    this.displayName.set(value);
  }

  addSchool(): void {
    if (!this.canAdd()) {
      return;
    }
    this.saved.set(false);
    this.blocks.update((list) => [
      ...list,
      { key: this.nextKey++, schoolId: null, curriculum: null, grades: [] },
    ]);
  }

  removeSchool(key: number): void {
    this.saved.set(false);
    this.blocks.update((list) => list.filter((block) => block.key !== key));
  }

  onSchool(key: number, schoolId: number): void {
    this.saved.set(false);
    this.patch(key, { schoolId });
  }

  onCurriculum(key: number, curriculum: string): void {
    this.saved.set(false);
    this.patch(key, { curriculum, grades: [] });
  }

  toggleGrade(key: number, grade: string, checked: boolean): void {
    this.saved.set(false);
    const block = this.blocks().find((item) => item.key === key);
    if (!block) {
      return;
    }
    const grades = checked
      ? [...block.grades, grade]
      : block.grades.filter((item) => item !== grade);
    this.patch(key, { grades });
  }

  optionsFor(block: SchoolBlock): TeacherAvailableSchool[] {
    const taken = new Set(
      this.blocks()
        .filter((other) => other.key !== block.key && other.schoolId != null)
        .map((other) => other.schoolId),
    );
    return this.availableSchools().filter((school) => {
      if (school.id == null) {
        return false;
      }
      return school.id === block.schoolId || !taken.has(school.id);
    });
  }

  gradesFor(curriculum: string | null): string[] {
    if (!curriculum) {
      return [];
    }
    return this.curricula().find((choice) => choice.code === curriculum)?.grades ?? [];
  }

  save(): void {
    if (!this.ready() || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saved.set(false);
    this.saving.set(true);
    this.api.save(this.payload()).subscribe({
      next: (profile) => {
        this.apply(profile);
        this.saving.set(false);
        this.saved.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.message(err, 'Enregistrement impossible.'));
      },
    });
  }

  private payload(): UpdateTeacherProfileRequest {
    return {
      displayName: this.displayName(),
      schools: this.blocks().map((block) => ({
        schoolId: block.schoolId ?? undefined,
        curriculum: block.curriculum ?? undefined,
        grades: block.grades,
      })),
    };
  }

  private apply(profile: TeacherProfileResponse): void {
    this.email.set(profile.email ?? '');
    this.displayName.set(profile.displayName ?? '');
    this.availableSchools.set(profile.availableSchools ?? []);
    this.curricula.set(profile.curricula ?? []);
    this.blocks.set(
      (profile.schools ?? []).map((school) => ({
        key: this.nextKey++,
        schoolId: school.schoolId ?? null,
        curriculum: school.curriculum ?? null,
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
    const body = err.error as { message?: string } | null;
    return body?.message || fallback;
  }
}
