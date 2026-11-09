import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { ParentProfileResponse } from '../../core/api/api-models';
import { ParentProfilePage } from './parent-profile.page';

const profileUrl = 'http://localhost:8080/api/int/parent/profile';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';
const accountUrl = 'http://localhost:8080/api/int/auth/me';

const loaded: ParentProfileResponse = {
  email: 'parent@example.com',
  displayName: 'Ancien',
  contactEmail: '',
  phone: '',
  avatarCode: '',
  avatarChoices: [
    { code: 'owl', label: 'Hibou' },
    { code: 'fox', label: 'Renard' },
  ],
};

describe('ParentProfilePage', () => {
  let fixture: ComponentFixture<ParentProfilePage>;
  let page: ParentProfilePage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentProfilePage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentProfilePage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(profileUrl).flush(loaded);
    http.expectOne(spacesUrl).flush({ roles: ['parent'], teacherRequest: 'none' });
    http.expectOne(accountUrl).flush({ displayName: 'Ancien' });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('envoie le nom, le contact, le téléphone et l’avatar, et montre le libellé de l’API', () => {
    expect(fixture.nativeElement.textContent).toContain('parent@example.com');
    expect(fixture.nativeElement.textContent).toContain('Hibou');

    page.onName('Parent Contact');
    page.onContact('contact.parent@example.com');
    page.onPhone('+32 470 00 00 00');
    page.onAvatar('owl');
    page.save();

    const put = http.expectOne(profileUrl);
    expect(put.request.body).toEqual({
      displayName: 'Parent Contact',
      contactEmail: 'contact.parent@example.com',
      phone: '+32 470 00 00 00',
      avatarCode: 'owl',
    });
    put.flush({
      ...loaded,
      displayName: 'Parent Contact',
      contactEmail: 'contact.parent@example.com',
      phone: '+32 470 00 00 00',
      avatarCode: 'owl',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.who')?.textContent?.trim()).toBe('Parent Contact');
    expect(fixture.nativeElement.querySelector('.face')?.textContent?.trim()).toBe('🦉');
    expect(fixture.nativeElement.querySelector('.ok')?.textContent).toContain('Enregistré');
  });

  it('affiche le message de l’API sans l’inventer', () => {
    page.onName('Parent Contact');
    page.onContact('pas-un-mail');
    page.save();
    http.expectOne(profileUrl).flush(
      { message: "Le mail de contact n'est pas valide." },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Le mail de contact n'est pas valide.");
  });
});
