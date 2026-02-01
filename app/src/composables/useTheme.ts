import { ref, watch } from 'vue';

const THEME_KEY = 'databus-theme';

// Función para aplicar el tema
const applyTheme = (dark: boolean) => {
  document.body.classList.toggle('dark', dark);
  document.documentElement.classList.toggle('dark', dark);
  document.body.classList.toggle('ion-palette-dark', dark);
};

// Estado reactivo global del tema
const isDark = ref<boolean>(
  localStorage.getItem(THEME_KEY) === 'dark'
);

// Aplicar tema inicial
applyTheme(isDark.value);

// Observar cambios en el tema
watch(isDark, (newValue) => {
  applyTheme(newValue);
  localStorage.setItem(THEME_KEY, newValue ? 'dark' : 'light');
});

export function useTheme() {
  const toggleTheme = () => {
    isDark.value = !isDark.value;
  };

  return {
    isDark,
    toggleTheme
  };
}
