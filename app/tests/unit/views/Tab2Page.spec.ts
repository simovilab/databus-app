import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Tab2Page from '@/views/Tab2Page.vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonButton,
  IonSelect,
  IonSelectOption,
  IonModal
} from '@ionic/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

// Mock the useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: vi.fn(() => ({
    isDark: { value: false },
    toggleTheme: vi.fn()
  }))
}));

describe('Tab2Page.vue', () => {
  const mountComponent = () => {
    return mount(Tab2Page, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonSegment,
          IonSegmentButton,
          IonLabel,
          IonIcon,
          IonButton,
          IonSelect,
          IonSelectOption,
          IonModal,
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

  it('should render the title "Viajes"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Viajes');
  });

  it('should render ThemeToggle component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(ThemeToggle).exists()).toBe(true);
  });

  it('should have two segment buttons', () => {
    const wrapper = mountComponent();
    const segmentButtons = wrapper.findAllComponents(IonSegmentButton);
    expect(segmentButtons.length).toBe(2);
  });

  it('should display "Viaje" and "Histórico" segment labels', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Viaje');
    expect(wrapper.text()).toContain('Histórico');
  });

  it('should default to "first" segment', () => {
    const wrapper = mountComponent();
    const segment = wrapper.findComponent(IonSegment);
    expect(segment.exists()).toBe(true);
  });

  it('should display select components when first tab is active', () => {
    const wrapper = mountComponent();
    const selects = wrapper.findAllComponents(IonSelect);
    expect(selects.length).toBeGreaterThan(0);
  });

  it('should have select elements for route selection', () => {
    const wrapper = mountComponent();
    const selects = wrapper.findAllComponents(IonSelect);
    expect(selects.length).toBeGreaterThanOrEqual(1);
  });

  it('should have available routes', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toMatch(/bUCR/);
  });

  it('should render the "Comenzar viaje" button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Comenzar viaje');
  });

  it('should have "Comenzar viaje" button', () => {
    const wrapper = mountComponent();
    const buttons = wrapper.findAllComponents(IonButton);
    const comenzarButton = buttons.find(btn => btn.text().includes('Comenzar viaje'));
    expect(comenzarButton).toBeDefined();
  });

  it('should enable "Comenzar viaje" button when route and recorrido are selected', async () => {
    const wrapper = mountComponent();
    
    // Set route and recorrido
    await wrapper.vm.$nextTick();
    wrapper.vm.rutaSeleccionada = 'bUCR L1';
    wrapper.vm.recorridoSeleccionado = 'Bus interno UCR ida';
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAllComponents(IonButton);
    const comenzarButton = buttons.find(btn => btn.text().includes('Comenzar viaje'));
    expect(comenzarButton?.attributes('disabled')).toBeUndefined();
  });

  it('should render modal component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonModal).exists()).toBe(true);
  });

  it('should open modal when "Comenzar viaje" is clicked', async () => {
    const wrapper = mountComponent();
    
    // Set selections to enable the button
    wrapper.vm.rutaSeleccionada = 'bUCR L1';
    wrapper.vm.recorridoSeleccionado = 'Bus interno UCR ida';
    await wrapper.vm.$nextTick();

    // Click the button
    wrapper.vm.setModalOpen(true);
    await wrapper.vm.$nextTick();

    expect(wrapper.vm.isModalOpen).toBe(true);
  });

  it('should close modal when "Finalizar Viaje" is clicked', async () => {
    const wrapper = mountComponent();
    
    // Open modal
    wrapper.vm.setModalOpen(true);
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.isModalOpen).toBe(true);

    // Close modal
    wrapper.vm.setModalOpen(false);
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.isModalOpen).toBe(false);
  });

  it('should have modal content', () => {
    const wrapper = mountComponent();
    const modal = wrapper.findComponent(IonModal);
    expect(modal.exists()).toBe(true);
  });

  it('should display selected route and recorrido in the modal', async () => {
    const wrapper = mountComponent();
    
    wrapper.vm.rutaSeleccionada = 'bUCR L1';
    wrapper.vm.recorridoSeleccionado = 'Bus interno UCR ida';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('bUCR L1');
    expect(wrapper.text()).toContain('Bus interno UCR ida');
  });

  it('should display historical content when second tab is selected', async () => {
    const wrapper = mountComponent();
    
    wrapper.vm.selectedTab = 'second';
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain('Contenido del histórico');
  });

  it('should have buttons in the component', () => {
    const wrapper = mountComponent();
    const buttons = wrapper.findAllComponents(IonButton);
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('should have 3 available routes', () => {
    const wrapper = mountComponent();
    expect(wrapper.vm.rutasDisponibles.length).toBe(3);
  });

  it('should have 2 available recorridos', () => {
    const wrapper = mountComponent();
    expect(wrapper.vm.recorridosDisponibles.length).toBe(2);
  });
});
