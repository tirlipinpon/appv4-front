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
});
