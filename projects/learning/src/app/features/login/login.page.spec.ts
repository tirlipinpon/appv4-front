import { provideHttpClient, withXhr } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { routes } from '../../app.routes';
import { LoginPage } from './login.page';

describe('LoginPage', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [provideRouter(routes), provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('shows the child name and pin, and stays put until both are filled', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('[data-testid="login-first-name"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="login-pin"]')).not.toBeNull();
    expect(element.querySelector('[data-testid="theme-toggle"]')).not.toBeNull();
    const button = element.querySelector('[data-testid="login-submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });

  it('shows the API message when the code is refused', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();
    enter(fixture, 'Léa', '0000');

    const request = http.expectOne('http://localhost:8080/api/ext/auth/login');
    expect(request.request.body).toEqual({ firstName: 'Léa', pin: '0000' });
    request.flush(
      { message: 'Prénom ou code inconnu ou erroné.', code: 'UNAUTHORIZED' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('[data-testid="login-alert"]')?.textContent)
      .toContain('Prénom ou code inconnu ou erroné.');
  });

  it('opens the home when the API accepts the code', async () => {
    const fixture = TestBed.createComponent(LoginPage);
    const router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture.detectChanges();
    enter(fixture, 'Léa', '1234');

    const request = http.expectOne('http://localhost:8080/api/ext/auth/login');
    request.flush({ token: 'child-jwt', expiresAtEpochSeconds: 1, firstName: 'Léa' });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(sessionStorage.getItem('learning.jwt')).toBe('child-jwt');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/home');
  });
});

function enter(
  fixture: { detectChanges(): void; nativeElement: HTMLElement; componentInstance: LoginPage },
  firstName: string,
  pin: string,
): void {
  const page = fixture.componentInstance as unknown as {
    onFirstName(value: string): void;
    onPin(value: string): void;
  };
  page.onFirstName(firstName);
  page.onPin(pin);
  fixture.detectChanges();
  (fixture.nativeElement.querySelector('[data-testid="login-submit"]') as HTMLButtonElement).click();
  fixture.detectChanges();
}
