import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SignupPage } from './signup.page';

const signupUrl = 'http://localhost:8080/api/int/auth/signup';

describe('SignupPage', () => {
  let fixture: ComponentFixture<SignupPage>;
  let page: SignupPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SignupPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SignupPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('n’envoie pas une adresse manifestement invalide', () => {
    for (const email of ['@', 'a@']) {
      page.email.set(email);
      page.password.set('Secret1!');
      page.submit();
      fixture.detectChanges();

      expect(page.canSubmit()).toBeFalse();
      expect(fixture.nativeElement.textContent).toContain('Entre une adresse email valide.');
      http.expectNone(signupUrl);
    }
  });

  it('affiche le message générique de collision sans deviner le fournisseur', () => {
    page.email.set('ada@exemple.com');
    page.password.set('Secret1!');
    page.submit();

    const request = http.expectOne(signupUrl);
    request.flush(
      { message: 'Impossible de créer le compte' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Impossible de créer le compte');
    expect(text.toLowerCase()).not.toContain('google');
    expect(text.toLowerCase()).not.toContain('facebook');
    expect(text.toLowerCase()).not.toContain('fournisseur');
  });
});
