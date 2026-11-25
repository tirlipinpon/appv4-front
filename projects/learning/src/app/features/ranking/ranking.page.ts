import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, computed, effect, inject, signal } from '@angular/core';
import { AvatarRenderer } from '@appv4/ui';

import type { ChildRankingCard } from '../../core/api/api-models';
import { knownChildAvatarEmoji } from '../../shared/avatars/child-avatars';
import { ChildRankingService } from './data-access/child-ranking.service';

@Component({
  selector: 'app-ranking-page',
  imports: [],
  providers: [ChildRankingService],
  templateUrl: './ranking.page.html',
  styleUrl: './ranking.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RankingPage implements OnInit, OnDestroy {
  protected readonly ranking = inject(ChildRankingService);
  private readonly renderer = inject(AvatarRenderer);
  private readonly photoUrls = signal<Record<number, string>>({});
  private readonly characterUrls = signal<Record<number, string>>({});
  private readonly ownedUrls: string[] = [];

  constructor() {
    effect(() => {
      const cards = this.ranking.view()?.cards;
      if (cards) {
        this.paint(cards);
      }
    });
  }

  protected readonly steps = computed(() => {
    const top = (this.ranking.view()?.cards ?? []).filter((card) => card.pinned !== true).slice(0, 3);
    if (top.length < 3) {
      return top;
    }
    return [top[1], top[0], top[2]];
  });

  protected readonly leader = computed(() =>
    (this.ranking.view()?.cards ?? []).find((card) => card.pinned !== true) ?? null,
  );

  protected readonly rest = computed(() => {
    const cards = this.ranking.view()?.cards ?? [];
    const shown = new Set(cards.filter((card) => card.pinned !== true).slice(0, 3).map((card) => card.childId));
    return cards.filter((card) => card.pinned === true || !shown.has(card.childId));
  });

  protected readonly maxXp = computed(() =>
    Math.max(1, ...(this.ranking.view()?.cards ?? []).map((card) => card.xp ?? 0)),
  );

  ngOnInit(): void {
    this.ranking.load(null);
  }

  ngOnDestroy(): void {
    for (const url of this.ownedUrls) {
      URL.revokeObjectURL(url);
    }
  }

  protected open(code: string | undefined): void {
    if (!code) {
      return;
    }
    this.clearFaces();
    this.ranking.load(code);
  }

  protected width(xp: number | undefined): number {
    return Math.max(12, Math.round(((xp ?? 0) / this.maxXp()) * 100));
  }

  protected emoji(code: string | null | undefined): string | null {
    return knownChildAvatarEmoji(code);
  }

  protected photo(card: ChildRankingCard): string | null {
    const id = card.childId;
    if (id == null) {
      return null;
    }
    return this.photoUrls()[id] ?? null;
  }

  protected character(card: ChildRankingCard): string | null {
    const id = card.childId;
    if (id == null) {
      return null;
    }
    return this.characterUrls()[id] ?? null;
  }

  protected paint(viewCards: ChildRankingCard[] | undefined): void {
    const scope = this.ranking.view()?.scope ?? 'classe';
    for (const card of viewCards ?? []) {
      if (card.face === 'photo' && card.childId != null) {
        this.loadPhoto(scope, card.childId);
      }
      if (card.face === 'personnage' && card.childId != null && card.styleCode) {
        this.loadCharacter(card);
      }
    }
  }

  private loadPhoto(scope: string, childId: number): void {
    this.ranking.photo(scope, childId).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        this.ownedUrls.push(url);
        this.photoUrls.update((current) => ({ ...current, [childId]: url }));
      },
    });
  }

  private loadCharacter(card: ChildRankingCard): void {
    const styleCode = card.styleCode;
    const childId = card.childId;
    if (!styleCode || childId == null) {
      return;
    }
    const pins: Record<string, string> = {};
    for (const pin of card.pins ?? []) {
      if (pin.zoneCode && pin.variantCode) {
        pins[pin.zoneCode] = pin.variantCode;
      }
    }
    void this.renderer.load(styleCode).then(() => {
      const uri = this.renderer.draw({
        seed: String(childId),
        styleCode,
        options: card.options ?? {},
        pins,
      });
      if (uri) {
        this.characterUrls.update((current) => ({ ...current, [childId]: uri }));
      }
    });
  }

  private clearFaces(): void {
    for (const url of this.ownedUrls) {
      URL.revokeObjectURL(url);
    }
    this.ownedUrls.length = 0;
    this.photoUrls.set({});
    this.characterUrls.set({});
  }
}
