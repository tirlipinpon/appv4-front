import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import type { ParentChildResponse } from '../../core/api/api-models';
import { ParentChildrenPage } from './parent-children.page';

const childrenUrl = 'http://localhost:8080/api/int/parent/children';
const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';

function child(partial: ParentChildResponse): ParentChildResponse {
  return partial;
}

const lea = child({
  id: 1,
  firstName: 'Léa',
  lastName: 'Martin',
  sex: 'FILLE',
  links: [{ otherChildId: 2, label: 'Frère' }],
});
const noah = child({
  id: 2,
  firstName: 'Noah',
  lastName: 'Martin',
  sex: 'GARCON',
  links: [{ otherChildId: 1, label: 'Sœur' }],
});
const camille = child({
  id: 3,
  firstName: 'Camille',
  lastName: 'Martin',
  sex: 'NON_GENRE',
  links: [],
});

describe('ParentChildrenPage liens', () => {
  let fixture: ComponentFixture<ParentChildrenPage>;
  let page: ParentChildrenPage;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentChildrenPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideAnimationsAsync(),
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentChildrenPage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne(childrenUrl).flush({ children: [lea, noah, camille], schools: [], curricula: [] });
    http.expectOne(spacesUrl).flush({ roles: ['parent'], teacherRequest: 'none' });
    fixture.detectChanges();
  });

  afterEach(() => {
    http.verify();
  });

  it('propose les mots du garçon choisi, et vide Sœur quand on passe de Léa à Noah', () => {
    page.openForm();
    page.onLinkTarget(1);
    page.link.set('SOEUR');

    page.onLinkTarget(2);
    fixture.detectChanges();

    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Frère',
      'Demi-frère',
      'Jumeau',
      'Cousin',
    ]);
    expect(page.link()).toBe('');

    page.sex.set('GARCON');
    page.save();
    expect(page.error()).toBe('Choisis le lien avec Noah.');
    http.expectNone(childrenUrl);
  });

  it('coche le mot déjà enregistré, selon le sexe de l’autre enfant', () => {
    page.edit(lea);
    page.onLinkTarget(2);
    expect(page.link()).toBe('FRERE');

    page.edit(noah);
    page.onLinkTarget(1);
    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Sœur',
      'Demi-sœur',
      'Jumelle',
      'Cousine',
    ]);
    expect(page.link()).toBe('SOEUR');
  });

  it('propose les quatre mots neutres pour un enfant non genré', () => {
    page.openForm();
    page.onLinkTarget(3);
    expect(page.relationChoices().map((item) => item.label)).toEqual([
      'Frère/sœur',
      'Demi-frère/sœur',
      'Jumeau/jumelle',
      'Cousin/cousine',
    ]);
  });
});
