import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPage } from './login.page';

@Component({ template: 'page inscription' })
class SignupStub {}

const loginUrl = 'http://localhost:8080/api/int/auth/login';

describe('LoginPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([
          { path: 'login', component: LoginPage },
          { path: 'signup', component: SignupStub },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('ne lance pas de login pendant l’initialisation Google', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', LoginPage);
    http.expectOne(`${environment.apiBaseUrl}/auth/dev-profiles`).flush([]);
    page.email.set('ada@exemple.com');
    page.password.set(environment.devLoginPassword);
    page.googleLoading.set(true);

    page.submit();

    http.expectNone(loginUrl);
    expect(page.canSubmit()).toBeFalse();
  });

  it('une réponse tardive après /signup ne connecte pas', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', LoginPage);
    http.expectOne(`${environment.apiBaseUrl}/auth/dev-profiles`).flush([]);
    page.email.set('ada@exemple.com');
    page.password.set(environment.devLoginPassword);
    page.submit();
    const request = http.expectOne(loginUrl);

    await harness.navigateByUrl('/signup');

    expect(request.cancelled).toBeTrue();
    expect(TestBed.inject(AuthService).getToken()).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('page inscription');
  });

  it('charge les comptes et utilise le mot de passe démo avec le login normal', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', LoginPage);
    http.expectOne(`${environment.apiBaseUrl}/auth/dev-profiles`).flush([
      { id: 1, email: 'parent005@front-demo.example.test', displayName: 'Élodie', roles: 'parent', active: true },
      { id: 2, email: 'teacher001@front-demo.example.test', displayName: 'Louis', roles: 'teacher', active: false },
    ]);
    page.profileSearch.set('elodie');
    expect(page.filteredDevProfiles().length).toBe(1);
    page.selectDevProfile('parent005@front-demo.example.test');
    expect(page.email()).toBe('parent005@front-demo.example.test');
    expect(page.password()).toBe('FrontDemo2026!');
    page.selectDevProfile('teacher001@front-demo.example.test');
    expect(page.email()).toBe('parent005@front-demo.example.test');
    page.submit();
    const login = http.expectOne(loginUrl);
    expect(login.request.body).toEqual({ email: 'parent005@front-demo.example.test', password: 'FrontDemo2026!' });
    login.flush({ message: 'Test' }, { status: 401, statusText: 'Unauthorized' });
  });

  it('permet de réessayer après erreur et actualise la liste après rollback', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/login', LoginPage);
    http.expectOne(`${environment.apiBaseUrl}/auth/dev-profiles`).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(page.profilesError()).toBeTruthy();
    expect(page.profilesLoading()).toBeFalse();
    page.loadDevProfiles();
    http.expectOne(`${environment.apiBaseUrl}/auth/dev-profiles`).flush([]);
    expect(page.devProfiles()).toEqual([]);
    expect(page.profilesError()).toBeNull();
  });

  it('ne charge pas les comptes en production', async () => {
    const production = environment.production;
    environment.production = true;
    try {
      const harness = await RouterTestingHarness.create();
      const page = await harness.navigateByUrl('/login', LoginPage);
      expect(page.showDevProfiles).toBeFalse();
      http.expectNone(`${environment.apiBaseUrl}/auth/dev-profiles`);
    } finally {
      environment.production = production;
    }
  });
});
