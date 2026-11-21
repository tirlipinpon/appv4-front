import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import type { ChildAvatarResponse } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildAvatarService } from './data-access/child-avatar.service';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly avatarApi = inject(ChildAvatarService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly saveError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly avatar = this.avatarApi.avatar;
  protected readonly draftStyle = signal<string | null>(null);
  protected readonly draftPreset = signal<string | null>(null);

  ngOnInit(): void {
    this.avatarApi.clear();
    this.avatarApi.load().subscribe({
      next: (person) => {
        this.loading.set(false);
        this.error.set(null);
        this.keepDraft(person);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.avatarApi.clear();
        this.error.set(apiErrorMessage(err, 'Impossible de charger le personnage.'));
      },
    });
  }

  protected styleName(): string | null {
    const person = this.avatar();
    const code = this.draftStyle();
    return person?.styles?.find((style) => style.code === code)?.name ?? person?.styleName ?? null;
  }

  protected styleCredit(): string | null {
    const person = this.avatar();
    const code = this.draftStyle();
    return person?.styles?.find((style) => style.code === code)?.credit ?? null;
  }

  protected draftPresets() {
    const person = this.avatar();
    const code = this.draftStyle();
    return person?.styles?.find((style) => style.code === code)?.presets ?? [];
  }

  protected chooseStyle(code: string | undefined): void {
    if (!code) {
      return;
    }
    this.draftStyle.set(code);
    this.draftPreset.set(this.draftPresets()[0]?.id ?? null);
    this.saveError.set(null);
  }

  protected choosePreset(id: string | undefined): void {
    if (!id) {
      return;
    }
    this.draftPreset.set(id);
    this.saveError.set(null);
  }

  protected save(): void {
    const styleCode = this.draftStyle();
    if (!styleCode || this.saving()) {
      return;
    }
    this.saving.set(true);
    this.saveError.set(null);
    this.avatarApi.save(styleCode, this.draftPreset()).subscribe({
      next: (person) => {
        this.saving.set(false);
        this.keepDraft(person);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(apiErrorMessage(err, 'Impossible d\'enregistrer le personnage.'));
        const saved = this.avatar();
        if (saved) {
          this.keepDraft(saved);
        }
      },
    });
  }

  private keepDraft(person: ChildAvatarResponse): void {
    this.draftStyle.set(person.styleCode ?? null);
    this.draftPreset.set(person.presetId ?? null);
  }
}
