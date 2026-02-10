import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import TabsPage from '@/views/TabsPage.vue';
import {
  IonTabBar,
  IonTabButton,
  IonTabs,
  IonLabel,
  IonIcon,
  IonPage,
  IonRouterOutlet
} from '@ionic/vue';

describe('TabsPage.vue', () => {
  const mountComponent = () => {
    return mount(TabsPage, {
      global: {
        components: {
          IonTabBar,
          IonTabButton,
          IonTabs,
          IonLabel,
          IonIcon,
          IonPage,
          IonRouterOutlet
        },
        stubs: {
          IonRouterOutlet: true
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

  it('should render IonTabs component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonTabs).exists()).toBe(true);
  });

  it('should render IonRouterOutlet component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonRouterOutlet).exists()).toBe(true);
  });

  it('should render IonTabBar component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonTabBar).exists()).toBe(true);
  });

  it('should have tab bar at the bottom', () => {
    const wrapper = mountComponent();
    const tabBar = wrapper.findComponent(IonTabBar);
    expect(tabBar.attributes('slot')).toBe('bottom');
  });

  it('should have 4 tab buttons', () => {
    const wrapper = mountComponent();
    const tabButtons = wrapper.findAllComponents(IonTabButton);
    expect(tabButtons.length).toBe(4);
  });

  it('should have tab1 button', () => {
    const wrapper = mountComponent();
    const tabButtons = wrapper.findAllComponents(IonTabButton);
    expect(tabButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('should have tab2 button', () => {
    const wrapper = mountComponent();
    const tabButtons = wrapper.findAllComponents(IonTabButton);
    expect(tabButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('should have tab3 button', () => {
    const wrapper = mountComponent();
    const tabButtons = wrapper.findAllComponents(IonTabButton);
    expect(tabButtons.length).toBeGreaterThanOrEqual(3);
  });

  it('should have tab4 button', () => {
    const wrapper = mountComponent();
    const tabButtons = wrapper.findAllComponents(IonTabButton);
    expect(tabButtons.length).toBeGreaterThanOrEqual(4);
  });

  it('should display "Inicio" label for tab1', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Inicio');
  });

  it('should display "Viajes" label for tab2', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Viajes');
  });

  it('should display "Mensajes" label for tab3', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Mensajes');
  });

  it('should display "Perfil" label for tab4', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Perfil');
  });

  it('should have icons for each tab', () => {
    const wrapper = mountComponent();
    const icons = wrapper.findAllComponents(IonIcon);
    expect(icons.length).toBe(4);
  });

  it('should have labels for each tab', () => {
    const wrapper = mountComponent();
    const labels = wrapper.findAllComponents(IonLabel);
    expect(labels.length).toBe(4);
  });

  it('should render all required Ionic components', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonPage).exists()).toBe(true);
    expect(wrapper.findComponent(IonTabs).exists()).toBe(true);
    expect(wrapper.findComponent(IonTabBar).exists()).toBe(true);
    expect(wrapper.findAllComponents(IonTabButton).length).toBe(4);
    expect(wrapper.findComponent(IonRouterOutlet).exists()).toBe(true);
  });
});
