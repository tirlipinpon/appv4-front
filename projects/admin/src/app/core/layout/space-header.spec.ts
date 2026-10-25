import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ActiveRoleService } from '../auth/active-role.service';
import { AuthService } from '../auth/auth.service';
import { SpaceRoles, type SpaceRole } from '../auth/space-roles';
import { SpaceHeader } from './space-header';

@Component({ template: '', standalone: true })
class BlankPage {}

const spacesUrl = 'http://localhost:8080/api/int/auth/spaces';

describe('SpaceHeader', () => {
  let fixture: ComponentFixture<SpaceHeader>;
  let http: HttpTestingController;

  beforeEach(async () => {
    sessionStorage.clear();
    await TestBed.configureTestingModule({
      imports: [SpaceHeader],
      providers: [
        provideRouter([
          { path: '', component: BlankPage },
          { path: 'login', component: BlankPage },
          { path: 'parent', component: BlankPage },
          { path: 'parent/enfants', component: BlankPage },
          { path: 'teacher', component: BlankPage },
          { path: 'teacher/profil', component: BlankPage },
          { path: 'teacher-pending', component: BlankPage },
          { path: 'admin/teacher-requests', component: BlankPage },
        ]),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    sessionStorage.clear();
  });

  it('déconnecte et revient à la page de connexion', async () => {
    await show({ url: '/admin/teacher-requests', showSpaceActions: false });

    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    spyOn(auth, 'logout');
    spyOn(router, 'navigateByUrl');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.logout');
    button.click();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('laisse la file admin sans onglets parent ou professeur', async () => {
    await show({
      url: '/admin/teacher-requests',
      showSpaceActions: false,
      token: { activeRole: SpaceRoles.parent, roles: [SpaceRoles.parent, SpaceRoles.teacher, 'admin'] },
    });

    const text = fixture.nativeElement.textContent as string;
    expect(fixture.nativeElement.querySelector('app-role-switch')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-space-access')).toBeNull();
    expect(fixture.nativeElement.querySelector('.subnav')).toBeNull();
    expect(text).toContain('Déconnexion');
    expect(text).not.toContain('Parent');
    expect(text).not.toContain('Professeur');
    expect(text).not.toContain('Administration');
  });

  it('marque l’onglet et la page professeur, sans entrée Administration', async () => {
    await show({
      url: '/teacher/profil',
      token: { activeRole: SpaceRoles.teacher, roles: [SpaceRoles.parent, SpaceRoles.teacher] },
    });

    const tabs = tabButtons();
    expect(tabs.map((tab) => tab.textContent?.trim())).toEqual(['Parent', 'Professeur']);
    expect(tabs[0].getAttribute('aria-current')).toBeNull();
    expect(tabs[1].getAttribute('aria-current')).toBe('page');
    expect(tabs[1].classList).toContain('is-current');

    const links = menuLinks();
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Accueil',
      'Profil',
      'Écoles',
      'Matières',
    ]);
    expect(links[0].getAttribute('aria-current')).toBeNull();
    expect(links[1].getAttribute('aria-current')).toBe('page');
    expect(fixture.nativeElement.textContent).not.toContain('Administration');
    expect(fixture.nativeElement.textContent).not.toContain('Passer en');
    expect(fixture.nativeElement.textContent).not.toContain('Espace professeur');
  });

  it('ouvre l’accueil de l’onglet déjà choisi sans changer d’espace', async () => {
    await show({
      url: '/teacher/profil',
      token: { activeRole: SpaceRoles.teacher, roles: [SpaceRoles.parent, SpaceRoles.teacher] },
    });
    const roles = TestBed.inject(ActiveRoleService);
    spyOn(roles, 'switchTo');

    tabButtons()[1].click();
    await fixture.whenStable();

    expect(roles.switchTo).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).url).toBe('/teacher');
  });

  it('change d’espace au clic de l’autre onglet puis ouvre son accueil', async () => {
    await show({
      url: '/teacher/profil',
      token: { activeRole: SpaceRoles.teacher, roles: [SpaceRoles.parent, SpaceRoles.teacher] },
    });
    const auth = TestBed.inject(AuthService);
    const roles = TestBed.inject(ActiveRoleService);
    spyOn(roles, 'switchTo').and.callFake((role: SpaceRole) => {
      auth.setToken(
        fakeToken({ activeRole: role, roles: [SpaceRoles.parent, SpaceRoles.teacher] }),
      );
      return of(undefined);
    });

    tabButtons()[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(roles.switchTo).toHaveBeenCalledOnceWith(SpaceRoles.parent);
    expect(TestBed.inject(Router).url).toBe('/parent');
    expect(menuLinks().map((link) => link.textContent?.trim())).toEqual([
      'Accueil',
      'Enfants',
      'Matières',
    ]);
    expect(menuLinks()[0].getAttribute('aria-current')).toBe('page');
  });

  it('ne montre que l’onglet du seul rôle accordé', async () => {
    await show({
      url: '/parent',
      token: { activeRole: SpaceRoles.parent, roles: [SpaceRoles.parent] },
      spaces: { roles: [SpaceRoles.parent], teacherRequest: 'none' },
    });

    expect(tabButtons().map((tab) => tab.textContent?.trim())).toEqual(['Parent']);
    expect(menuLinks().map((link) => link.textContent?.trim())).toEqual([
      'Accueil',
      'Enfants',
      'Matières',
    ]);
    const action: HTMLButtonElement = fixture.nativeElement.querySelector('.space-action');
    expect(action.textContent?.trim()).toBe("Demander l'espace professeur");
    expect(action.closest('.subnav')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Professeur');
    expect(fixture.nativeElement.textContent).not.toContain('Passer en');
  });

  it('ne marque aucune page du sous-menu hors des adresses parent et professeur', async () => {
    await show({
      url: '/',
      token: { activeRole: SpaceRoles.parent, roles: [SpaceRoles.parent] },
      spaces: { roles: [SpaceRoles.parent], teacherRequest: 'none' },
    });

    expect(tabButtons()[0].getAttribute('aria-current')).toBe('page');
    expect(menuLinks().every((link) => link.getAttribute('aria-current') === null)).toBeTrue();
  });

  async function show(options: {
    url: string;
    token?: object;
    showSpaceActions?: boolean;
    spaces?: object;
  }): Promise<void> {
    const auth = TestBed.inject(AuthService);
    auth.logout();
    if (options.token) {
      auth.setToken(fakeToken(options.token));
    }
    await TestBed.inject(Router).navigateByUrl(options.url);
    fixture = TestBed.createComponent(SpaceHeader);
    if (options.showSpaceActions === false) {
      fixture.componentRef.setInput('showSpaceActions', false);
    }
    fixture.detectChanges();
    if (options.showSpaceActions === false) {
      return;
    }
    const roles =
      options.spaces ??
      ({
        roles: rolesOf(options.token),
        teacherRequest: 'none',
      } as object);
    http.expectOne(spacesUrl).flush(roles);
    fixture.detectChanges();
  }

  function tabButtons(): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.tab'));
  }

  function menuLinks(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.subnav a'));
  }
});

function rolesOf(token: object | undefined): string[] {
  if (!token || !('roles' in token) || !Array.isArray(token.roles)) {
    return [];
  }
  return token.roles.filter((role) => role === SpaceRoles.parent || role === SpaceRoles.teacher);
}

function fakeToken(payload: object): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, ...payload })).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
