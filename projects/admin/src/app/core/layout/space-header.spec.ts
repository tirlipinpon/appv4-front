import { provideRouter, Router } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthService } from '../auth/auth.service';
import { SpaceHeader } from './space-header';

describe('SpaceHeader', () => {
  let fixture: ComponentFixture<SpaceHeader>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpaceHeader],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('déconnecte et revient à la page de connexion', () => {
    fixture = TestBed.createComponent(SpaceHeader);
    fixture.componentRef.setInput('showSpaceActions', false);
    fixture.detectChanges();

    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    spyOn(auth, 'logout');
    spyOn(router, 'navigateByUrl');

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();

    expect(auth.logout).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('cache le changement d’espace quand la page le demande', () => {
    fixture = TestBed.createComponent(SpaceHeader);
    fixture.componentRef.setInput('showSpaceActions', false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-role-switch')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-space-access')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Déconnexion');
  });
});
