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
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, fromEvent, Subscription } from 'rxjs';

import { BottomNavComponent, ThemeToggleComponent } from '@appv4/ui';

import { ChildAuthService, apiErrorMessage } from '../../core/auth/child-auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { knownChildAvatarEmoji } from '../../shared/avatars/child-avatars';
import { ChildSejourService } from '../sejour/data-access/child-sejour.service';
import { CHILD_MENU, ChildTrailNames, childTrail } from './child-trail';
import { ChildProfileService } from './data-access/child-profile.service';

/**
 * Coquille de l'app enfant : en-tête (avatar + prénom) et menu bas (LEARN-28).
 */
@Component({
  selector: 'app-shell-page',
  imports: [RouterOutlet, RouterLink, BottomNavComponent, ThemeToggleComponent],
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
  private readonly trailNames = inject(ChildTrailNames);
  private readonly url = signal(this.router.url);
  protected readonly theme = inject(ThemeService);

  protected readonly navItems = CHILD_MENU;
  protected readonly stayPopup = this.sejour.popup;
  protected readonly activeId = signal('home');
  protected readonly error = signal<string | null>(null);
  protected readonly firstName = this.auth.firstName;
  protected readonly photoUrl = this.profileApi.photoUrl;
  protected readonly avatarEmoji = computed(() =>
    knownChildAvatarEmoji(this.profileApi.profile()?.avatarCode),
  );
  protected readonly trail = computed(() => childTrail(this.url(), this.trailNames.subjectName()));

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
    this.url.set(this.router.url);
    this.sejour.enter(this.router.url);
    this.watchActivity();
    this.routeSub = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.syncActive(event.urlAfterRedirects);
        this.url.set(event.urlAfterRedirects);
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

  /** Le bouton de la popup, avec la phrase et le libellé renvoyés par la lecture. */
  protected continueStay(): void {
    this.sejour.reactivate();
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
    const match = CHILD_MENU.find((item) => path === item.link || path.startsWith(`${item.link}/`));
    this.activeId.set(match?.id ?? 'home');
  }
}
