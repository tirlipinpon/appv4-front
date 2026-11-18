import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { HomePage } from './home.page';

describe('HomePage', () => {
  it('affiche XP, streak, palier et la semaine renvoyés par /api/ext/progress', () => {
    TestBed.configureTestingModule({
      imports: [HomePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ChildAuthService,
          useValue: {
            getToken: () => 'child-token',
          },
        },
      ],
    });

    const fixture = TestBed.createComponent(HomePage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const request = http.expectOne('http://localhost:8080/api/ext/progress');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({
      xpTotal: 60,
      currentStreak: 2,
      leagueLabel: 'Argent',
      weekDays: [false, false, true, false, false, false, false],
    });
    fixture.detectChanges();

    const stats = fixture.nativeElement.querySelector('[data-testid="home-progress-stats"]');
    expect(stats.textContent).toContain('60');
    expect(stats.textContent).toContain('2');
    expect(stats.textContent).toContain('Argent');

    const played = fixture.nativeElement.querySelector('[data-played="true"]');
    expect(played).toBeTruthy();
    http.verify();
  });
});
