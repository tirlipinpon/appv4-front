import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';

import { SpaceHeader } from '../../core/layout/space-header';

/** Page des matières du professeur. La liste n'existe pas encore. */
@Component({
  selector: 'app-teacher-subjects-page',
  imports: [MatCardModule, SpaceHeader],
  templateUrl: './teacher-subjects.page.html',
  styleUrl: './subjects.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeacherSubjectsPage {}
