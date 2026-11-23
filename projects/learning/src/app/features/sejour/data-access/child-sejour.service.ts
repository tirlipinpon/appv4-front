import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Subscription, interval } from 'rxjs';

import type { ChildSejourResponse, ChildSejourSignalRequest } from '../../../core/api/api-models';
import { ChildAuthService } from '../../../core/auth/child-auth.service';
import { environment } from '../../../../environments/environment';
import { learningQuestionId, learningScreenCode } from '../learning-screen';

const DEVICE_KEY = 'learning.deviceId';
const PRESENCE_MS = 30_000;

/**
 * Signaux de séjour de l'app enfant (LEARN-74, LEARN-75).
 * L'écran envoie le code de l'endroit. La partie envoie la question.
 * L'API compte. Cet appareil ne décide pas.
 */
@Injectable({ providedIn: 'root' })
export class ChildSejourService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(ChildAuthService);

  /** Écran déjà signalé. Rester dessus, y compris la popup d'humeur, n'envoie rien. */
  private screen: string | null = null;
  /** Vrai quand la lecture dit que cet appareil ne tient plus le séjour. */
  private released = false;
  private visible = document.visibilityState !== 'hidden';
  private presence: Subscription | null = null;

  /** L'endroit affiché envoie son code. La partie envoie la question, sans code d'écran. */
  enter(url: string): void {
    const questionId = learningQuestionId(url);
    if (questionId != null) {
      this.signalQuestion(questionId);
      return;
    }
    const screen = learningScreenCode(url);
    if (screen == null) {
      this.screen = null;
      this.stopPresence();
      return;
    }
    if (screen === this.screen) {
      return;
    }
    this.signalScreen(screen);
  }

  /**
   * La partie envoie la question, pas un code d'écran.
   * Si la lecture a déjà dit que cet appareil ne tient plus, ce signal ne part pas.
   */
  private signalQuestion(questionId: number): void {
    this.screen = null;
    this.stopPresence();
    if (this.released) {
      return;
    }
    this.post({ kind: 'question', deviceId: this.deviceId(), questionId }, () => this.refreshHold());
  }

  /** L'écran visible envoie son code, puis la lecture dit si on tient encore le séjour. */
  private signalScreen(screen: string): void {
    this.screen = screen;
    this.released = false;
    this.stopPresence();
    this.post({ kind: 'screen', deviceId: this.deviceId(), screen }, () => this.refreshHold());
  }

  /**
   * Un pointeur ou une touche dit que l'enfant agit.
   * L'horloge reste celle de l'API : rien n'est remis à zéro ici.
   */
  gesture(): void {
    if (this.screen == null) {
      return;
    }
    const reclaim = this.released;
    this.post({ kind: 'gesture', deviceId: this.deviceId(), screen: this.screen }, () => {
      if (reclaim) {
        this.refreshHold();
      }
    });
  }

  /** Revenir au premier plan rouvre l'écran qu'on regardait. */
  show(): void {
    if (this.visible) {
      return;
    }
    this.visible = true;
    if (this.screen == null) {
      return;
    }
    this.signalScreen(this.screen);
  }

  /** Cacher l'app arrête la tranche à cet instant. */
  hide(): void {
    if (!this.visible) {
      return;
    }
    this.visible = false;
    this.stopPresence();
    if (this.screen != null && !this.released) {
      this.post({ kind: 'leave', deviceId: this.deviceId(), screen: this.screen });
    }
  }

  /** Arrête les envois quand la coquille se ferme. */
  stop(): void {
    this.stopPresence();
    this.screen = null;
    this.released = false;
    this.visible = true;
  }

  /**
   * La lecture dit si cet appareil tient le séjour.
   * `holds` faux : on cesse les présences. Le message éventuel n'est pas réécrit ici.
   */
  private refreshHold(): void {
    this.read().subscribe({
      next: (body) => this.applyHold(body.holds),
      error: () => {
        if (!this.released) {
          this.armPresence();
        }
      },
    });
  }

  /** Seul `holds === false` arrête les signaux de temps. Un champ absent ne compte pas comme un refus. */
  private applyHold(holds: boolean | undefined): void {
    this.released = holds === false;
    if (this.released || !this.visible || this.screen == null) {
      this.stopPresence();
      return;
    }
    this.armPresence();
  }

  /**
   * Tant que l'écran est visible et que cet appareil tient le séjour, une présence
   * part toutes les 30 secondes. Un geste ne relance pas ce délai.
   * Avant chaque présence, la lecture peut dire que l'appareil ne tient plus.
   */
  private armPresence(): void {
    if (this.presence != null || this.released || !this.visible || this.screen == null) {
      return;
    }
    const screen = this.screen;
    this.presence = interval(PRESENCE_MS).subscribe(() => {
      if (this.released || !this.visible || this.screen !== screen) {
        return;
      }
      this.read().subscribe({
        next: (body) => {
          if (body.holds === false) {
            this.released = true;
            this.stopPresence();
            return;
          }
          if (this.released || !this.visible || this.screen !== screen) {
            return;
          }
          this.post({ kind: 'presence', deviceId: this.deviceId(), screen });
        },
        error: () => undefined,
      });
    });
  }

  private stopPresence(): void {
    this.presence?.unsubscribe();
    this.presence = null;
  }

  private post(body: ChildSejourSignalRequest, after?: () => void): void {
    this.http
      .post<void>(`${environment.apiBaseUrl}/sejour/signals`, body, { headers: this.headers() })
      .subscribe({
        next: () => after?.(),
        error: () => undefined,
      });
  }

  private read() {
    return this.http.get<ChildSejourResponse>(`${environment.apiBaseUrl}/sejour`, {
      headers: this.headers(),
      params: { deviceId: this.deviceId() },
    });
  }

  /** Identifiant opaque de cet appareil, créé une fois et renvoyé tel quel. */
  private deviceId(): string {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) {
      return existing;
    }
    const created = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  }

  private headers(): { Authorization: string } {
    return { Authorization: `Bearer ${this.auth.getToken() ?? ''}` };
  }
}
