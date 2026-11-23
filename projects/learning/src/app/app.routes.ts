import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./features/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: '',
    loadComponent: () => import('./features/shell/shell.page').then((m) => m.ShellPage),
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'learn',
        loadComponent: () => import('./features/learn/learn.page').then((m) => m.LearnPage),
      },
      {
        path: 'learn/:subjectId',
        loadComponent: () =>
          import('./features/learn/subject-board.page').then((m) => m.SubjectBoardPage),
      },
      {
        path: 'learn/:subjectId/questions',
        loadComponent: () =>
          import('./features/learn/subject-questions.page').then((m) => m.SubjectQuestionsPage),
      },
      {
        path: 'learn/:subjectId/play/:questionId',
        loadComponent: () =>
          import('./features/learn/play-question.page').then((m) => m.PlayQuestionPage),
      },
      {
        path: 'rewards',
        loadComponent: () => import('./features/rewards/rewards.page').then((m) => m.RewardsPage),
      },
      {
        path: 'ranking',
        loadComponent: () => import('./features/ranking/ranking.page').then((m) => m.RankingPage),
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.page').then((m) => m.ProfilePage),
      },
    ],
  },
];
