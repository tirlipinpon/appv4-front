import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { ChildAuthService } from '../../core/auth/child-auth.service';
import { ShellPage } from './shell.page';

describe('ShellPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShellPage],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();
    sessionStorage.setItem('learning.jwt', 'child-token');
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  it('shows the first name and avatar from /me', async () => {
    const fixture = TestBed.createComponent(ShellPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const request = http.expectOne('http://localhost:8080/api/ext/me');
    expect(request.request.headers.get('Authorization')).toBe('Bearer child-token');
    request.flush({ childId: 7, firstName: 'Léa', avatarCode: 'fox', hasPhoto: false });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[data-testid="shell-first-name"]')?.textContent).toContain('Léa');
    expect(root.querySelector('[data-testid="shell-avatar"]')?.textContent).toContain('🦊');
    expect(root.querySelector('[data-testid="nav-home"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="nav-learn"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="nav-rewards"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="nav-ranking"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="nav-profile"]')).not.toBeNull();
    expect(root.querySelector('[data-testid="top-nav-home"]')?.textContent).toContain('Home');
    expect(root.querySelector('[data-testid="top-nav-learn"]')?.textContent).toContain('Apprendre');
    expect(root.querySelector('[data-testid="top-nav-rewards"]')?.textContent).toContain('Récompenses');
    expect(root.querySelector('[data-testid="top-nav-ranking"]')?.textContent).toContain('Classement');
    expect(root.querySelector('[data-testid="top-nav-profile"]')?.textContent).toContain('Profil');
    const topMenu = root.querySelector('.learn-shell-menu');
    expect(topMenu?.querySelector('nav')?.getAttribute('aria-label')).toBe('Menu');
    expect(topMenu?.compareDocumentPosition(root.querySelector('main')!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    http.verify();
  });

  it('remonte en haut de la page', () => {
    const fixture = TestBed.createComponent(ShellPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('http://localhost:8080/api/ext/me').flush({
      childId: 7,
      firstName: 'Léa',
      avatarCode: 'fox',
      hasPhoto: false,
    });
    fixture.detectChanges();

    spyOn(window, 'scrollTo');
    const button = fixture.nativeElement.querySelector('[data-testid="scroll-top"]') as HTMLButtonElement;
    expect(button.getAttribute('aria-label')).toContain('haut');
    button.click();
    const options = (window.scrollTo as jasmine.Spy).calls.mostRecent().args[0] as ScrollToOptions;
    expect(options).toEqual({ top: 0, behavior: 'smooth' });
    http.verify();
  });

  it('sends back to login when /me refuses the session', async () => {
    const fixture = TestBed.createComponent(ShellPage);
    const http = TestBed.inject(HttpTestingController);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();

    http.expectOne('http://localhost:8080/api/ext/me').flush(
      { message: 'Session enfant invalide.', code: 'UNAUTHORIZED' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(TestBed.inject(ChildAuthService).getToken()).toBeNull();
    http.verify();
  });
});
