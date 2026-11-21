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
});
