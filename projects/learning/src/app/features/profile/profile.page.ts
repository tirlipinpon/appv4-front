import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import type { ChildAvatarResponse } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { AvatarZoneIcon } from './components/avatar-zone-icon';
import { avatarDataUri } from './data-access/avatar-face';
import { ChildAvatarService } from './data-access/child-avatar.service';

@Component({
  selector: 'app-profile-page',
  imports: [AvatarZoneIcon],
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
  protected readonly draftPins = signal<Record<string, string>>({});
  protected readonly partsReady = signal(false);
  private readonly tiles = new Map<string, string | null>();

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

  protected presetName(): string | null {
    return this.draftPresets().find((preset) => preset.id === this.draftPreset())?.name ?? null;
  }

  protected presetSwatch(): string | null {
    const options = this.paletteOptions();
    const raw = options?.['backgroundColor'] ?? options?.['skinColor'] ?? options?.['hairColor'];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (typeof value !== 'string') {
      return null;
    }
    const hex = value.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex) && !/^[0-9a-fA-F]{3}$/.test(hex)) {
      return null;
    }
    return `#${hex}`;
  }

  protected openZones() {
    return (this.avatar()?.zones ?? []).filter((zone) => zone.open === true);
  }

  protected closedZones() {
    return (this.avatar()?.zones ?? []).filter((zone) => zone.open !== true);
  }

  protected chooseStyle(code: string | undefined): void {
    if (!code) {
      return;
    }
    this.partsReady.set(false);
    this.draftStyle.set(code);
    this.draftPreset.set(this.draftPresets()[0]?.id ?? null);
    const allowed = new Set(
      this.avatar()?.styles?.find((style) => style.code === code)?.zoneCodes ?? [],
    );
    const kept: Record<string, string> = {};
    for (const [zone, variant] of Object.entries(this.draftPins())) {
      if (allowed.has(zone)) {
        kept[zone] = variant;
      }
    }
    this.draftPins.set(kept);
    this.saveError.set(null);
  }

  protected chooseVariant(zoneCode: string | undefined, variantCode: string | undefined): void {
    const zone = this.avatar()?.zones?.find((item) => item.code === zoneCode);
    if (!zone || zone.open !== true || !zoneCode || !variantCode) {
      return;
    }
    this.draftPins.update((pins) => ({ ...pins, [zoneCode]: variantCode }));
    this.saveError.set(null);
  }

  protected pressed(zoneCode: string | undefined, variantCode: string | undefined): true | null {
    if (!zoneCode || !variantCode) {
      return null;
    }
    return this.draftPins()[zoneCode] === variantCode ? true : null;
  }

  protected tileUri(zoneCode: string | undefined, variantCode: string | undefined): string | null {
    const person = this.avatar();
    const seed = person?.seed;
    const styleCode = this.draftStyle();
    if (!person || !seed || !styleCode || !zoneCode || !variantCode || person.styleCode !== styleCode) {
      return null;
    }
    const key = `${seed}|${styleCode}|${this.draftPreset() ?? ''}|${zoneCode}|${variantCode}`;
    const cached = this.tiles.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const uri = avatarDataUri({
      seed,
      styleCode,
      options: this.paletteOptions(),
      pins: { [zoneCode]: variantCode },
    });
    this.tiles.set(key, uri);
    return uri;
  }

  protected sameStyle(): boolean {
    const person = this.avatar();
    return !!person && person.styleCode === this.draftStyle();
  }

  protected faceUri(): string | null {
    const person = this.avatar();
    const seed = person?.seed;
    const styleCode = this.draftStyle();
    if (!person || !seed || !styleCode) {
      return null;
    }
    return avatarDataUri({
      seed,
      styleCode,
      options: this.paletteOptions(),
      pins: this.draftPins(),
    });
  }

  private paletteOptions(): Record<string, unknown> | null {
    const chosen = this.draftPresets().find((item) => item.id === this.draftPreset());
    if (chosen?.options) {
      return chosen.options;
    }
    if (this.avatar()?.styleCode !== this.draftStyle()) {
      return null;
    }
    return this.avatar()?.presets?.find((item) => item.id === this.draftPreset())?.options ?? null;
  }

  protected choiceText(): string {
    const zones = this.avatar()?.zones ?? [];
    return zones
      .map((zone) => {
        const chosen = zone.code ? this.draftPins()[zone.code] : undefined;
        return zone.variants?.find((variant) => variant.code === chosen)?.label;
      })
      .filter((label): label is string => !!label)
      .join(' ');
  }

  protected choosePreset(id: string | undefined): void {
    if (!id) {
      return;
    }
    this.partsReady.set(false);
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
    const allowed = new Set(
      this.avatar()?.styles?.find((style) => style.code === styleCode)?.zoneCodes ?? [],
    );
    const open = new Set(
      (this.avatar()?.zones ?? [])
        .filter((zone) => zone.open === true && !!zone.code && allowed.has(zone.code))
        .map((zone) => zone.code as string),
    );
    const styleChanges = this.avatar()?.styleCode !== styleCode;
    const pins = styleChanges
      ? []
      : Object.entries(this.draftPins())
          .filter(([zone]) => open.has(zone))
          .map(([zoneCode, variantCode]) => ({ zoneCode, variantCode }));
    this.avatarApi.save(styleCode, this.draftPreset(), pins.length > 0 ? pins : null).subscribe({
      next: (person) => {
        this.saving.set(false);
        this.keepDraft(person);
        this.partsReady.set(true);
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
    const pins: Record<string, string> = {};
    for (const zone of person.zones ?? []) {
      if (zone.code && zone.selectedCode) {
        pins[zone.code] = zone.selectedCode;
      }
    }
    this.draftPins.set(pins);
  }
}
