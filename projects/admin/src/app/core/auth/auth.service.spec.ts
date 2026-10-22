import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    sessionStorage.clear();
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

  it('reads the active role from the token', () => {
    service.setToken(fakeToken({ activeRole: 'parent', roles: ['parent'] }));

    expect(service.session().activeRole).toBe('parent');
    expect(service.session().roles).toEqual(['parent']);

    service.setToken(fakeToken({ activeRole: 'teacher', roles: ['parent', 'teacher'] }));

    expect(service.session().activeRole).toBe('teacher');
    expect(service.session().roles).toEqual(['parent', 'teacher']);
  });

  it('leaves the space empty when the token does not choose one', () => {
    service.setToken(fakeToken({ roles: ['parent', 'teacher'] }));
    expect(service.session().activeRole).toBeNull();
  });
});

function fakeToken(payload: object): string {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
