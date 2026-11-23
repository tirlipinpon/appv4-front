import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/auth/auth.service';
import { RecoveryPromptPage } from './recovery-prompt.page';

const meUrl = `${environment.apiBaseUrl}/auth/me`;
const answerUrl = `${environment.apiBaseUrl}/auth/recovery-prompt`;
const SENTENCE = 'Ces informations serviront à retrouver ton email de connexion si tu le perds.';

@Component({ template: 'espace parent' })
class ParentStub {}

describe('RecoveryPromptPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([
          { path: 'recovery-prompt', component: RecoveryPromptPage },
          { path: 'parent', component: ParentStub },
        ]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).setToken(parentToken());
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('montre la phrase reçue', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/recovery-prompt', RecoveryPromptPage);
    http.expectOne(meUrl).flush({
      displayName: 'Anne',
      askRecoveryContact: true,
      recoveryPrompt: SENTENCE,
    });
    harness.detectChanges();

    expect(page.sentence()).toBe(SENTENCE);
    expect(harness.routeNativeElement?.textContent).toContain(SENTENCE);
  });

  it('passer envoie skip et ouvre l espace', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/recovery-prompt', RecoveryPromptPage);
    http.expectOne(meUrl).flush({
      displayName: 'Anne',
      askRecoveryContact: true,
      recoveryPrompt: SENTENCE,
    });

    page.skip();
    const request = http.expectOne(answerUrl);
    expect(request.request.body).toEqual({ skip: true });
    request.flush(null);
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/parent');
  });

  it('un téléphone refusé reste sur la page et montre la phrase de l API', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/recovery-prompt', RecoveryPromptPage);
    http.expectOne(meUrl).flush({
      displayName: 'Anne',
      askRecoveryContact: true,
      recoveryPrompt: SENTENCE,
    });
    page.phone.set('12');

    page.save();
    const request = http.expectOne(answerUrl);
    expect(request.request.body).toEqual({
      skip: false,
      displayName: 'Anne',
      phone: '12',
      contactEmail: '',
    });
    request.flush({ message: 'Le numéro de téléphone n\'est pas valide.' }, { status: 400, statusText: 'Bad Request' });
    harness.detectChanges();

    expect(page.error()).toBe('Le numéro de téléphone n\'est pas valide.');
    expect(harness.routeNativeElement?.textContent).toContain(SENTENCE);
  });

  it('sans question à poser, ouvre l espace', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/recovery-prompt');
    http.expectOne(meUrl).flush({ displayName: 'Anne', askRecoveryContact: false });
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/parent');
  });
});

function parentToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'] })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
