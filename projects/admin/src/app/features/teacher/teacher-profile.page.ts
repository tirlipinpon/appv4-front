import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  AvatarChoice,
  TeacherProfileResponse,
  UpdateTeacherProfileRequest,
} from '../../core/api/api-models';
import { ConnectedAccountService } from '../../core/auth/connected-account.service';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherProfileService } from './data-access/teacher-profile.service';

/** Même plafond que le back (`DisplayNames.MAX_LENGTH`). */
const NAME_MAX_LENGTH = 255;
const NAME_REQUIRED = 'Le nom est obligatoire.';
const NAME_TOO_LONG = 'Le nom est trop long (maximum 255).';
const PENDING_EDIT =
  "La version envoyée est enregistrée. La saisie faite pendant l'enregistrement n'est pas encore enregistrée.";

type KeptSchool = NonNullable<UpdateTeacherProfileRequest['schools']>[number];

/**
 * Fiche du professeur (SCRUM-159, SCRUM-200).
 * Les écoles se règlent sur leur page. Ici on renvoie le nom, le mail de contact,
 * le téléphone, l'avatar, et les écoles déjà connues.
 */
@Component({
  selector: 'app-teacher-profile-page',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SpaceHeader],
  templateUrl: './teacher-profile.page.html',
  styleUrl: './teacher-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherProfilePage implements OnInit {
  private readonly api = inject(TeacherProfileService);
  private readonly account = inject(ConnectedAccountService);

  readonly email = signal('');
  readonly displayName = signal('');
  readonly contactEmail = signal('');
  readonly phone = signal('');
  readonly avatarCode = signal('');
  readonly avatarChoices = signal<AvatarChoice[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly saved = signal(false);
  readonly error = signal<string | null>(null);
  readonly nameError = signal<string | null>(null);
  /** Saisie arrivée après l'envoi : on ne l'écrase pas avec la réponse. */
  readonly pendingNotice = signal<string | null>(null);
  private readonly keptSchools = signal<KeptSchool[]>([]);

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

  onName(value: string): void {
    this.markDirty();
    this.nameError.set(null);
    this.displayName.set(value);
  }

  onContact(value: string): void {
    this.markDirty();
    this.contactEmail.set(value);
  }

  onPhone(value: string): void {
    this.markDirty();
    this.phone.set(value);
  }

  onAvatar(code: string): void {
    this.markDirty();
    this.avatarCode.set(code);
  }

  /**
   * Enregistre le nom tel qu'il est au clic, avec les écoles déjà connues.
   * Si une saisie arrive pendant la requête, on ne la remplace pas par la réponse.
   */
  save(): void {
    if (!this.ready() || this.saving()) {
      return;
    }
    const nameError = this.nameProblem(this.displayName().trim());
    this.nameError.set(nameError);
    if (nameError) {
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
        this.rememberSavedName(profile);
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

  private nameProblem(name: string): string | null {
    if (!name) {
      return NAME_REQUIRED;
    }
    if (name.length > NAME_MAX_LENGTH) {
      return NAME_TOO_LONG;
    }
    return null;
  }

  private payload(): UpdateTeacherProfileRequest {
    return {
      displayName: this.displayName().trim(),
      schools: this.keptSchools(),
      contactEmail: this.contactEmail().trim(),
      phone: this.phone().trim(),
      avatarCode: this.avatarCode().trim(),
    };
  }

  private samePayload(left: UpdateTeacherProfileRequest, right: UpdateTeacherProfileRequest): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private markDirty(): void {
    this.saved.set(false);
    this.pendingNotice.set(null);
  }

  private rememberSavedName(profile: TeacherProfileResponse): void {
    if (typeof profile.displayName === 'string') {
      const code = profile.avatarCode?.trim() ? profile.avatarCode.trim() : null;
      this.account.remember(profile.displayName, code);
    }
  }

  private apply(profile: TeacherProfileResponse): void {
    this.email.set(profile.email ?? '');
    this.displayName.set(profile.displayName ?? '');
    this.contactEmail.set(profile.contactEmail ?? '');
    this.phone.set(profile.phone ?? '');
    this.avatarCode.set(profile.avatarCode ?? '');
    this.avatarChoices.set(profile.avatarChoices ?? []);
    this.keptSchools.set(
      (profile.schools ?? []).map((school) => ({
        schoolId: school.schoolId,
        grades: [...(school.grades ?? [])],
      })),
    );
  }

  private message(err: HttpErrorResponse, fallback: string): string {
    return httpErrorMessage(err, fallback);
  }
}
