# Componentes Vue

La información del servicio de transporte público en el sitio está clasificada en las siguientes categorías:

- Agencias: Información general, de contacto y medios de atenciónn al cliente
- Rutas: Códigos, nombres, descripción y colores que ayudan a la identificación
- Paradas: Ubicación, infraestructura, facilidades, seguridad y accesibilidad
- Viajes y horarios: Tiempos de salida de cada viaje y de preferencia para cada parada
- Días de operación: Especificación de rangos de operación semanal y estacional y cambios en feriados
- Tarifas: Detalles del precio, métodos de compra y de pago
- Datos geoespaciales y mapas: Mapas de los recorridos de las rutas y ubicación de las paradas
- Tiempo real: Información de ubicación y estado de los vehículos, actualización de tiempos de llegada y alertas en tiempo real

Estructura básica de un componente Vue con el API de composición (`<script setup>`):

## Ejemplo de componente Vue

### Código `VueExample.vue`

```vue
<template>
  <h1>{{ title }}</h1>
  <p>{{ message }}</p>
  <p>
    <strong>{{ stars }}</strong>
  </p>
  <button @click="increment">+1 estrella</button>
  &nbsp;
  <button @click="decrement">-1 estrella</button>
</template>

<script setup>
import { ref } from "vue";

const title = ref("Título");
const message = ref("Texto del componente");
const stars = ref(0);

function increment() {
  stars.value++;
}

function decrement() {
  stars.value--;
}
</script>

<!-- No recomendado (usar estilos globales o librería UI) -->
<style module>
...;
</style>
```

### Resultado

<script setup>
import VueExample from '../../.vitepress/components/VueExample.vue'
</script>

<VueExample />

## Convenciones de nombres y estructura

- SFC (_Single-File Components_): `AgencyCard.vue`, etc.
- _Composition_ API: `const message = ref('Hola Mundo')`, etc.
- Nombres en inglés con UpperCamelCase (PascalCase), por ejemplo: `AgencyCard`, `UserProfile`, etc.
- Archivos en `components/` con extensión `.vue`, por ejemplo: `components/AgencyCard.vue`.
- Uso de _slots_ para contenido dinámico: `<slot name="header"></slot>`, etc.
- Uso de _props_ para pasar datos al componente: `<AgencyCard :title="cardTitle" />`, etc.
- Uso de _emits_ para emitir eventos personalizados: `this.$emit('update', newValue)`, etc.
- Uso de _directives_ para lógica condicional o iterativa: `v-if`, `v-for`, etc.

## Plantillas (_templates_)

- Sintaxis de plantillas en Vue: https://vuejs.org/guide/essentials/template-syntax.html

- Directivas comunes: `v-if`, `v-for`, `v-bind` (`:`), `v-on` (`@`), etc.
