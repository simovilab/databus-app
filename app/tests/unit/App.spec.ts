import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '@/App.vue';
import { IonApp, IonRouterOutlet } from '@ionic/vue';

describe('App.vue', () => {
  const mountComponent = () => {
    return mount(App, {
      global: {
        components: {
          IonApp,
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

  it('should render IonApp component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonApp).exists()).toBe(true);
  });

  it('should render IonRouterOutlet component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonRouterOutlet).exists()).toBe(true);
  });

  it('should have IonRouterOutlet as direct child of IonApp', () => {
    const wrapper = mountComponent();
    const ionApp = wrapper.findComponent(IonApp);
    const ionRouterOutlet = ionApp.findComponent(IonRouterOutlet);
    expect(ionRouterOutlet.exists()).toBe(true);
  });

  it('should be a valid Vue component', () => {
    const wrapper = mountComponent();
    expect(wrapper.vm).toBeDefined();
  });

  it('should not have any props defined', () => {
    const wrapper = mountComponent();
    expect(Object.keys(wrapper.props()).length).toBe(0);
  });

  it('should use Ionic components', () => {
    const wrapper = mountComponent();
    const html = wrapper.html();
    expect(html).toContain('ion-app');
  });
});
