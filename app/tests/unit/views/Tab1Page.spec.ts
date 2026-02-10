import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Tab1Page from '@/views/Tab1Page.vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonImg
} from '@ionic/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

// Mock the useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: vi.fn(() => ({
    isDark: { value: false },
    toggleTheme: vi.fn()
  }))
}));

describe('Tab1Page.vue', () => {
  const mountComponent = () => {
    return mount(Tab1Page, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonCard,
          IonCardContent,
          IonGrid,
          IonRow,
          IonCol,
          IonText,
          IonImg,
          ThemeToggle
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

  it('should render the header with toolbar', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonHeader).exists()).toBe(true);
    expect(wrapper.findComponent(IonToolbar).exists()).toBe(true);
  });

  it('should display the greeting message "Hola, José Castro"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Hola, José Castro');
  });

  it('should render ThemeToggle component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(ThemeToggle).exists()).toBe(true);
  });

  it('should render the information card', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonCard).exists()).toBe(true);
    expect(wrapper.findComponent(IonCardContent).exists()).toBe(true);
  });

  it('should display vehicle information "SJB1234"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Vehículo');
    expect(wrapper.text()).toContain('SJB1234');
  });

  it('should display agency information "bUCR"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Agencia');
    expect(wrapper.text()).toContain('bUCR');
  });

  it('should display the UCR bus service text', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Servicio de buses de la');
    expect(wrapper.text()).toContain('Universidad de Costa Rica');
  });

  it('should render IonContent component', () => {
    const wrapper = mountComponent();
    const content = wrapper.findComponent(IonContent);
    expect(content.exists()).toBe(true);
  });

  it('should render the grid with rows and columns', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonGrid).exists()).toBe(true);
    expect(wrapper.findAllComponents(IonRow).length).toBeGreaterThan(0);
    expect(wrapper.findAllComponents(IonCol).length).toBeGreaterThan(0);
  });
});
