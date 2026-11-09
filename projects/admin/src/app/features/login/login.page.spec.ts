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
    page.email.set('ada@exemple.com');
    page.password.set(environment.devLoginPassword);
    page.submit();
    const request = http.expectOne(loginUrl);

    await harness.navigateByUrl('/signup');

    expect(request.cancelled).toBeTrue();
    expect(TestBed.inject(AuthService).getToken()).toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('page inscription');
  });
});
