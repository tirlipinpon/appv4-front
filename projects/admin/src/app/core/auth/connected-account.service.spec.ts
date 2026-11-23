import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { ConnectedAccountService } from './connected-account.service';

describe('ConnectedAccountService', () => {
  let service: ConnectedAccountService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ConnectedAccountService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('vide le bandeau au clear et ignore un remember d’une ancienne session', () => {
    const epoch = service.bannerEpoch();
    service.remember('Alice', 'fox', epoch);
    expect(service.displayName()).toBe('Alice');
    expect(service.avatarCode()).toBe('fox');

    service.clear();
    expect(service.displayName()).toBe('');
    expect(service.avatarCode()).toBeNull();

    service.remember('Alice', 'fox', epoch);
    expect(service.displayName()).toBe('');
    expect(service.avatarCode()).toBeNull();
  });

  it('ignore une réponse /auth/me après clear', () => {
    service.load().subscribe();
    const pending = http.expectOne('http://localhost:8080/api/int/auth/me');
    service.clear();
    pending.flush({ displayName: 'Alice', avatarCode: 'owl' });
    expect(service.displayName()).toBe('');
    expect(service.avatarCode()).toBeNull();
  });
});
