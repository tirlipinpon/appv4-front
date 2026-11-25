import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AvatarRenderer } from '@appv4/ui';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { RankingPage } from './ranking.page';

describe('RankingPage', () => {
  function setup() {
    TestBed.configureTestingModule({
      imports: [RankingPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ChildAuthService, useValue: { getToken: () => 'child-token' } },
        { provide: AvatarRenderer, useValue: { load: () => Promise.resolve(), draw: () => null } },
      ],
    });
    const fixture = TestBed.createComponent(RankingPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    return { fixture, http };
  }

  it('affiche le podium puis la jauge dans l ordre reçu', () => {
    const { fixture, http } = setup();
    const request = http.expectOne('http://localhost:8080/api/ext/ranking');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({
      scope: 'classe',
      groupLabel: 'CE1 · École Nouvelle',
      scopes: [
        { code: 'classe', label: 'Ma classe', selected: true },
        { code: 'pays', label: 'Mon pays', selected: false },
      ],
      cards: [
        { childId: 1, place: 1, firstName: 'Lina', xp: 120, mine: false, face: 'animal', avatarCode: 'fox' },
        { childId: 2, place: 2, firstName: 'Akira', xp: 90, mine: true, face: 'animal', avatarCode: 'bear' },
        { childId: 3, place: 2, firstName: 'Noé', xp: 90, mine: false, face: 'animal', avatarCode: 'panda' },
        { childId: 4, place: 4, firstName: 'Mila', xp: 60, mine: false, face: 'animal', avatarCode: 'cat' },
      ],
    });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="ranking-group"]')?.textContent).toContain('CE1 · École Nouvelle');
    expect(root.querySelector('[data-testid="ranking-scope-classe"]')?.textContent).toContain('Ma classe');
    const podium = root.querySelector('[data-testid="ranking-podium"]');
    expect(podium?.querySelector('[data-testid="podium-1"]')?.classList.contains('tall')).toBeTrue();
    const row = root.querySelector('[data-testid="rank-row-4"]');
    expect(row?.textContent).toContain('Mila');
    expect(row?.textContent).not.toContain('Lina');
    const fill = row?.querySelector('.fill') as HTMLElement;
    expect(fill.style.width).toBe('50%');
    http.verify();
  });

  it('affiche la phrase reçue et aucune carte inventée', () => {
    const { fixture, http } = setup();
    http.expectOne('http://localhost:8080/api/ext/ranking').flush({
      scope: 'classe',
      groupLabel: '',
      phrase: 'Il te faut une école pour ce classement.',
      scopes: [{ code: 'classe', label: 'Ma classe', selected: true }],
      cards: [],
    });
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="ranking-phrase"]')?.textContent)
      .toContain('Il te faut une école pour ce classement.');
    expect(root.querySelector('[data-testid="ranking-podium"]')?.children.length).toBe(0);
    http.verify();
  });
});
