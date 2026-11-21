import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { ProfilePage } from './profile.page';

describe('ProfilePage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [ProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChildAuthService, useValue: { getToken: () => 'child-token' } },
      ],
    });
    const fixture = TestBed.createComponent(ProfilePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  const lorelei = {
    seed: '7',
    styleCode: 'lorelei',
    styleName: 'Lorelei',
    presetId: null,
    credit: null,
    styles: [{ code: 'lorelei', name: 'Lorelei', credit: null, zoneCodes: ['mouth'] }],
    presets: [{ id: 'bare', name: 'Bare', options: {} }],
    zones: [
      {
        code: 'mouth',
        label: 'bouche',
        seuil: 20,
        thresholdLabel: '20 XP',
        missingLabel: 'encore 20 XP',
        open: false,
        variants: [{ code: 'happy01', label: 'happy01' }],
      },
    ],
  };

  it('affiche Lorelei et le seuil tant que la zone est fermée, sans sélectionner une variante', () => {
    const { fixture, http } = setup();
    const request = http.expectOne('http://localhost:8080/api/ext/avatar');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush(lorelei);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="profile-style"]')?.textContent).toContain('Lorelei');
    expect(root.querySelector('[data-testid="profile-face"]')?.getAttribute('src')).toContain('svg');
    expect(root.querySelector('[data-testid="profile-threshold-mouth"]')?.textContent).toContain('20 XP');
    expect(root.querySelector('[data-testid="profile-missing-mouth"]')?.textContent).toContain('encore 20 XP');
    const variant = root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement;
    expect(variant).not.toBeNull();
    expect(variant.disabled).toBeTrue();
    variant.click();
    fixture.detectChanges();
    expect(variant.getAttribute('aria-pressed')).toBeNull();
    http.verify();
  });

  it('ne dessine pas de seuil tant que la lecture est en cours', () => {
    const { fixture, http } = setup();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="profile-loading"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="profile-threshold-mouth"]')).toBeNull();
    expect(root.querySelector('[data-testid="profile-zones"]')).toBeNull();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(lorelei);
    http.verify();
  });

  it('affiche le message API et pas de grille quand la lecture échoue', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(
      { message: 'Session enfant invalide.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="profile-error"]')?.textContent).toContain('Session enfant invalide.');
    expect(root.querySelector('[data-testid="profile-zones"]')).toBeNull();
    expect(root.querySelector('[data-testid="profile-preview"]')).toBeNull();
    http.verify();
  });

  const withChoices = {
    ...lorelei,
    styles: [
      {
        code: 'lorelei',
        name: 'Lorelei',
        credit: null,
        zoneCodes: ['mouth'],
        presets: [{ id: 'bare', name: 'Bare' }],
      },
      {
        code: 'fun-emoji',
        name: 'Fun Emoji',
        credit: null,
        zoneCodes: ['mouth', 'eyes'],
        presets: [{ id: 'plain', name: 'Plain' }],
      },
    ],
  };

  it('enregistre le style choisi et sa première palette', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(withChoices);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('[data-testid="profile-style-choice-fun-emoji"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="profile-style"]')?.textContent).toContain('Fun Emoji');
    expect(root.querySelector('[data-testid="profile-preset-plain"]')?.getAttribute('aria-pressed')).toBe('true');

    (root.querySelector('[data-testid="profile-save"]') as HTMLButtonElement).click();
    const saved = http.expectOne('http://localhost:8080/api/ext/avatar');
    expect(saved.request.method).toBe('PUT');
    expect(saved.request.body).toEqual({ styleCode: 'fun-emoji', presetId: 'plain', pins: [] });
    saved.flush({
      ...withChoices,
      styleCode: 'fun-emoji',
      styleName: 'Fun Emoji',
      presetId: 'plain',
    });
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="profile-style"]')?.textContent).toContain('Fun Emoji');
    http.verify();
  });

  it('sans enregistrer, rouvrir Profil revient au style déjà gardé', () => {
    const first = setup();
    first.http.expectOne('http://localhost:8080/api/ext/avatar').flush(withChoices);
    first.fixture.detectChanges();
    const root = first.fixture.nativeElement as HTMLElement;
    (root.querySelector('[data-testid="profile-style-choice-fun-emoji"]') as HTMLButtonElement).click();
    first.fixture.detectChanges();
    expect(root.querySelector('[data-testid="profile-style"]')?.textContent).toContain('Fun Emoji');
    first.http.verify();

    TestBed.resetTestingModule();
    const second = setup();
    second.http.expectOne('http://localhost:8080/api/ext/avatar').flush(withChoices);
    second.fixture.detectChanges();
    expect(second.fixture.nativeElement.querySelector('[data-testid="profile-style"]')?.textContent).toContain(
      'Lorelei',
    );
    second.http.verify();
  });

  it('un refus laisse le style enregistré et montre le message API', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(withChoices);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('[data-testid="profile-style-choice-fun-emoji"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('[data-testid="profile-save"]') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(
      { message: 'Palette inconnue pour ce style.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="profile-save-error"]')?.textContent).toContain(
      'Palette inconnue pour ce style.',
    );
    expect(root.querySelector('[data-testid="profile-style"]')?.textContent).toContain('Lorelei');
    http.verify();
  });

  const openMouth = {
    ...lorelei,
    styleCode: 'lorelei',
    zones: [
      {
        code: 'mouth',
        label: 'bouche',
        seuil: 20,
        thresholdLabel: null,
        missingLabel: null,
        open: true,
        selectedCode: null,
        variants: [{ code: 'happy01', label: 'happy01' }],
      },
      {
        code: 'hair',
        label: 'cheveux',
        seuil: 140,
        thresholdLabel: '140 XP',
        missingLabel: 'encore 120 XP',
        open: false,
        selectedCode: null,
        variants: [{ code: 'variant01', label: 'variant01' }],
      },
      {
        code: 'glasses',
        label: 'lunettes',
        seuil: 210,
        thresholdLabel: null,
        missingLabel: null,
        open: true,
        selectedCode: null,
        variants: [{ code: 'none', label: 'sans' }],
      },
    ],
    styles: [
      {
        code: 'lorelei',
        name: 'Lorelei',
        credit: null,
        zoneCodes: ['mouth', 'hair', 'glasses'],
        presets: [{ id: 'bare', name: 'Bare' }],
      },
      {
        code: 'fun-emoji',
        name: 'Fun Emoji',
        credit: null,
        zoneCodes: ['mouth'],
        presets: [{ id: 'plain', name: 'Plain' }],
      },
    ],
  };

  it('choisit une variante ouverte, l’aperçu suit, et l’enregistrement la renvoie', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(openMouth);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const before = root.querySelector('[data-testid="profile-face"]')?.getAttribute('src');
    const mouth = root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement;
    mouth.click();
    fixture.detectChanges();
    expect(mouth.getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('[data-testid="profile-choices"]')?.textContent).toContain('happy01');
    expect(root.querySelector('[data-testid="profile-face"]')?.getAttribute('src')).not.toBe(before);

    (root.querySelector('[data-testid="profile-save"]') as HTMLButtonElement).click();
    const saved = http.expectOne('http://localhost:8080/api/ext/avatar');
    expect(saved.request.body).toEqual({
      styleCode: 'lorelei',
      pins: [{ zoneCode: 'mouth', variantCode: 'happy01' }],
    });
    saved.flush({
      ...openMouth,
      presetId: 'bare',
      zones: openMouth.zones.map((zone) =>
        zone.code === 'mouth' ? { ...zone, selectedCode: 'happy01' } : zone,
      ),
    });
    fixture.detectChanges();
    expect(
      (root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBe('true');
    http.verify();
  });

  it('ne sélectionne pas une zone fermée et retire les variantes absentes du nouveau style', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(openMouth);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const hair = root.querySelector('[data-testid="profile-variant-hair-variant01"]') as HTMLButtonElement;
    expect(hair.disabled).toBeTrue();
    hair.click();
    fixture.detectChanges();
    expect(hair.getAttribute('aria-pressed')).toBeNull();

    (root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement).click();
    (root.querySelector('[data-testid="profile-style-choice-fun-emoji"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('[data-testid="profile-save"]') as HTMLButtonElement).click();
    const saved = http.expectOne('http://localhost:8080/api/ext/avatar');
    expect(saved.request.body).toEqual({
      styleCode: 'fun-emoji',
      presetId: 'plain',
      pins: [{ zoneCode: 'mouth', variantCode: 'happy01' }],
    });
    saved.flush({ ...openMouth, styleCode: 'fun-emoji', styleName: 'Fun Emoji', presetId: 'plain' });
    http.verify();
  });

  it('un refus de variante laisse le visage enregistré', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(openMouth);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    (root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    (root.querySelector('[data-testid="profile-save"]') as HTMLButtonElement).click();
    http.expectOne('http://localhost:8080/api/ext/avatar').flush(
      { message: 'Cette zone n\'est pas encore ouverte.' },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();
    expect(root.querySelector('[data-testid="profile-save-error"]')?.textContent).toContain(
      'Cette zone n\'est pas encore ouverte.',
    );
    expect(
      (root.querySelector('[data-testid="profile-variant-mouth-happy01"]') as HTMLButtonElement).getAttribute(
        'aria-pressed',
      ),
    ).toBeNull();
    http.verify();
  });
});
