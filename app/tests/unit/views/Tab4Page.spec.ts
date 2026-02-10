import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import Tab4Page from '@/views/Tab4Page.vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardContent,
  IonText,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonModal,
  IonInput
} from '@ionic/vue';
import ThemeToggle from '@/components/ThemeToggle.vue';

// Mock the useTheme composable
vi.mock('@/composables/useTheme', () => ({
  useTheme: vi.fn(() => ({
    isDark: { value: false },
    toggleTheme: vi.fn()
  }))
}));

describe('Tab4Page.vue', () => {
  const mountComponent = () => {
    return mount(Tab4Page, {
      global: {
        components: {
          IonPage,
          IonHeader,
          IonToolbar,
          IonTitle,
          IonContent,
          IonButtons,
          IonBackButton,
          IonCard,
          IonCardContent,
          IonText,
          IonGrid,
          IonRow,
          IonCol,
          IonItem,
          IonLabel,
          IonIcon,
          IonSelect,
          IonSelectOption,
          IonButton,
          IonModal,
          IonInput,
          ThemeToggle
        },
        stubs: {
          IonBackButton: true
        }
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the component', () => {
    const wrapper = mountComponent();
    expect(wrapper.exists()).toBe(true);
  });

  it('should render IonPage component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonPage).exists()).toBe(true);
  });

  it('should render the title "Perfil"', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Perfil');
  });

  it('should render ThemeToggle component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(ThemeToggle).exists()).toBe(true);
  });

  it('should display user name', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('José Castro');
  });

  it('should display cedula label and value', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Cédula');
    expect(wrapper.text()).toContain('1-1234-5678');
  });

  it('should display correo label and value', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Correo');
    expect(wrapper.text()).toContain('jose_castro@gmail.com');
  });

  it('should have an Agencia item', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Agencia');
  });

  it('should have a vehicle section with title', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Vehículo');
  });

  it('should have a vehicle select component', () => {
    const wrapper = mountComponent();
    const select = wrapper.findComponent(IonSelect);
    expect(select.exists()).toBe(true);
  });

  it('should have available vehicles', () => {
    const wrapper = mountComponent();
    expect(wrapper.vm.vehiculos).toEqual(['SJB1234', 'ABC9876', 'XYZ1122']);
  });

  it('should have "Confirmar Cambios" button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Confirmar Cambios');
  });

  it('should have "Editar Perfil" button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Editar Perfil');
  });

  it('should have "Cerrar Sesión" button', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Cerrar Sesión');
  });

  it('should render IonBackButton', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonBackButton).exists()).toBe(true);
  });

  it('should have back button with default href to /tabs/tab1', () => {
    const wrapper = mountComponent();
    const backButton = wrapper.findComponent(IonBackButton);
    expect(backButton.attributes('default-href')).toBe('/tabs/tab1');
  });

  it('should render modal component', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonModal).exists()).toBe(true);
  });

  it('should open edit modal when "Editar Perfil" is clicked', async () => {
    const wrapper = mountComponent();
    
    expect(wrapper.vm.isEditOpen).toBe(false);
    
    wrapper.vm.openEditarPerfil();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.isEditOpen).toBe(true);
  });

  it('should sync data to modal when opening edit', async () => {
    const wrapper = mountComponent();
    
    wrapper.vm.openEditarPerfil();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.editNombre).toBe('José Castro');
    expect(wrapper.vm.editCedula).toBe('1-1234-5678');
    expect(wrapper.vm.editCorreo).toBe('jose_castro@gmail.com');
  });

  it('should save edited profile data', async () => {
    const wrapper = mountComponent();
    
    // Open modal
    wrapper.vm.openEditarPerfil();
    await wrapper.vm.$nextTick();
    
    // Change data
    wrapper.vm.editNombre = 'New Name';
    wrapper.vm.editCedula = '2-2222-2222';
    wrapper.vm.editCorreo = 'new@email.com';
    
    // Save
    wrapper.vm.guardarEdicion();
    await wrapper.vm.$nextTick();
    
    expect(wrapper.vm.nombre).toBe('New Name');
    expect(wrapper.vm.cedula).toBe('2-2222-2222');
    expect(wrapper.vm.correo).toBe('new@email.com');
    expect(wrapper.vm.isEditOpen).toBe(false);
  });

  it('should cancel edit and close modal', async () => {
    const wrapper = mountComponent();
    
    // Open modal
    wrapper.vm.openEditarPerfil();
    await wrapper.vm.$nextTick();
    
    // Change data
    wrapper.vm.editNombre = 'Changed';
    
    // Cancel
    wrapper.vm.cancelarEdicion();
    await wrapper.vm.$nextTick();
    
    // Original data should remain unchanged
    expect(wrapper.vm.nombre).toBe('José Castro');
    expect(wrapper.vm.isEditOpen).toBe(false);
  });

  it('should have modal with correct title', () => {
    const wrapper = mountComponent();
    expect(wrapper.text()).toContain('Editar Perfil');
  });

  it('should call console.log when confirmarCambios is executed', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const wrapper = mountComponent();
    
    wrapper.vm.vehiculoSeleccionado = 'SJB1234';
    wrapper.vm.confirmarCambios();
    
    expect(consoleSpy).toHaveBeenCalledWith('Confirm changes:', 'SJB1234');
    consoleSpy.mockRestore();
  });

  it('should call console.log when cerrarSesion is executed', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const wrapper = mountComponent();
    
    wrapper.vm.cerrarSesion();
    
    expect(consoleSpy).toHaveBeenCalledWith('Log out');
    consoleSpy.mockRestore();
  });

  it('should call console.log when irAAgencia is executed', () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const wrapper = mountComponent();
    
    wrapper.vm.irAAgencia();
    
    expect(consoleSpy).toHaveBeenCalledWith('Go to agency selection');
    consoleSpy.mockRestore();
  });

  it('should have modal component for editing profile', () => {
    const wrapper = mountComponent();
    const modal = wrapper.findComponent(IonModal);
    expect(modal.exists()).toBe(true);
  });

  it('should initialize vehiculoSeleccionado as empty string', () => {
    const wrapper = mountComponent();
    expect(wrapper.vm.vehiculoSeleccionado).toBe('');
  });

  it('should have a grid with user information', () => {
    const wrapper = mountComponent();
    expect(wrapper.findComponent(IonGrid).exists()).toBe(true);
    expect(wrapper.findAllComponents(IonRow).length).toBeGreaterThan(0);
    expect(wrapper.findAllComponents(IonCol).length).toBeGreaterThan(0);
  });
});
