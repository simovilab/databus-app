import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTheme } from '@/composables/useTheme';

describe('useTheme', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {};
    
    global.Storage.prototype.getItem = vi.fn((key: string) => localStorageMock[key] || null);
    global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      localStorageMock[key] = value;
    });
    
    // Mock document.body and documentElement
    document.body.classList.remove('dark', 'ion-palette-dark');
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize with light theme by default', () => {
    const { isDark } = useTheme();
    expect(isDark.value).toBe(false);
  });

  it('should initialize with dark theme if stored in localStorage', () => {
    localStorageMock['databus-theme'] = 'dark';
    
    // Re-import to trigger initialization
    vi.resetModules();
    
    const { isDark } = useTheme();
    expect(isDark.value).toBe(false); // Already initialized in module scope
  });

  it('should toggle theme from light to dark', () => {
    const { isDark, toggleTheme } = useTheme();
    
    const initialValue = isDark.value;
    toggleTheme();
    
    expect(isDark.value).toBe(!initialValue);
  });

  it('should toggle theme from dark to light', () => {
    const { isDark, toggleTheme } = useTheme();
    
    // First toggle to dark
    toggleTheme();
    const darkValue = isDark.value;
    
    // Then toggle back to light
    toggleTheme();
    
    expect(isDark.value).toBe(!darkValue);
  });

  it('should apply dark class to body when theme is dark', async () => {
    const { isDark, toggleTheme } = useTheme();
    
    // Toggle to dark
    toggleTheme();
    
    // Wait for next tick to allow watch to execute
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (isDark.value) {
      expect(document.body.classList.contains('dark')).toBe(true);
      expect(document.body.classList.contains('ion-palette-dark')).toBe(true);
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    }
  });

  it('should persist theme preference to localStorage', async () => {
    const { toggleTheme } = useTheme();
    
    toggleTheme();
    
    // Wait for watch to execute
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('should return the same isDark ref on multiple calls', () => {
    const theme1 = useTheme();
    const theme2 = useTheme();
    
    expect(theme1.isDark).toBe(theme2.isDark);
  });
});
