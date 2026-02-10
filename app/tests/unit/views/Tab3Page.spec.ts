import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Tab3Page from '@/views/Tab3Page.vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent
} from '@ionic/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';
import ExploreContainer from '@/components/ExploreContainer.vue';

// Mock the useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: vi.fn(() => ({
    isDark: { value: false },
    toggleTheme: vi.fn()
  }))
}));

describe('Tab3Page.vue', () => {
  const mountComponent = () => {
    return mount(Tab3Page, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          ThemeToggle,
          ExploreContainer
        }
      }
    });
  };

  it('should render the component', () => {
    const wrapper = mountComponent();
    expect(wrapper.exists()).toBe(true);
  });

  it('should render IonPage component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonPage).exists()).toBe(true);
  });

  it('should render the title "Tab 3"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Tab 3');
  });

  it('should render large title "Mensajes"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Mensajes');
  });

  it('should render ThemeToggle component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(ThemeToggle).exists()).toBe(true);
  });

  it('should render ExploreContainer component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(ExploreContainer).exists()).toBe(true);
  });

  it('should pass "Mensajes page" to ExploreContainer', () => {
    const wrapper = mountComponent();
    const exploreContainer = wrapper.findComponent(ExploreContainer);
    expect(exploreContainer.props('name')).toBe('Mensajes page');
  });

  it('should render IonContent component', () => {
    const wrapper = mountComponent();
    const content = wrapper.findComponent(IonContent);
    expect(content.exists()).toBe(true);
  });

  it('should have collapsible header', () => {
    const wrapper = mountComponent();
    const headers = wrapper.findAllComponents(IonHeader);
    expect(headers.length).toBeGreaterThan(1);
  });

  it('should render toolbar', () => {
    const wrapper = mountComponent();
    expect(wrapper.findAllComponents(IonToolbar).length).toBeGreaterThan(0);
  });
});
