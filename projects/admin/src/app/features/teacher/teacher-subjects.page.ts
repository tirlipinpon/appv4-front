import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type {
  TeacherDeactivateNoticeItem,
  TeacherSubjectColleagueItem,
  TeacherSubjectFollowersResponse,
  TeacherSubjectSharedHolder,
  TeacherSubjectsResponse,
  TeacherTransferInviteItem,
} from '../../core/api/api-models';
import { SpaceHeader } from '../../core/layout/space-header';
import { httpErrorMessage } from '../../shared/http-error-message/http-error-message';
import { TeacherSubjectsService } from './data-access/teacher-subjects.service';

interface SubjectRow {
  id: number;
  name: string;
  active: boolean;
  ownedByMe: boolean;
  /** Faux : la matière est déjà dans la classe, ce professeur ne la suit pas. */
  followedByMe: boolean;
  sharedWith: TeacherSubjectSharedHolder[];
}

interface GradeBlock {
  grade: string;
  subjects: SubjectRow[];
}

interface SchoolBlock {
  schoolId: number;
  schoolName: string;
  grades: GradeBlock[];
}

type TransferMode = 'move' | 'share';

type Pending =
  | {
      id: number;
      kind: 'remove';
      /** Vrai si ce prof est le seul accès : retrait = plus personne ne voit la matière. */
      sole: boolean;
      colleagues: TeacherSubjectColleagueItem[];
    }
  | {
      id: number;
      kind: 'transfer';
      mode: TransferMode | null;
      colleagueUserId: number | null;
      colleagues: TeacherSubjectColleagueItem[];
      confirm: boolean;
    };

const NAME_REQUIRED = 'Le nom est obligatoire.';
const NAME_TOO_LONG = 'Le nom dépasse 100 caractères.';
/** Même phrase que le back : TeacherSubjectService.REMOVED_RESTORABLE. */
const REMOVED_RESTORABLE = 'Cette matière a été retirée. Tu peux la réactiver.';
/** Fin de phrase commune : nom identique ou nom très proche. */
const NAME_CAN_ASK_SUFFIX = ' de la partager.';
const NAME_MAX = 100;
const MODE_REQUIRED = 'Choisis de déplacer ou de partager.';
const COLLEAGUE_REQUIRED = 'Choisis un collègue.';

/**
 * Matières du professeur : créer, renommer, retirer, proposer un transfert.
 * Dans une année déjà cochée, il voit aussi les matières suivies par un collègue,
 * et le nom de ce collègue. Il ne peut pas les modifier : il peut demander le partage.
 * Le collègue valide via l'alerte en haut de page.
 */
