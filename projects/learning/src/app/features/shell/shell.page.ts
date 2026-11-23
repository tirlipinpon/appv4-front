import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, fromEvent, Subscription } from 'rxjs';

import { BottomNavComponent, type BottomNavItem, ThemeToggleComponent } from '@appv4/ui';

import { ChildAuthService, apiErrorMessage } from '../../core/auth/child-auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { knownChildAvatarEmoji } from '../../shared/avatars/child-avatars';
import { ChildSejourService } from '../sejour/data-access/child-sejour.service';
import { ChildProfileService } from './data-access/child-profile.service';

const NAV_ITEMS: readonly BottomNavItem[] = [
  { id: 'home', label: 'Home', link: '/home', testId: 'nav-home' },
  { id: 'learn', label: 'Apprendre', link: '/learn', testId: 'nav-learn' },
  { id: 'rewards', label: 'Récompenses', link: '/rewards', testId: 'nav-rewards' },
  { id: 'ranking', label: 'Classement', link: '/ranking', testId: 'nav-ranking' },
  { id: 'profile', label: 'Profil', link: '/profile', testId: 'nav-profile' },
];

/**
 * Coquille de l'app enfant : en-tête (avatar + prénom) et menu bas (LEARN-28).
 */
@Component({
  selector: 'app-shell-page',
  imports: [RouterOutlet, BottomNavComponent, ThemeToggleComponent],
  templateUrl: './shell.page.html',
  styleUrl: './shell.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellPage implements OnInit, OnDestroy {
  private readonly auth = inject(ChildAuthService);
  private readonly profileApi = inject(ChildProfileService);
  private readonly sejour = inject(ChildSejourService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly theme = inject(ThemeService);

  protected readonly navItems = NAV_ITEMS;
  protected readonly activeId = signal('home');
  protected readonly error = signal<string | null>(null);
  protected readonly firstName = this.auth.firstName;
  protected readonly photoUrl = this.profileApi.photoUrl;
  protected readonly avatarEmoji = computed(() =>
    knownChildAvatarEmoji(this.profileApi.profile()?.avatarCode),
  );

  private routeSub?: Subscription;

  ngOnInit(): void {
    if (!this.auth.getToken()) {
      void this.router.navigateByUrl('/login');
      return;
    }
    this.sejour.closedMessage$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((message) => this.logout(message));
    this.syncActive(this.router.url);
    this.sejour.enter(this.router.url);
    this.watchActivity();
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncActive(event.urlAfterRedirects);
        this.sejour.enter(event.urlAfterRedirects);
      });

    this.profileApi.load().subscribe({
      error: (err: HttpErrorResponse) => {
        this.auth.logout();
        this.profileApi.clear();
        const fallback = err.status === 0 ? 'Impossible de joindre le serveur.' : 'Session enfant invalide.';
        this.error.set(apiErrorMessage(err, fallback));
        void this.router.navigateByUrl('/login');
      },
    });
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
    this.sejour.hide();
    this.sejour.stop();
  }

  protected logout(entryMessage?: string): void {
    this.sejour.hide();
    this.auth.logout();
    this.profileApi.clear();
    if (entryMessage) {
      this.auth.rememberEntryMessage(entryMessage);
    }
    void this.router.navigateByUrl('/login');
  }

  /** Geste, présence et départ : la coquille voit tous les écrans, les pages n'appellent pas HTTP. */
  private watchActivity(): void {
    fromEvent(document, 'visibilitychange')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (document.visibilityState === 'hidden') {
          this.sejour.hide();
        } else {
          this.sejour.show();
        }
      });
    fromEvent(document, 'pointerdown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sejour.gesture());
    fromEvent(document, 'keydown')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sejour.gesture());
  }

  protected scrollTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private syncActive(url: string): void {
    const path = url.split('?')[0] ?? url;
    const match = NAV_ITEMS.find((item) => path === item.link || path.startsWith(`${item.link}/`));
    this.activeId.set(match?.id ?? 'home');
  }
}
