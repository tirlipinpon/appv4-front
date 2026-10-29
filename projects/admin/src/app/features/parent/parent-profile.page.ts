import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  AvatarChoice,
  ParentProfileResponse,
  UpdateParentProfileRequest,
} from '../../core/api/api-models';
import { ConnectedAccountService } from '../../core/auth/connected-account.service';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { ParentProfileService } from './data-access/parent-profile.service';

/** Même plafond que le back (`DisplayNames.MAX_LENGTH`). */
const NAME_MAX_LENGTH = 255;
const NAME_REQUIRED = 'Le nom est obligatoire.';
const NAME_TOO_LONG = 'Le nom est trop long (maximum 255).';
const PENDING_EDIT =
  "La version envoyée est enregistrée. La saisie faite pendant l'enregistrement n'est pas encore enregistrée.";

/**
 * Fiche du parent (SCRUM-200). Le mail de connexion se lit. Le nom, le mail de contact,
 * le téléphone et l'avatar se corrigent. Les écoles du professeur ne sont pas ici.
 */
@Component({
  selector: 'app-parent-profile-page',
  imports: [FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SpaceHeader],
  templateUrl: './parent-profile.page.html',
  styleUrl: './parent-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParentProfilePage implements OnInit {
  private readonly api = inject(ParentProfileService);
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
  readonly pendingNotice = signal<string | null>(null);

  ngOnInit(): void {
    this.api.load().subscribe({
      next: (profile) => {
        this.apply(profile);
        this.loading.set(false);
        this.ready.set(true);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Profil indisponible.'));
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
        this.remember(profile);
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
        this.error.set(httpErrorMessage(err, 'Enregistrement impossible.'));
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

  private payload(): UpdateParentProfileRequest {
    return {
      displayName: this.displayName().trim(),
      contactEmail: this.contactEmail().trim(),
      phone: this.phone().trim(),
      avatarCode: this.avatarCode().trim(),
    };
  }

  private samePayload(left: UpdateParentProfileRequest, right: UpdateParentProfileRequest): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  private markDirty(): void {
    this.saved.set(false);
    this.pendingNotice.set(null);
  }

  private remember(profile: ParentProfileResponse): void {
    if (typeof profile.displayName === 'string') {
      const code = profile.avatarCode?.trim() ? profile.avatarCode.trim() : null;
      this.account.remember(profile.displayName, code);
    }
  }

  private apply(profile: ParentProfileResponse): void {
    this.email.set(profile.email ?? '');
    this.displayName.set(profile.displayName ?? '');
    this.contactEmail.set(profile.contactEmail ?? '');
    this.phone.set(profile.phone ?? '');
    this.avatarCode.set(profile.avatarCode ?? '');
    this.avatarChoices.set(profile.avatarChoices ?? []);
  }
}