@Component({
  selector: 'app-teacher-subjects-page',
  imports: [MatButtonModule, MatCardModule, MatFormFieldModule, MatInputModule, SpaceHeader],
  templateUrl: './teacher-subjects.page.html',
  styleUrl: './subjects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectsPage implements OnInit {
  private readonly api = inject(TeacherSubjectsService);

  readonly schools = signal<SchoolBlock[]>([]);
  readonly invites = signal<TeacherTransferInviteItem[]>([]);
  readonly deactivateNotices = signal<TeacherDeactivateNoticeItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly ready = signal(false);
  readonly error = signal<string | null>(null);
  readonly drafts = signal<Readonly<Record<string, string>>>({});
  readonly gradeErrors = signal<Readonly<Record<string, string>>>({});
  readonly subjectErrors = signal<Readonly<Record<number, string>>>({});
  readonly renamingId = signal<number | null>(null);
  readonly renameDraft = signal('');
  readonly pending = signal<Pending | null>(null);
  /** Enfants du cours, affichés en plus du message déjà là pour désactiver. */
  readonly followers = signal<TeacherSubjectFollowersResponse | null>(null);
  readonly followersLoading = signal(false);
  private followSeq = 0;
  /** Classe pour laquelle une demande de partage vient d'être envoyée. */
  readonly shareAskedKey = signal<string | null>(null);
  /** Matière déjà listée pour laquelle une demande de partage vient d'être envoyée. */
  readonly shareAskedSubjectId = signal<number | null>(null);

  ngOnInit(): void {
    this.reload(true);
  }

  draft(schoolId: number, grade: string): string {
    return this.drafts()[this.gradeKey(schoolId, grade)] ?? '';
  }

  gradeError(schoolId: number, grade: string): string | null {
    return this.gradeErrors()[this.gradeKey(schoolId, grade)] ?? null;
  }

  subjectError(subjectId: number): string | null {
    return this.subjectErrors()[subjectId] ?? null;
  }

  sharedNames(subject: SubjectRow): string[] {
    return subject.sharedWith
      .map((holder) => holder.displayName)
      .filter((name): name is string => !!name);
  }

  sharedLabel(subject: SubjectRow): string | null {
    const names = this.sharedNames(subject);
    if (names.length === 0) {
      return null;
    }
    const verb = subject.followedByMe ? 'Partagée avec' : 'Suivie par';
    return `${verb} ${names.join(', ')}`;
  }

  confirmText(school: SchoolBlock, grade: GradeBlock, subject: SubjectRow): string {
    const names = this.sharedNames(subject);
    if (names.length > 0) {
      return `Retirer ${subject.name} de ta liste ? ${names.join(', ')} la garde.`;
    }
    const place = school.schoolName ? `${grade.grade} de ${school.schoolName}` : grade.grade;
    return (
      `Retirer ${subject.name} du ${place} ? Tu es le seul dessus : ` +
      `plus aucun professeur ne la verra. Elle reste enregistrée.`
    );
  }

  removeIsSole(): boolean {
    const current = this.pending();
    return current?.kind === 'remove' ? current.sole : false;
  }

  removeColleagues(): TeacherSubjectColleagueItem[] {
    const current = this.pending();
    return current?.kind === 'remove' ? current.colleagues : [];
  }

  transferConfirmText(school: SchoolBlock, grade: GradeBlock, subject: SubjectRow): string {
    const current = this.pending();
    if (!current || current.kind !== 'transfer' || current.mode == null) {
      return '';
    }
    const colleague = current.colleagues.find((row) => row.userId === current.colleagueUserId);
    const who = colleague?.displayName || 'ce collègue';
    const place = school.schoolName
      ? `${subject.name} (${school.schoolName}, ${grade.grade})`
      : `${subject.name} (${grade.grade})`;
    if (current.mode === 'move') {
      return `Proposer de déplacer ${place} vers ${who} ? Elle quittera ta liste s'il accepte.`;
    }
    return `Proposer de partager ${place} avec ${who} ? Vous pourrez tous les deux agir s'il accepte.`;
  }

  transferMode(): TransferMode | null {
    const current = this.pending();
    return current?.kind === 'transfer' ? current.mode : null;
  }

  transferColleagueId(): number | null {
    const current = this.pending();
    return current?.kind === 'transfer' ? current.colleagueUserId : null;
  }

  transferColleagues(): TeacherSubjectColleagueItem[] {
    const current = this.pending();
    return current?.kind === 'transfer' ? current.colleagues : [];
  }

  transferConfirming(): boolean {
    const current = this.pending();
    return current?.kind === 'transfer' ? current.confirm : false;
  }

  inviteText(invite: TeacherTransferInviteItem): string {
    const place = invite.schoolName
      ? `${invite.subjectName} (${invite.schoolName}, ${invite.grade})`
      : `${invite.subjectName} (${invite.grade})`;
    const from = invite.fromDisplayName || 'Un collègue';
    if (invite.mode === 'ask') {
      return `${from} demande à voir aussi ${place}. Si tu acceptes, vous la partagerez.`;
    }
    const action = invite.mode === 'move' ? 'déplacer' : 'partager';
    return `${from} propose de ${action} ${place}.`;
  }

  inputValue(event: Event): string {
    const target = event.target;
    return target instanceof HTMLInputElement ? target.value : '';
  }

  onDraft(schoolId: number, grade: string, value: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.drafts.update((current) => ({ ...current, [key]: value }));
    this.clearGradeError(schoolId, grade);
    if (this.shareAskedKey() === key) {
      this.shareAskedKey.set(null);
    }
  }

  add(schoolId: number, grade: string): void {
    if (this.saving()) {
      return;
    }
    const raw = this.draft(schoolId, grade);
    const problem = nameProblem(raw);
    if (problem) {
      this.setGradeError(schoolId, grade, problem);
      return;
    }
    this.clearGradeError(schoolId, grade);
    this.error.set(null);
    this.saving.set(true);
    this.api.create({ schoolId, grade, name: raw.trim() }).subscribe({
      next: () => {
        this.onDraft(schoolId, grade, '');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setGradeError(schoolId, grade, httpErrorMessage(err, 'Ajout impossible.'));
      },
    });
  }

  /** Vrai quand l'ajout a été refusé parce que la matière a été retirée. */
  canRestore(schoolId: number, grade: string): boolean {
    return this.gradeError(schoolId, grade) === REMOVED_RESTORABLE;
  }

  /**
   * Vrai quand on peut demander le partage : nom identique, ou nom très proche
   * d'une matière encore visible.
   */
  canAskShare(schoolId: number, grade: string): boolean {
    const message = this.gradeError(schoolId, grade);
    return (
      message != null &&
      message.includes('Tu peux demander à ') &&
      message.endsWith(NAME_CAN_ASK_SUFFIX)
    );
  }

  shareAsked(schoolId: number, grade: string): boolean {
    return this.shareAskedKey() === this.gradeKey(schoolId, grade);
  }

  shareAskedFor(subjectId: number): boolean {
    return this.shareAskedSubjectId() === subjectId;
  }

  /**
   * Demande le partage d'une matière déjà affichée, suivie par un collègue.
   * Le nom envoyé est celui du back : pas une saisie locale.
   */
  requestShareOf(schoolId: number, grade: string, subject: SubjectRow): void {
    if (this.saving() || subject.followedByMe || subject.ownedByMe) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.requestShare({ schoolId, grade, name: subject.name }).subscribe({
      next: () => {
        this.saving.set(false);
        this.clearSubjectError(subject.id);
        this.shareAskedSubjectId.set(subject.id);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.shareAskedSubjectId.set(null);
        this.setSubjectError(subject.id, httpErrorMessage(err, 'Demande impossible.'));
      },
    });
  }

  requestShare(schoolId: number, grade: string): void {
    if (this.saving()) {
      return;
    }
    const raw = this.draft(schoolId, grade);
    const problem = nameProblem(raw);
    if (problem) {
      this.setGradeError(schoolId, grade, problem);
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.requestShare({ schoolId, grade, name: raw.trim() }).subscribe({
      next: () => {
        this.saving.set(false);
        this.clearGradeError(schoolId, grade);
        this.shareAskedKey.set(this.gradeKey(schoolId, grade));
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.shareAskedKey.set(null);
        this.setGradeError(schoolId, grade, httpErrorMessage(err, 'Demande impossible.'));
      },
    });
  }

  restore(schoolId: number, grade: string): void {
    if (this.saving()) {
      return;
    }
    const raw = this.draft(schoolId, grade);
    const problem = nameProblem(raw);
    if (problem) {
      this.setGradeError(schoolId, grade, problem);
      return;
    }
    this.clearGradeError(schoolId, grade);
    this.error.set(null);
    this.saving.set(true);
    this.api.restore({ schoolId, grade, name: raw.trim() }).subscribe({
      next: () => {
        this.onDraft(schoolId, grade, '');
        this.reload();
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setGradeError(schoolId, grade, httpErrorMessage(err, 'Réactivation impossible.'));
      },
    });
  }

  startRename(subject: SubjectRow): void {
    this.pending.set(null);
    this.renamingId.set(subject.id);
    this.renameDraft.set(subject.name);
    this.clearSubjectError(subject.id);
  }

  onRenameDraft(value: string): void {
    this.renameDraft.set(value);
    const current = this.renamingId();
    if (current != null) {
      this.clearSubjectError(current);
    }
  }

  cancelRename(): void {
    this.renamingId.set(null);
    this.renameDraft.set('');
  }

  saveRename(subjectId: number): void {
    if (this.saving()) {
      return;
    }
    const problem = nameProblem(this.renameDraft());
    if (problem) {
      this.setSubjectError(subjectId, problem);
      return;
    }
    this.clearSubjectError(subjectId);
    this.error.set(null);
    this.saving.set(true);
    this.api.rename(subjectId, { name: this.renameDraft().trim() }).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setSubjectError(subjectId, httpErrorMessage(err, 'Renommage impossible.'));
      },
    });
  }

  askRemove(subject: SubjectRow): void {
    this.renamingId.set(null);
    this.clearSubjectError(subject.id);
    const sole = subject.sharedWith.length === 0;
    this.pending.set({ id: subject.id, kind: 'remove', sole, colleagues: [] });
    this.loadFollowers(subject.id);
    if (!sole) {
      return;
    }
    this.api.colleagues(subject.id).subscribe({
      next: (body) => {
        const current = this.pending();
        if (!current || current.kind !== 'remove' || current.id !== subject.id) {
          return;
        }
        this.pending.set({
          ...current,
          colleagues: colleaguesOf(body.colleagues),
        });
      },
      error: (err: HttpErrorResponse) => {
        this.setSubjectError(subject.id, httpErrorMessage(err, 'Collègues indisponibles.'));
      },
    });
  }

  /**
   * Depuis le retrait « dernier détenteur » : ouvre le transfert en mode déplacer
   * avec la liste déjà chargée (pas de retrait tant que le collègue n'a pas accepté).
   */
  chooseMoveInstead(subject: SubjectRow): void {
    const current = this.pending();
    if (!current || current.kind !== 'remove' || !current.sole || current.id !== subject.id) {
      return;
    }
    this.clearSubjectError(subject.id);
    this.clearFollowers();
    this.pending.set({
      id: subject.id,
      kind: 'transfer',
      mode: 'move',
      colleagueUserId: null,
      colleagues: current.colleagues,
      confirm: false,
    });
  }

  askTransfer(subject: SubjectRow): void {
    this.renamingId.set(null);
    this.clearSubjectError(subject.id);
    this.pending.set({
      id: subject.id,
      kind: 'transfer',
      mode: null,
      colleagueUserId: null,
      colleagues: [],
      confirm: false,
    });
    this.api.colleagues(subject.id).subscribe({
      next: (body) => {
        const current = this.pending();
        if (!current || current.kind !== 'transfer' || current.id !== subject.id) {
          return;
        }
        this.pending.set({
          ...current,
          colleagues: colleaguesOf(body.colleagues),
        });
      },
      error: (err: HttpErrorResponse) => {
        this.pending.set(null);
        this.setSubjectError(subject.id, httpErrorMessage(err, 'Collègues indisponibles.'));
      },
    });
  }

  setTransferMode(mode: TransferMode): void {
    const current = this.pending();
    if (!current || current.kind !== 'transfer') {
      return;
    }
    this.pending.set({ ...current, mode, confirm: false });
    this.clearSubjectError(current.id);
  }

  setTransferColleague(userId: number): void {
    const current = this.pending();
    if (!current || current.kind !== 'transfer') {
      return;
    }
    this.pending.set({ ...current, colleagueUserId: userId, confirm: false });
    this.clearSubjectError(current.id);
  }

  prepareTransferConfirm(subjectId: number): void {
    const current = this.pending();
    if (!current || current.kind !== 'transfer' || current.id !== subjectId) {
      return;
    }
    if (current.mode == null) {
      this.setSubjectError(subjectId, MODE_REQUIRED);
      return;
    }
    if (current.colleagueUserId == null) {
      this.setSubjectError(subjectId, COLLEAGUE_REQUIRED);
      return;
    }
    this.clearSubjectError(subjectId);
    this.pending.set({ ...current, confirm: true });
  }

  cancelPending(): void {
    this.clearFollowers();
    this.pending.set(null);
  }

  private loadFollowers(subjectId: number): void {
    const seq = ++this.followSeq;
    this.followers.set(null);
    this.followersLoading.set(true);
    this.api.followers(subjectId).subscribe({
      next: (body) => {
        if (seq !== this.followSeq) {
          return;
        }
        const current = this.pending();
        this.followersLoading.set(false);
        const shown = current?.kind === 'remove';
        if (!current || current.id !== subjectId || !shown) {
          return;
        }
        this.followers.set(body);
      },
      error: (err: HttpErrorResponse) => {
        if (seq !== this.followSeq) {
          return;
        }
        this.followersLoading.set(false);
        this.pending.set(null);
        this.setSubjectError(subjectId, httpErrorMessage(err, 'Impossible de savoir qui suit ce cours.'));
      },
    });
  }

  private clearFollowers(): void {
    this.followSeq += 1;
    this.followers.set(null);
    this.followersLoading.set(false);
  }

  reactivate(subjectId: number): void {
    this.postState(subjectId, () => this.api.reactivate(subjectId), 'Réactivation impossible.');
  }

  confirmRemove(subjectId: number): void {
    this.postState(subjectId, () => this.api.remove(subjectId), 'Retrait impossible.');
  }

  confirmTransfer(subjectId: number): void {
    const current = this.pending();
    if (
      !current ||
      current.kind !== 'transfer' ||
      current.mode == null ||
      current.colleagueUserId == null ||
      this.saving()
    ) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api
      .transfer(subjectId, { colleagueUserId: current.colleagueUserId, mode: current.mode })
      .subscribe({
        next: () => this.reload(),
        error: (err: HttpErrorResponse) => {
          this.saving.set(false);
          this.setSubjectError(subjectId, httpErrorMessage(err, 'Transfert impossible.'));
        },
      });
  }

  acceptInvite(inviteId: number | undefined): void {
    if (inviteId == null || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.acceptTransfer(inviteId).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Acceptation impossible.'));
      },
    });
  }

  rejectInvite(inviteId: number | undefined): void {
    if (inviteId == null || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.rejectTransfer(inviteId).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Refus impossible.'));
      },
    });
  }

  dismissDeactivateNotice(noticeId: number | undefined): void {
    if (noticeId == null || this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.api.dismissDeactivateNotice(noticeId).subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(httpErrorMessage(err, 'Fermeture impossible.'));
      },
    });
  }

  private postState(subjectId: number, call: () => Observable<void>, fallback: string): void {
    if (this.saving()) {
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    call().subscribe({
      next: () => this.reload(),
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.setSubjectError(subjectId, httpErrorMessage(err, fallback));
      },
    });
  }

  private reload(initial = false): void {
    this.api.load().subscribe({
      next: (subjects) => {
        this.apply(subjects);
        this.saving.set(false);
        this.renamingId.set(null);
        this.renameDraft.set('');
        this.pending.set(null);
        if (initial) {
          this.loading.set(false);
        }
        this.api
          .transferInvites()
          .pipe(catchError(() => of({ invites: [] })))
          .subscribe((body) => this.invites.set(body.invites ?? []));
        this.api
          .deactivateNotices()
          .pipe(catchError(() => of({ notices: [] })))
          .subscribe((body) => this.deactivateNotices.set(body.notices ?? []));
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        this.loading.set(false);
        this.error.set(httpErrorMessage(err, 'Matières indisponibles.'));
      },
    });
  }

  private apply(body: TeacherSubjectsResponse): void {
    const schools: SchoolBlock[] = [];
    for (const school of body.schools ?? []) {
      if (school.schoolId == null) {
        continue;
      }
      const grades: GradeBlock[] = [];
      for (const grade of school.grades ?? []) {
        if (!grade.grade) {
          continue;
        }
        const subjects: SubjectRow[] = [];
        for (const subject of grade.subjects ?? []) {
          if (subject.id == null || !subject.name) {
            continue;
          }
          subjects.push({
            id: subject.id,
            name: subject.name,
            active: subject.active !== false,
            ownedByMe: subject.ownedByMe === true,
            followedByMe: subject.followedByMe !== false,
            sharedWith: holdersOf(subject.sharedWith),
          });
        }
        grades.push({ grade: grade.grade, subjects });
      }
      schools.push({
        schoolId: school.schoolId,
        schoolName: school.schoolName ?? '',
        grades,
      });
    }
    this.schools.set(schools);
    this.ready.set(true);
  }

  private gradeKey(schoolId: number, grade: string): string {
    return `${schoolId}|${grade}`;
  }

  private setGradeError(schoolId: number, grade: string, message: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.gradeErrors.update((current) => ({ ...current, [key]: message }));
  }

  private clearGradeError(schoolId: number, grade: string): void {
    const key = this.gradeKey(schoolId, grade);
    this.gradeErrors.update((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  private setSubjectError(subjectId: number, message: string): void {
    this.subjectErrors.update((current) => ({ ...current, [subjectId]: message }));
  }

  private clearSubjectError(subjectId: number): void {
    this.subjectErrors.update((current) => {
      if (!(subjectId in current)) {
        return current;
      }
      const next = { ...current };
      delete next[subjectId];
      return next;
    });
  }
}

function nameProblem(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return NAME_REQUIRED;
  }
  if (trimmed.length > NAME_MAX) {
    return NAME_TOO_LONG;
  }
  return null;
}

function colleaguesOf(
  rows: TeacherSubjectColleagueItem[] | null | undefined,
): TeacherSubjectColleagueItem[] {
  return (rows ?? []).filter((row) => row.userId != null) as TeacherSubjectColleagueItem[];
}

function holdersOf(
  rows: TeacherSubjectSharedHolder[] | null | undefined,
): TeacherSubjectSharedHolder[] {
  return (rows ?? []).filter((row) => row.userId != null) as TeacherSubjectSharedHolder[];
}
