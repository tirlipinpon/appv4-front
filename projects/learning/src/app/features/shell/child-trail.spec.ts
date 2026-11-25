import { routes } from '../../app.routes';
import { childRouteHasTrail, childTrail } from './child-trail';

describe('catalogue du fil enfant', () => {
  it('couvre chaque écran du shell', () => {
    const shell = routes.find((route) => Array.isArray(route.children));
    const children = shell?.children ?? [];
    expect(children.length).toBeGreaterThan(0);
    for (const route of children) {
      expect(childRouteHasTrail(route.path ?? '')).withContext(route.path ?? '').toBeTrue();
    }
  });

  it('sur Jouer sans nom, le fil est Apprendre, Questions, Jouer', () => {
    expect(childTrail('/learn/12/play/4', null)).toEqual([
      { label: 'Apprendre', path: '/learn' },
      { label: 'Questions', path: '/learn/12/questions' },
      { label: 'Jouer', path: null },
    ]);
  });

  it('sur Jouer, le fil place la matière entre Apprendre et Questions', () => {
    expect(childTrail('/learn/12/play/4', 'Mathématiques')).toEqual([
      { label: 'Apprendre', path: '/learn' },
      { label: 'Mathématiques', path: '/learn/12' },
      { label: 'Questions', path: '/learn/12/questions' },
      { label: 'Jouer', path: null },
    ]);
  });

  it('laisse le login sans fil', () => {
    expect(childTrail('/login', 'Mathématiques')).toEqual([]);
  });
});
