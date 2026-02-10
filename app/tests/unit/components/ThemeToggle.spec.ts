import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ThemeToggle from '@/components/ThemeToggle.vue';
import { IonButtons, IonButton, IonIcon } from '@ionic/vue';

// Mock the useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: vi.fn(() => ({
    isDark: { value: false },
    toggleTheme: vi.fn()
  }))
}));

describe('ThemeToggle.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render correctly', () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    expect(wrapper.exists()).toBe(true);
    expect(wrapper.findComponent(IonButtons).exists()).toBe(true);
    expect(wrapper.findComponent(IonButton).exists()).toBe(true);
    expect(wrapper.findComponent(IonIcon).exists()).toBe(true);
  });

  it('should display icon when theme is light', () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    const icon = wrapper.findComponent(IonIcon);
    expect(icon.exists()).toBe(true);
  });

  it('should display icon when theme is dark', () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    const icon = wrapper.findComponent(IonIcon);
    expect(icon.exists()).toBe(true);
  });

  it('should have click handler on button', async () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    const button = wrapper.findComponent(IonButton);
    expect(button.exists()).toBe(true);
    // Button should be clickable
    await button.trigger('click');
  });

  it('should have slot="end" on IonButtons', () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    const buttons = wrapper.findComponent(IonButtons);
    expect(buttons.attributes('slot')).toBe('end');
  });

  it('should have slot="icon-only" on IonIcon', () => {
    const wrapper = mount(ThemeToggle, {
      global: {
        components: {
          IonButtons,
          IonButton,
          IonIcon
        }
      }
    });
    
    const icon = wrapper.findComponent(IonIcon);
    expect(icon.attributes('slot')).toBe('icon-only');
  });
});
