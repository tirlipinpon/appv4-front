import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ImageCropperComponent } from 'ngx-image-cropper';

import type {
  CreateParentChildRequest,
  ParentChildResponse,
  ParentGradeList,
  ParentSchoolOption,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { CHILD_AVATARS, avatarEmoji } from './child-avatars';
import {
  AGE_INVALID,
  IMAGE_REQUIRED,
  PIN_FORMAT,
  PIN_MISMATCH,
  SCHOOL_PAUSE_MS,
  ageError,
  digitsOnly,
  pinError,
  suggestSchools,
} from './child-entry';
import { linksForSex } from './child-links';
import { PHOTO_NOT_IMAGE, acceptCroppedWebp, preparePhoto } from './child-photo';
import { CHILD_SEXES, sexLabel } from './child-sex';
import { ParentChildrenService } from './data-access/parent-children.service';

/**
 * Liste et ajout des enfants (SCRUM-156).
 * Le code, l'âge, la photo et l'école sont contrôlés dans le formulaire avant l'envoi (SCRUM-165).
 * Le cadre carré est celui de ngx-image-cropper. La photo n'est retenue qu'au clic sur Valider.
 * À partir d'un enfant déjà inscrit, le formulaire reprend le nom, l'âge, la classe, l'école et l'image.
 * Un nouvel enfant peut aussi être lié à un enfant déjà inscrit. Le prénom et le PIN restent vides.
 */
@Component({
  selector: 'app-parent-children-page',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ImageCropperComponent,
    SpaceHeader,
  ],
  templateUrl: './parent-children.page.html',
  styleUrl: './parent-children.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentChildrenPage implements OnInit, OnDestroy {
  private readonly api = inject(ParentChildrenService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly photoCropper = viewChild(ImageCropperComponent);

  readonly avatars = CHILD_AVATARS;
  /** Mots du second menu : ils suivent le sexe de l'enfant choisi dans « Lier avec ». */
  readonly relationChoices = computed(() => {
    const id = this.fromChildId();
    const child = this.children().find((item) => item.id === id);
    return linksForSex(child?.sex);
  });
  readonly sexes = CHILD_SEXES;
  readonly sexLabel = sexLabel;
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
  readonly sex = signal<string | null>(null);
  readonly age = signal('');
  readonly country = signal<string | null>(null);
  readonly grade = signal<string | null>(null);
  readonly schoolId = signal<number | null>(null);
  readonly schoolText = signal('');
  /** Texte pris en compte pour les suggestions, après la pause de frappe. */
  readonly schoolQuery = signal('');
  readonly avatarCode = signal<string | null>(null);
  readonly photoBase64 = signal<string | null>(null);
  readonly photoContentType = signal<string | null>(null);
  readonly photoPreview = signal<string | null>(null);
  readonly cropOpen = signal(false);
  readonly cropSourceUrl = signal<string | null>(null);
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
  private schoolTimer: ReturnType<typeof setTimeout> | null = null;
  /** Photo déjà en base, à remettre si le parent ferme le recadrage sans valider. */
  private keptPhotoBeforeCrop = false;
  private keptPreviewBeforeCrop: string | null = null;

  readonly countries = computed(() =>
    this.curricula()
      .map((list) => list.country)
      .filter((country): country is string => !!country),
  );

  readonly schoolSuggestions = computed(() => suggestSchools(this.schools(), this.country(), this.schoolQuery()));

  readonly linkChoices = computed(() => {
    const editing = this.editingId();
    return this.children().filter((child) => child.id != null && child.id !== editing);
  });

  readonly currentLinks = computed(() => {
    const id = this.editingId();
    return this.children().find((child) => child.id === id)?.links ?? [];
  });

  readonly gradeOptions = computed(() => {
    const selected = this.schools().find((school) => school.id === this.schoolId());
    if (selected?.grades?.length) {
      return selected.grades;
    }
    return this.curricula().find((list) => list.country === this.country())?.grades ?? [];
  });

  readonly familyLines = computed(() => {
    const byId = new Map(
      this.children()
        .filter((child) => child.id != null)
        .map((child) => [child.id as number, child]),
    );
    const seen = new Set<string>();
    const lines: { left: ParentChildResponse; right: ParentChildResponse; label: string }[] = [];
    for (const child of this.children()) {
      const childId = child.id;
      if (childId === undefined || childId === null) {
        continue;
      }
      for (const link of child.links ?? []) {
        const otherId = link.otherChildId;
        if (otherId === undefined || otherId === null || !link.label) {
          continue;
        }
        const other = byId.get(otherId);
        if (!other) {
          continue;
        }
        const key = childId < otherId ? `${childId}:${otherId}` : `${otherId}:${childId}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        const left = childId < otherId ? child : other;
        const right = left === child ? other : child;
        const aboutLeft = (right.links ?? []).find((item) => item.otherChildId === left.id);
        lines.push({ left, right, label: aboutLeft?.label ?? link.label });
      }
    }
    return lines;
  });

  otherChild(id: number | undefined): ParentChildResponse | undefined {
    return this.children().find((child) => child.id === id);
  }

  subjectSummary(child: ParentChildResponse): string {
    const school = child.schoolSubjectCount ?? 0;
    const extra = child.extraSubjectCount ?? 0;
    return `${this.countText(school, 'matière scolaire', 'matières scolaires')} et ${this.countText(extra, 'extra-scolaire', 'extra-scolaires')}`;
  }

  ngOnInit(): void {
    this.reload();
  }

  ngOnDestroy(): void {
    this.clearSchoolTimer();
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
    this.copyReusableFields(child);
    if (child.hasPhoto) {
      this.preparing.set(true);
      this.api.photo(child.id).subscribe({
        next: (blob) => {
          this.photoContentType.set(blob.type || 'image/jpeg');
          this.avatarCode.set(null);
          void this.readPhoto(blob)
            .then((encoded) => {
              this.photoBase64.set(encoded);
              const type = this.photoContentType() || 'image/jpeg';
              this.photoPreview.set(`data:${type};base64,${encoded}`);
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

  onLinkTarget(childId: number | null): void {
    this.fromChildId.set(childId);
    const child = this.children().find((item) => item.id === childId);
    this.fromChildFirstName.set(child?.firstName ?? '');
    if (childId === null) {
      this.link.set('AUCUN');
      return;
    }
    const choices = linksForSex(child?.sex);
    if (this.editingId() !== null) {
      const existing = this.currentLinks().find((item) => item.otherChildId === childId);
      const known = choices.find((item) => item.label === existing?.label);
      if (known) {
        this.link.set(known.code);
        return;
      }
      if (this.link() === 'AUCUN' || !choices.some((item) => item.code === this.link())) {
        this.link.set('');
      }
      return;
    }
    if (this.link() !== 'AUCUN' && !choices.some((item) => item.code === this.link())) {
      this.link.set('');
    }
  }

  /** Vrai si l'enfant choisi dans Modifier a déjà un lien avec la fiche en cours. */
  selectedAlreadyLinked(): boolean {
    const otherId = this.fromChildId();
    if (otherId == null) {
      return false;
    }
    return this.currentLinks().some((item) => item.otherChildId === otherId);
  }

  dropLink(otherChildId: number | undefined): void {
    if (otherChildId == null || this.saving()) {
      return;
    }
    const other = this.children().find((child) => child.id === otherChildId);
    this.fromChildId.set(otherChildId);
    this.fromChildFirstName.set(other?.firstName ?? '');
    this.link.set('AUCUN');
    this.save();
  }

  edit(child: ParentChildResponse): void {
    this.clearPending();
    this.error.set(null);
    this.resetForm();
    this.editingId.set(child.id ?? null);
    this.firstName.set(child.firstName ?? '');
    this.lastName.set(child.lastName ?? '');
    this.sex.set(child.sex ?? null);
    this.age.set(child.age == null ? '' : String(child.age));
    this.country.set(child.country ?? null);
    this.grade.set(child.grade ?? null);
    if (child.schoolId != null) {
      this.schoolId.set(child.schoolId);
      this.schoolText.set(child.schoolName ?? '');
    }
    this.avatarCode.set(child.hasPhoto ? null : (child.avatarCode ?? null));
    this.keepPhoto.set(!!child.hasPhoto);
    this.showExistingPhoto(child);
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
    const id = child.id;
    if (id === undefined || id === null) {
      return;
    }
    this.api.deactivate(id).subscribe({
      next: () => {
        this.clearPending();
        this.reload();
      },
      error: (err: HttpErrorResponse) => this.error.set(this.message(err, 'Désactivation impossible.')),
    });
  }

  reactivate(child: ParentChildResponse): void {
    const id = child.id;
    if (id === undefined || id === null) {
      return;
    }
    this.api.reactivate(id).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => this.error.set(this.message(err, 'Réactivation impossible.')),
    });
  }

  confirmRemove(child: ParentChildResponse): void {
    const id = child.id;
    if (id === undefined || id === null) {
      return;
    }
    this.api.remove(id).subscribe({
      next: () => {
        if (this.editingId() === id) {
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
    this.schoolText.set('');
    this.schoolQuery.set('');
    this.clearSchoolTimer();
  }

  onSchoolInput(event: Event): void {
    this.onSchoolText((event.target as HTMLInputElement).value);
  }

  onSchoolText(value: string): void {
    const text = value ?? '';
    this.schoolText.set(text);
    const selected = this.schools().find((school) => school.id === this.schoolId());
    if (this.schoolId() !== null && (selected?.name ?? '') !== text) {
      this.schoolId.set(null);
      this.syncGrade();
    }
    this.schoolQuery.set('');
    this.scheduleSchoolQuery(text);
  }

  onSchoolPicked(school: ParentSchoolOption): void {
    this.schoolId.set(school.id ?? null);
    this.schoolText.set(school.name ?? '');
    this.schoolQuery.set('');
    this.clearSchoolTimer();
    this.syncGrade();
  }

  onAgeInput(event: Event): void {
    this.applyDigits(event, undefined, (digits) => this.age.set(digits));
  }

  onPinInput(event: Event): void {
    this.applyDigits(event, 4, (digits) => this.pin.set(digits));
  }

  onPinConfirmationInput(event: Event): void {
    this.applyDigits(event, 4, (digits) => this.pinConfirmation.set(digits));
  }

  chooseAvatar(code: string): void {
    this.avatarCode.set(code);
    this.clearChosenPhoto();
    this.keptPhotoBeforeCrop = false;
    this.keptPreviewBeforeCrop = null;
    this.keepPhoto.set(false);
    this.dismissCrop();
  }

  async onPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    try {
      const prepared = await preparePhoto(file);
      this.keptPhotoBeforeCrop = this.keepPhoto();
      this.keptPreviewBeforeCrop = this.keepPhoto() ? this.photoPreview() : null;
      this.clearChosenPhoto();
      this.avatarCode.set(null);
      this.keepPhoto.set(false);
      this.cropSourceUrl.set(prepared.dataUrl);
      this.cropOpen.set(true);
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : PHOTO_NOT_IMAGE);
    }
  }

  onCropLoadFailed(): void {
    this.error.set(PHOTO_NOT_IMAGE);
    this.cancelCrop();
  }

  cancelCrop(): void {
    this.clearChosenPhoto();
    if (this.keptPhotoBeforeCrop) {
      this.photoPreview.set(this.keptPreviewBeforeCrop);
    }
    this.keepPhoto.set(this.keptPhotoBeforeCrop);
    this.keptPhotoBeforeCrop = false;
    this.keptPreviewBeforeCrop = null;
    this.dismissCrop();
  }

  confirmCrop(): void {
    const result = this.photoCropper()?.crop('base64');
    if (!result?.base64) {
      return;
    }
    try {
      const cropped = acceptCroppedWebp(result.base64);
      this.photoBase64.set(cropped.base64);
      this.photoContentType.set(cropped.contentType);
      this.photoPreview.set(cropped.previewUrl);
      this.avatarCode.set(null);
      this.keepPhoto.set(false);
      this.keptPhotoBeforeCrop = false;
      this.keptPreviewBeforeCrop = null;
      this.dismissCrop();
      this.error.set(null);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : PHOTO_NOT_IMAGE);
    }
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    if (!this.sex()) {
      this.error.set('Choisis fille, garçon ou non genré.');
      return;
    }
    if (!this.linkChoiceReady()) {
      return;
    }
    if (!this.ageReady() || !this.pinReady() || !this.imageReady()) {
      return;
    }
    this.saving.set(true);
    const request = this.editingId() === null
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

  private linkChoiceReady(): boolean {
    if (this.fromChildId() === null) {
      return true;
    }
    const word = this.link();
    if (this.relationChoices().some((item) => item.code === word)) {
      return true;
    }
    if (word === 'AUCUN' && (this.editingId() === null || this.selectedAlreadyLinked())) {
      return true;
    }
    this.error.set(`Choisis le lien avec ${this.fromChildFirstName()}.`);
    return false;
  }

  private payload(): CreateParentChildRequest {
    return {
      firstName: this.firstName(),
      lastName: this.lastName(),
      sex: this.sex() ?? undefined,
      age: this.age(),
      country: this.country() ?? undefined,
      grade: this.grade() ?? undefined,
      schoolId: this.schoolId() ?? undefined,
      avatarCode: this.avatarCode() ?? undefined,
      photoBase64: this.photoBase64() ?? undefined,
      photoContentType: this.photoContentType() ?? undefined,
      pin: this.pin(),
      pinConfirmation: this.pinConfirmation(),
      fromChildId: this.fromChildId() ?? undefined,
      link: this.fromChildId() === null ? undefined : this.link(),
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

  private copyReusableFields(child: ParentChildResponse): void {
    this.lastName.set(child.lastName ?? '');
    this.age.set(child.age == null ? '' : String(child.age));
    this.country.set(child.country ?? null);
    this.grade.set(child.grade ?? null);
    if (child.schoolId != null) {
      this.schoolId.set(child.schoolId);
      this.schoolText.set(child.schoolName ?? '');
    }
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
    this.sex.set(null);
    this.age.set('');
    this.country.set(null);
    this.grade.set(null);
    this.schoolId.set(null);
    this.schoolText.set('');
    this.schoolQuery.set('');
    this.clearSchoolTimer();
    this.avatarCode.set(null);
    this.clearChosenPhoto();
    this.dismissCrop();
    this.keptPhotoBeforeCrop = false;
    this.pin.set('');
    this.pinConfirmation.set('');
    this.fromChildId.set(null);
    this.fromChildFirstName.set('');
    this.link.set('AUCUN');
    this.keepPhoto.set(false);
    this.editingId.set(null);
  }

  private applyDigits(event: Event, maxLength: number | undefined, assign: (digits: string) => void): void {
    const input = event.target as HTMLInputElement;
    const digits = digitsOnly(input.value, maxLength);
    if (input.value !== digits) {
      input.value = digits;
    }
    assign(digits);
    this.clearResolvedFieldError();
  }

  private clearResolvedFieldError(): void {
    const current = this.error();
    if ((current === PIN_FORMAT || current === PIN_MISMATCH) && pinError(this.pin(), this.pinConfirmation()) === null) {
      this.error.set(null);
    }
    if (current === AGE_INVALID && ageError(this.age()) === null) {
      this.error.set(null);
    }
  }

  private ageReady(): boolean {
    const message = ageError(this.age());
    if (message) {
      this.error.set(message);
      return false;
    }
    return true;
  }

  private pinReady(): boolean {
    if (this.editingId() !== null && this.pin() === '' && this.pinConfirmation() === '') {
      return true;
    }
    const message = pinError(this.pin(), this.pinConfirmation());
    if (message) {
      this.error.set(message);
      return false;
    }
    return true;
  }

  private imageReady(): boolean {
    if (this.editingId() !== null || this.avatarCode() || this.photoBase64()) {
      return true;
    }
    this.error.set(IMAGE_REQUIRED);
    return false;
  }

  private syncGrade(): void {
    const grades = this.gradeOptions();
    if (this.grade() && !grades.includes(this.grade()!)) {
      this.grade.set(null);
    }
  }

  private scheduleSchoolQuery(text: string): void {
    this.clearSchoolTimer();
    this.schoolTimer = setTimeout(() => {
      this.schoolTimer = null;
      this.schoolQuery.set(text);
    }, SCHOOL_PAUSE_MS);
  }

  private clearSchoolTimer(): void {
    if (this.schoolTimer !== null) {
      clearTimeout(this.schoolTimer);
      this.schoolTimer = null;
    }
  }

  /** Montre la photo déjà enregistrée, sans la renvoyer à l'enregistrement. */
  private showExistingPhoto(child: ParentChildResponse): void {
    const id = child.id;
    if (!child.hasPhoto || id == null) {
      return;
    }
    const known = this.photos()[id];
    if (known) {
      this.photoPreview.set(known);
      return;
    }
    this.api.photo(id).subscribe({
      next: (blob) => {
        if (this.editingId() !== id || !this.keepPhoto() || this.photoBase64()) {
          return;
        }
        const url = URL.createObjectURL(blob);
        this.photos.update((current) => ({ ...current, [id]: url }));
        this.photoPreview.set(url);
      },
    });
  }

  private clearChosenPhoto(): void {
    this.photoBase64.set(null);
    this.photoContentType.set(null);
    this.photoPreview.set(null);
  }

  private dismissCrop(): void {
    this.cropOpen.set(false);
    this.cropSourceUrl.set(null);
  }

  private clearPending(): void {
    this.pendingKind.set(null);
    this.pendingChildId.set(null);
  }

  private countText(value: number, one: string, many: string): string {
    return `${value} ${value === 1 ? one : many}`;
  }

  private message(err: HttpErrorResponse, fallback: string): string {
    return httpErrorMessage(err, fallback);
  }
}
