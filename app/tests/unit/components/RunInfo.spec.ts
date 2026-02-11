import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import RunInfo from '@/components/RunInfo.vue';
import { IonCard, IonCardContent, IonList, IonItem, IonLabel, IonButton, IonIcon } from '@ionic/vue';

describe('RunInfo.vue', () => {
  let wrapper: any;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
    vi.restoreAllMocks();
  });

  it('renders the component correctly', () => {
    wrapper = mount(RunInfo, {
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('displays route information', () => {
    wrapper = mount(RunInfo, {
      props: {
        route: 'Ruta 1',
        direction: 'Hacia Deportivas',
        trajectory: 'Desde educación con milla',
        startTime: '10:55:37 a.m',
        operationDay: 'Entresemana',
      },
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    expect(wrapper.text()).toContain('Ruta');
    expect(wrapper.text()).toContain('Sentido');
    expect(wrapper.text()).toContain('Hacia Deportivas');
    expect(wrapper.text()).toContain('Trayectoria');
    expect(wrapper.text()).toContain('Desde educación con milla');
    expect(wrapper.text()).toContain('Hora de inicio');
    expect(wrapper.text()).toContain('10:55:37 a.m');
    expect(wrapper.text()).toContain('Día de operación');
    expect(wrapper.text()).toContain('Entresemana');
  });

  it('shows alert icon when hasAlert is true', () => {
    wrapper = mount(RunInfo, {
      props: {
        hasAlert: true,
      },
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const icons = wrapper.findAllComponents(IonIcon);
    expect(icons.length).toBeGreaterThan(0);
  });

  it('does not show alert icon when hasAlert is false', () => {
    wrapper = mount(RunInfo, {
      props: {
        hasAlert: false,
      },
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const alertIcon = wrapper.find('.alert-icon');
    expect(alertIcon.exists()).toBe(false);
  });

  it('displays progress bar with correct width', () => {
    wrapper = mount(RunInfo, {
      props: {
        progress: 45,
      },
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const progressFill = wrapper.find('.progress-fill');
    expect(progressFill.attributes('style')).toContain('width: 45%');
  });

  it('updates elapsed time every second', async () => {
    wrapper = mount(RunInfo, {
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    expect(wrapper.text()).toContain('0 min 0 s');

    vi.advanceTimersByTime(1000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('0 min 1 s');

    vi.advanceTimersByTime(59000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('1 min 0 s');

    vi.advanceTimersByTime(34000);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('1 min 34 s');
  });

  it('emits end-trip event when end trip button is clicked', async () => {
    wrapper = mount(RunInfo, {
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const endTripButton = wrapper.findComponent(IonButton);
    await endTripButton.trigger('click');

    expect(wrapper.emitted()).toHaveProperty('end-trip');
    expect(wrapper.emitted('end-trip')).toHaveLength(1);
  });

  it('displays "Finalizar viaje" text on button', () => {
    wrapper = mount(RunInfo, {
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    expect(wrapper.text()).toContain('Finalizar viaje');
  });

  it('shows empty state for missing fields', () => {
    wrapper = mount(RunInfo, {
      props: {
        route: '',
        direction: '',
        trajectory: '',
        startTime: '',
        operationDay: '',
      },
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const emptyValues = wrapper.findAll('.field-value-empty');
    expect(emptyValues.length).toBeGreaterThan(0);
  });

  it('clears interval on component unmount', () => {
    wrapper = mount(RunInfo, {
      global: {
        components: {
          IonCard,
          IonCardContent,
          IonList,
          IonItem,
          IonLabel,
          IonButton,
          IonIcon,
        },
      },
    });

    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    wrapper.unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
