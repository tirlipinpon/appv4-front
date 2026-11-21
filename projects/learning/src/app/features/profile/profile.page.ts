import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';

import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildAvatarService } from './data-access/child-avatar.service';

@Component({
  selector: 'app-profile-page',
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfilePage implements OnInit {
  private readonly avatarApi = inject(ChildAvatarService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly avatar = this.avatarApi.avatar;

  ngOnInit(): void {
    this.avatarApi.clear();
    this.avatarApi.load().subscribe({
      next: () => {
        this.loading.set(false);
        this.error.set(null);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.avatarApi.clear();
        this.error.set(apiErrorMessage(err, 'Impossible de charger le personnage.'));
      },
    });
  }
}
