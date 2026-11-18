import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';

import { ButtonComponent } from '@appv4/ui';

import { ChildAuthService, apiErrorMessage } from '../../core/auth/child-auth.service';

@Component({
  selector: 'app-home-page',
  imports: [ButtonComponent],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  private readonly auth = inject(ChildAuthService);
  private readonly router = inject(Router);

  protected readonly firstName = this.auth.firstName;
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.auth.getToken()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.auth.session().subscribe({
      error: (err: HttpErrorResponse) => {
        this.auth.logout();
        const fallback = err.status === 0 ? 'Impossible de joindre le serveur.' : 'Session enfant invalide.';
        this.error.set(apiErrorMessage(err, fallback));
        void this.router.navigateByUrl('/login');
      },
    });
  }

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/login');
  }
}
