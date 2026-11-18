import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import type { ChildLearningQuestionItem } from '../../core/api/api-models';
import { apiErrorMessage } from '../../core/auth/child-auth.service';
import { ChildPlayService } from './data-access/child-play.service';
import { shuffleCopy } from './shuffle';

/**
 * Liste des questions d'une matière — ordre mélangé à chaque ouverture (anti-réflexe).
 */
@Component({
  selector: 'app-subject-questions-page',
  imports: [RouterLink],
  templateUrl: './subject-questions.page.html',
  styleUrl: './subject-questions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SubjectQuestionsPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly api = inject(ChildPlayService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly subjectName = signal('');
  protected readonly subjectId = signal(0);
  protected readonly questions = signal<ChildLearningQuestionItem[]>([]);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('subjectId'));
    if (!Number.isFinite(id) || id <= 0) {
      void this.router.navigateByUrl('/learn');
      return;
    }
    this.subjectId.set(id);
    this.api.listQuestions(id).subscribe({
      next: (body) => {
        this.subjectName.set(body.subjectName ?? '');
        this.questions.set(shuffleCopy(body.questions ?? []));
        this.loading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Impossible de charger les questions.'));
      },
    });
  }

  protected formLabel(code: string | undefined): string {
    if (code === 'vrai_faux') {
      return 'Vrai ou faux';
    }
    if (code === 'qcm') {
      return 'QCM';
    }
    return code ?? '';
  }

  protected canPlay(code: string | undefined): boolean {
    return code === 'vrai_faux' || code === 'qcm';
  }
}
