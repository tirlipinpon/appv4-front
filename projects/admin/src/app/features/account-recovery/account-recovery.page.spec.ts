import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { TestBed } from '@angular/core/testing';

import { environment } from '../../../environments/environment';
import { AccountRecoveryPage } from './account-recovery.page';

const recoverUrl = `${environment.apiBaseUrl}/auth/recover-identifier`;

describe('AccountRecoveryPage', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([{ path: 'account-recovery', component: AccountRecoveryPage }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('n’affiche plus le parcours à venir', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);

    expect(harness.routeNativeElement?.textContent).not.toContain('parcours à venir');
    expect(harness.routeNativeElement?.textContent).not.toContain('pas encore disponible');
  });

  it('affiche le masque reçu et ne connecte pas', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    fill(page);

    page.submit();

    const request = http.expectOne(recoverUrl);
    expect(request.request.body).toEqual({
      displayName: 'Elodie Martin',
      phone: '0470 12 34 56',
      contactEmail: 'marue@ecole.be',
    });
    request.flush({ maskedEmail: 'ma***@ecole.be' });

    expect(page.maskedEmail()).toBe('ma***@ecole.be');
    expect(page.resultMessage()).toBeNull();
    expect(sessionStorage.getItem('admin.jwt')).toBeNull();
  });

  it('affiche la phrase reçue quand il n’y a pas de masque', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    fill(page);

    page.submit();
    http.expectOne(recoverUrl).flush({ message: 'Ce compte est inactif.' });

    expect(page.maskedEmail()).toBeNull();
    expect(page.resultMessage()).toBe('Ce compte est inactif.');
  });

  it('n’appelle pas l’API si un champ est vide ou si le mail n’est pas une adresse', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    page.phone.set('0470123456');
    page.contactEmail.set('marie@ecole.be');

    page.submit();
    http.expectNone(recoverUrl);
    expect(page.canSubmit()).toBeFalse();

    page.displayName.set('Elodie');
    page.contactEmail.set('pas-un-email');
    page.submit();
    http.expectNone(recoverUrl);
    expect(page.canSubmit()).toBeFalse();
  });

  it('Google, Facebook et Apple ouvrent l’autorisation sans recherche', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    spyOn(page, 'goTo');

    page.continueWithGoogle();
    const google = http.expectOne((req) => req.url.includes('/auth/oauth/google/authorize-url'));
    http.expectNone(recoverUrl);
    google.flush({ authorizationUrl: 'https://accounts.google.test/start', state: 'g' });
    expect(page.goTo).toHaveBeenCalledWith('https://accounts.google.test/start');

    page.socialLoading.set(false);
    page.continueWithFacebook();
    const facebook = http.expectOne((req) => req.url.includes('/auth/oauth/facebook/authorize-url'));
    http.expectNone(recoverUrl);
    facebook.flush({ authorizationUrl: 'https://www.facebook.test/start', state: 'f' });

    page.socialLoading.set(false);
    page.continueWithApple();
    const apple = http.expectOne((req) => req.url.includes('/auth/oauth/apple/authorize-url'));
    http.expectNone(recoverUrl);
    apple.flush({ authorizationUrl: 'https://appleid.apple.test/start', state: 'a' });
    expect(page.goTo).toHaveBeenCalledWith('https://appleid.apple.test/start');
  });

  it('affiche la phrase du trop-plein d’essais', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    fill(page);

    page.submit();
    http.expectOne(recoverUrl).flush(
      { message: 'Trop d\'essais. Réessaie dans un moment.' },
      { status: 429, statusText: 'Too Many Requests' },
    );

    expect(page.error()).toBe('Trop d\'essais. Réessaie dans un moment.');
    expect(page.maskedEmail()).toBeNull();
  });

  it('affiche un échec quand la réponse n’a pas de phrase', async () => {
    const harness = await RouterTestingHarness.create();
    const page = await harness.navigateByUrl('/account-recovery', AccountRecoveryPage);
    fill(page);

    page.submit();
    http.expectOne(recoverUrl).flush(
      { error: 'Unauthorized' },
      { status: 401, statusText: 'Unauthorized' },
    );

    expect(page.error()).toBe('La recherche n’a pas abouti.');
    expect(sessionStorage.getItem('admin.jwt')).toBeNull();
  });
});

function fill(page: AccountRecoveryPage): void {
  page.displayName.set('  Elodie Martin  ');
  page.phone.set(' 0470 12 34 56 ');
  page.contactEmail.set(' marue@ecole.be ');
}
