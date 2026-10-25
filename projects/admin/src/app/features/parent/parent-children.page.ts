import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type {
  CreateParentChildRequest,
  ParentChildResponse,
  ParentGradeList,
  ParentSchoolOption,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { CHILD_AVATARS, avatarEmoji } from './child-avatars';
import { CHILD_LINKS } from './child-links';
import { ParentChildrenService } from './data-access/parent-children.service';

/**
 * Liste et ajout des enfants (SCRUM-156).
 * À partir d'un enfant déjà inscrit, le formulaire reprend le nom, l'âge, la classe et l'image (SCRUM-158).
 * Le prénom et le PIN restent vides. Le lien choisi s'affiche sur les deux fiches.
 */
@Component({
  selector: 'app-parent-children-page',
  imports: [
    FormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    SpaceHeader,
  ],
  templateUrl: './parent-children.page.html',
  styleUrl: './parent-children.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenPage implements OnInit {
  private readonly api = inject(ParentChildrenService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly avatars = CHILD_AVATARS;
  readonly kinship = CHILD_LINKS;
  readonly emoji = avatarEmoji;

  readonly children = signal<ParentChildResponse[]>([]);
  readonly schools = signal<ParentSchoolOption[]>([]);
  readonly curricula = signal<ParentGradeList[]>([]);
  readonly photos = signal<Record<number, string>>({});
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly preparing = signal(false);
  readonly formOpen = signal(false);
  readonly error = signal<string | null>(null);

  readonly firstName = signal('');
  readonly lastName = signal('');
  readonly age = signal('');
  readonly country = signal<string | null>(null);
  readonly grade = signal<string | null>(null);
  readonly schoolId = signal<number | null>(null);
  readonly schoolFilter = signal('');
  readonly avatarCode = signal<string | null>(null);
  readonly photoName = signal<string | null>(null);
  readonly photoBase64 = signal<string | null>(null);
  readonly photoContentType = signal<string | null>(null);
  readonly pin = signal('');
  readonly pinConfirmation = signal('');
  readonly fromChildId = signal<number | null>(null);
  readonly fromChildFirstName = signal('');
  readonly link = signal('AUCUN');
  readonly editingId = signal<number | null>(null);
  readonly keepPhoto = signal(false);
  readonly pendingKind = signal<'deactivate' | 'hide' | null>(null);
  readonly pendingChildId = signal<number | null>(null);

  private fromQueryHandled = false;

  readonly countries = computed(() =>
    this.curricula()
      .map((list) => list.country)
      .filter((country): country is string => !!country),
  );

  readonly schoolOptions = computed(() => {
    const country = this.country();
    if (!country) {
      return [];
    }
    const query = this.schoolFilter().trim().toLowerCase();
    if (query.length < 2) {
      const selected = this.schools().find((school) => school.id === this.schoolId());
      return selected ? [selected] : [];
    }
    return this.schools()
      .filter((school) => {
        if (school.country !== country || school.id == null) {
          return false;
        }
        return (school.name ?? '').toLowerCase().includes(query);
      })
      .slice(0, 40);
  });

  readonly gradeOptions = computed(() => {
    const selected = this.schools().find((school) => school.id === this.schoolId());
    if (selected?.grades?.length) {
      return selected.grades;
    }
    return this.curricula().find((list) => list.country === this.country())?.grades ?? [];
  });

  ngOnInit(): void {
    this.reload();
  }

  openForm(): void {
    this.error.set(null);
    this.clearPending();
    this.resetForm();
    this.formOpen.set(true);
  }

  openFrom(child: ParentChildResponse): void {
    if (child.id == null || this.preparing()) {
      return;
    }
    this.error.set(null);
    this.resetForm();
    this.fromChildId.set(child.id);
    this.fromChildFirstName.set(child.firstName ?? '');
    this.link.set('AUCUN');
    this.lastName.set(child.lastName ?? '');
    this.age.set(child.age == null ? '' : String(child.age));
    this.country.set(child.country ?? null);
    this.grade.set(child.grade ?? null);
    if (child.hasPhoto) {
      this.preparing.set(true);
      this.api.photo(child.id).subscribe({
        next: (blob) => {
          this.photoContentType.set(blob.type || 'image/jpeg');
          this.photoName.set('Photo actuelle');
          this.avatarCode.set(null);
          void this.readPhoto(blob)
            .then((encoded) => {
              this.photoBase64.set(encoded);
              this.preparing.set(false);
              this.formOpen.set(true);
            })
            .catch(() => {
              this.preparing.set(false);
              this.error.set('Photo indisponible.');
            });
        },
        error: () => {
          this.preparing.set(false);
          this.error.set('Photo indisponible.');
        },
      });
      return;
    }
    this.avatarCode.set(child.avatarCode ?? null);
    this.formOpen.set(true);
  }

  closeForm(): void {
    this.formOpen.set(false);
    this.resetForm();
  }

  edit(child: ParentChildResponse): void {
    this.clearPending();
    this.error.set(null);
    this.resetForm();
    this.editingId.set(child.id ?? null);
    this.firstName.set(child.firstName ?? '');
    this.lastName.set(child.lastName ?? '');
    this.age.set(child.age == null ? '' : String(child.age));
    this.country.set(child.country ?? null);
    this.grade.set(child.grade ?? null);
    if (child.schoolId != null) {
      this.schoolId.set(child.schoolId);
      this.schoolFilter.set(child.schoolName ?? '');
    }
    this.avatarCode.set(child.hasPhoto ? null : (child.avatarCode ?? null));
    this.keepPhoto.set(!!child.hasPhoto);
    this.formOpen.set(true);
  }

  askDeactivate(child: ParentChildResponse): void {
    this.pendingKind.set('deactivate');
    this.pendingChildId.set(child.id ?? null);
  }

  askRemove(child: ParentChildResponse): void {
    if (this.editingId() === child.id) {
      this.closeForm();
    }
    this.pendingKind.set('hide');
    this.pendingChildId.set(child.id ?? null);
  }

  cancelPending(): void {
    this.clearPending();
  }

  confirmDeactivate(child: ParentChildResponse): void {
    if (child.id == null) {
      return;
    }
    this.api.deactivate(child.id).subscribe({
      next: () => {
        this.clearPending();
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.message(err, 'Désactivation impossible.')),
    });
  }

  reactivate(child: ParentChildResponse): void {
    if (child.id == null) {
      return;
    }
    this.api.reactivate(child.id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => this.error.set(this.message(err, 'Réactivation impossible.')),
    });
  }

  confirmRemove(child: ParentChildResponse): void {
    if (child.id == null) {
      return;
    }
    this.api.remove(child.id).subscribe({
      next: () => {
        if (this.editingId() === child.id) {
          this.closeForm();
        }
        this.clearPending();
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.message(err, 'Retrait impossible.')),
    });
  }

  onCountry(country: string): void {
    this.country.set(country);
    this.schoolId.set(null);
    this.grade.set(null);
    this.schoolFilter.set('');
  }

  onSchool(schoolId: number | null): void {
    this.schoolId.set(schoolId);
    const grades = this.gradeOptions();
    if (this.grade() && !grades.includes(this.grade()!)) {
      this.grade.set(null);
    }
  }

  chooseAvatar(code: string): void {
    this.avatarCode.set(code);
    this.photoBase64.set(null);
    this.photoContentType.set(null);
    this.photoName.set(null);
    this.keepPhoto.set(false);
  }

  onPhoto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error.set("Le fichier n'est pas une image.");
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.error.set("L'image dépasse 5 Mo.");
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const comma = result.indexOf(',');
      this.photoBase64.set(comma >= 0 ? result.slice(comma + 1) : result);
      this.photoContentType.set(file.type);
      this.photoName.set(file.name);
      this.avatarCode.set(null);
      this.keepPhoto.set(false);
      this.error.set(null);
    };
    reader.readAsDataURL(file);
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    const request = this.editingId() == null
      ? this.api.add(this.payload())
      : this.api.update(this.editingId()!, this.payload());
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.resetForm();
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(this.message(err, 'Enregistrement impossible.'));
      },
    });
  }

  private reload(): void {
    this.api.load().subscribe({
      next: (page) => {
        this.children.set(page.children ?? []);
        this.schools.set(page.schools ?? []);
        this.curricula.set(page.curricula ?? []);
        this.loading.set(false);
        this.loadPhotos(page.children ?? []);
        this.openFromQuery(page.children ?? []);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(this.message(err, 'Liste indisponible.'));
      },
    });
  }

  private loadPhotos(children: ParentChildResponse[]): void {
    for (const child of children) {
      if (!child.hasPhoto || child.id == null) {
        continue;
      }
      const id = child.id;
      this.api.photo(id).subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          this.photos.update((current) => ({ ...current, [id]: url }));
        },
      });
    }
  }

  private payload(): CreateParentChildRequest {
    return {
      firstName: this.firstName(),
      lastName: this.lastName(),
      age: this.age(),
      country: this.country() ?? undefined,
      grade: this.grade() ?? undefined,
      schoolId: this.schoolId() ?? undefined,
      avatarCode: this.avatarCode() ?? undefined,
      photoBase64: this.photoBase64() ?? undefined,
      photoContentType: this.photoContentType() ?? undefined,
      pin: this.pin(),
      pinConfirmation: this.pinConfirmation(),
      fromChildId: this.editingId() == null ? (this.fromChildId() ?? undefined) : undefined,
      link: this.editingId() != null || this.fromChildId() == null ? undefined : this.link(),
    };
  }

  private openFromQuery(children: ParentChildResponse[]): void {
    if (this.fromQueryHandled) {
      return;
    }
    const raw = this.route.snapshot.queryParamMap.get('depuis');
    if (raw == null) {
      return;
    }
    this.fromQueryHandled = true;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { depuis: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    const id = Number(raw);
    const child = children.find((item) => item.id === id);
    if (!Number.isInteger(id) || id <= 0 || !child) {
      this.error.set('Cet enfant est introuvable.');
      return;
    }
    this.openFrom(child);
  }

  private readPhoto(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : '';
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private resetForm(): void {
    this.firstName.set('');
    this.lastName.set('');
    this.age.set('');
    this.country.set(null);
    this.grade.set(null);
    this.schoolId.set(null);
    this.schoolFilter.set('');
    this.avatarCode.set(null);
    this.photoName.set(null);
    this.photoBase64.set(null);
    this.photoContentType.set(null);
    this.pin.set('');
    this.pinConfirmation.set('');
    this.fromChildId.set(null);
    this.fromChildFirstName.set('');
    this.link.set('AUCUN');
    this.keepPhoto.set(false);
    this.editingId.set(null);
  }

  private clearPending(): void {
    this.pendingKind.set(null);
    this.pendingChildId.set(null);
  }

  private message(err: HttpErrorResponse, fallback: string): string {
    return httpErrorMessage(err, fallback);
  }
}
