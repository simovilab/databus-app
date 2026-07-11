import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent } from 'vue';
import { flushPromises, mount } from '@vue/test-utils';

import LoginPage from '@/views/LoginPage.vue';
import { ApiError } from '@/services/apiClient';

// --- Mocks for the auth store and router (LoginPage must not call fetch or
// the real Ionic router). The login fn is a per-test vi.fn so assertions can
// vary its behavior. ---
const loginMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    login: loginMock,
    logout: vi.fn(),
    loadFromStorage: vi.fn(),
    session: null,
    isAuthenticated: false,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));

// --- Minimal stubs for Ionic web components so jsdom can mount the form and
// we can drive v-model + blur + submit on real DOM elements. ---
const IonInputStub = defineComponent({
  name: 'IonInput',
  props: {
    modelValue: { type: String, default: '' },
    label: String,
    type: String,
    errorText: String,
    helperText: String,
  },
  emits: ['update:modelValue', 'ion-blur'],
  template:
    '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" @blur="$emit(\'ion-blur\')" />',
});

const IonButtonStub = defineComponent({
  name: 'IonButton',
  props: {
    type: { type: String, default: 'button' },
    disabled: Boolean,
  },
  template: '<button :type="type" :disabled="disabled"><slot /></button>',
});

const AppErrorStub = defineComponent({
  name: 'AppError',
  props: { error: { default: null }, fallbackMessage: String },
  template:
    '<div class="app-error-stub">{{ typeof error === "string" ? error : (error && error.message) || fallbackMessage }}</div>',
});

const stubs = {
  IonPage: { template: '<div><slot /></div>' },
  IonContent: { template: '<div><slot /></div>' },
  IonInput: IonInputStub,
  IonButton: IonButtonStub,
  IonSpinner: { template: '<span />' },
  AppError: AppErrorStub,
};

function mountLogin() {
  return mount(LoginPage, { global: { stubs } });
}

/** Sets both fields via the IonInput stubs (index 0 = username, 1 = password). */
function setFieldValues(wrapper: ReturnType<typeof mountLogin>, username: string, password: string) {
  const inputs = wrapper.findAllComponents(IonInputStub);
  inputs[0].vm.$emit('update:modelValue', username);
  inputs[1].vm.$emit('update:modelValue', password);
}

describe('LoginPage', () => {
  beforeEach(() => {
    loginMock.mockReset();
    replaceMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the username and password fields', () => {
    const wrapper = mountLogin();
    const inputs = wrapper.findAllComponents(IonInputStub);
    expect(inputs).toHaveLength(2);
    expect(inputs[0].props('label')).toBe('Usuario');
    expect(inputs[1].props('type')).toBe('password');
  });

  it('marks empty fields invalid and does not call login on an empty submit', async () => {
    const wrapper = mountLogin();

    await wrapper.find('form').trigger('submit');

    const inputs = wrapper.findAllComponents(IonInputStub);
    expect(inputs[0].classes()).toContain('ion-invalid');
    expect(inputs[0].classes()).toContain('ion-touched');
    expect(inputs[1].classes()).toContain('ion-invalid');
    expect(loginMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('logs in and routes to /tabs/home on success', async () => {
    loginMock.mockResolvedValueOnce(undefined);
    const wrapper = mountLogin();

    setFieldValues(wrapper, 'ada', 'secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith('ada', 'secret');
    expect(replaceMock).toHaveBeenCalledWith('/tabs/home');
    expect(wrapper.find('.app-error-stub').exists()).toBe(false);
  });

  it('shows a friendly message and stays on page when login fails with 400', async () => {
    const apiError = new ApiError(
      400,
      { detail: 'Usuario o contraseña incorrectos' },
      undefined,
      'API request failed with status 400'
    );
    loginMock.mockRejectedValueOnce(apiError);
    const wrapper = mountLogin();

    setFieldValues(wrapper, 'ada', 'wrong');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(loginMock).toHaveBeenCalledWith('ada', 'wrong');
    expect(replaceMock).not.toHaveBeenCalled();
    const errorEl = wrapper.find('.app-error-stub');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toContain('Usuario o contraseña incorrectos');
  });

  it('shows a network message and stays on page when login fails with status 0', async () => {
    loginMock.mockRejectedValueOnce(new ApiError(0, { detail: 'Network request failed' }));
    const wrapper = mountLogin();

    setFieldValues(wrapper, 'ada', 'secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(replaceMock).not.toHaveBeenCalled();
    expect(wrapper.find('.app-error-stub').text()).toMatch(/sin conexión|red/i);
  });

  it('disables the submit button while a login is pending', async () => {
    let resolveLogin: () => void = () => {};
    loginMock.mockReturnValueOnce(
      new Promise<void>((resolve) => {
        resolveLogin = resolve;
      })
    );
    const wrapper = mountLogin();

    setFieldValues(wrapper, 'ada', 'secret');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    const submitButton = wrapper.find('button[type="submit"]');
    expect(submitButton.attributes('disabled')).toBeDefined();

    resolveLogin();
    await flushPromises();

    expect(submitButton.attributes('disabled')).toBeUndefined();
    expect(replaceMock).toHaveBeenCalledWith('/tabs/home');
  });
});
