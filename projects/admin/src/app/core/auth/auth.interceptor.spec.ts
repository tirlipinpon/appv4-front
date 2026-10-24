import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  let http: HttpClient;
  let api: HttpTestingController;
  let auth: AuthService;
  let router: Router;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    http = TestBed.inject(HttpClient);
    api = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => {
    api.verify();
    sessionStorage.clear();
  });

  it('un 401 du jeton courant ferme la session et propose le login', () => {
    const token = bearer();
    auth.setToken(token);
    http.get(`${environment.apiBaseUrl}/hello`).subscribe({ error: () => undefined });

    const request = api.expectOne(`${environment.apiBaseUrl}/hello`);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    request.flush({ message: 'refusé' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBeNull();
    expect(auth.isAuthenticated()).toBeFalse();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('un 401 de connexion ne déconnecte pas et ne redirige pas', () => {
    const token = bearer();
    auth.setToken(token);
    http.post(`${environment.apiBaseUrl}/auth/login`, {}).subscribe({ error: () => undefined });

    const request = api.expectOne(`${environment.apiBaseUrl}/auth/login`);
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({ message: 'Identifiants refusés' }, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBe(token);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('un 401 tardif d’un ancien jeton laisse la session plus récente', () => {
    const older = bearer({ exp: Math.floor(Date.now() / 1000) + 30 });
    const newer = bearer({ exp: Math.floor(Date.now() / 1000) + 90, mark: 'newer' });
    auth.setToken(older);
    http.get(`${environment.apiBaseUrl}/hello`).subscribe({ error: () => undefined });
    const request = api.expectOne(`${environment.apiBaseUrl}/hello`);

    auth.setToken(newer);
    request.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(auth.getToken()).toBe(newer);
    expect(auth.isAuthenticated()).toBeTrue();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

function bearer(extra: object = {}): string {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const body = btoa(JSON.stringify({ exp, activeRole: 'parent', roles: ['parent'], ...extra })).replace(
    /=+$/,
    '',
  );
  return `e30.${body}.sig`;
}
