import { TestBed } from '@angular/core/testing';

import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('starts in dark when nothing is stored', () => {
    const theme = TestBed.inject(ThemeService);
    expect(theme.theme()).toBe('dark');
    expect(theme.hostClass()).toContain('theme-learn-dark');
  });

  it('switches to light and remembers the choice', () => {
    const theme = TestBed.inject(ThemeService);
    theme.toggle();
    expect(theme.theme()).toBe('light');
    expect(localStorage.getItem('learning.theme')).toBe('light');
    expect(theme.hostClass()).toContain('theme-learn-light');
  });
});
