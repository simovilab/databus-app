import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import RunPage from '@/views/RunPage.vue';
import RunInfo from '@/components/RunInfo.vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonIcon,
  alertController,
} from '@ionic/vue';

vi.mock('@ionic/vue', async () => {
  const actual = await vi.importActual('@ionic/vue');
  return {
    ...actual,
    alertController: {
      create: vi.fn().mockResolvedValue({
        present: vi.fn(),
      }),
    },
  };
});

describe('RunPage.vue', () => {
  it('renders the component correctly', () => {
    const wrapper = mount(RunPage, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonIcon,
          RunInfo,
        },
      },
    });

    expect(wrapper.exists()).toBe(true);
  });

  it('displays "Viaje en progreso" title', () => {
    const wrapper = mount(RunPage, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonIcon,
          RunInfo,
        },
      },
    });

    expect(wrapper.text()).toContain('Viaje en progreso');
  });

  it('renders RunInfo component with correct props', () => {
    const wrapper = mount(RunPage, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonIcon,
          RunInfo,
        },
      },
    });

    const runInfo = wrapper.findComponent(RunInfo);
    expect(runInfo.exists()).toBe(true);
    expect(runInfo.props('direction')).toBe('Hacia Deportivas');
    expect(runInfo.props('trajectory')).toBe('Desde educación con milla');
    expect(runInfo.props('startTime')).toBe('10:55:37 a.m');
    expect(runInfo.props('operationDay')).toBe('Entresemana');
    expect(runInfo.props('hasAlert')).toBe(true);
    expect(runInfo.props('progress')).toBe(35);
  });

  it('shows confirmation alert when end-trip event is emitted', async () => {
    const wrapper = mount(RunPage, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonIcon,
          RunInfo,
        },
      },
    });

    const runInfo = wrapper.findComponent(RunInfo);
    await runInfo.vm.$emit('end-trip');

    expect(alertController.create).toHaveBeenCalledWith(
      expect.objectContaining({
        header: 'Finalizar viaje',
        message: '¿Estás seguro de que deseas finalizar el viaje?',
      })
    );
  });

  it('has bus icon in header', () => {
    const wrapper = mount(RunPage, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonIcon,
          RunInfo,
        },
      },
    });

    const busIcon = wrapper.find('.bus-icon');
    expect(busIcon.exists()).toBe(true);
  });
});
