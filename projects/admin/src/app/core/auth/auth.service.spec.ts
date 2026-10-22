import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    service = new AuthService();
  });

  it('stores and clears token', () => {
    expect(service.isAuthenticated()).toBeFalse();
    service.setToken('abc.jwt.token');
    expect(service.getToken()).toBe('abc.jwt.token');
    expect(service.isAuthenticated()).toBeTrue();
    service.logout();
    expect(service.getToken()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('mirrors the token active role and lets a new token replace a stale mirror', () => {
    localStorage.setItem('admin.activeRole', 'teacher');

    service.setToken(fakeToken({ activeRole: 'parent', roles: ['parent'] }));

    expect(localStorage.getItem('admin.activeRole')).toBe('parent');
    expect(service.session().activeRole).toBe('parent');
    expect(service.session().roles).toEqual(['parent']);

    service.setToken(fakeToken({ activeRole: 'teacher', roles: ['parent', 'teacher'] }));

    expect(localStorage.getItem('admin.activeRole')).toBe('teacher');
    expect(service.session().activeRole).toBe('teacher');
  });

  it('drops the mirror when the token does not choose a space', () => {
    localStorage.setItem('admin.activeRole', 'parent');
    service.setToken(fakeToken({ roles: ['parent', 'teacher'] }));
    expect(localStorage.getItem('admin.activeRole')).toBeNull();
    expect(service.session().activeRole).toBeNull();
  });
});

function fakeToken(payload: object): string {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
