import { AuthService } from './auth.service';
import { SpaceRoles } from './space-roles';

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
    service.setToken(fakeToken({ activeRole: SpaceRoles.parent, roles: [SpaceRoles.parent] }));

    expect(service.session().activeRole).toBe(SpaceRoles.parent);
    expect(service.session().roles).toEqual([SpaceRoles.parent]);

    service.setToken(
      fakeToken({ activeRole: SpaceRoles.teacher, roles: [SpaceRoles.parent, SpaceRoles.teacher] }),
    );

    expect(service.session().activeRole).toBe(SpaceRoles.teacher);
    expect(service.session().roles).toEqual([SpaceRoles.parent, SpaceRoles.teacher]);
  });

  it('reads admin without treating it as a space', () => {
    service.setToken(fakeToken({ roles: ['admin'] }));

    expect(service.session().admin).toBeTrue();
    expect(service.session().roles).toEqual([]);
    expect(service.session().activeRole).toBeNull();
  });

  it('leaves the space empty when the token does not choose one', () => {
    service.setToken(fakeToken({ roles: [SpaceRoles.parent, SpaceRoles.teacher] }));
    expect(service.session().activeRole).toBeNull();
  });
});

function fakeToken(payload: object): string {
  const body = btoa(JSON.stringify(payload)).replace(/=+$/, '');
  return `e30.${body}.sig`;
}
