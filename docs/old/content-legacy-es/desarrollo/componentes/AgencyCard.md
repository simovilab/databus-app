# `AgencyCard`

Información de una agencia de transporte público.

### Referencias

- GTFS: `agency.txt` (documentación [agency](https://gtfs.org/documentation/schedule/reference/#agencytxt)).
- OTDS: no tiene.
- Infobús API: [/agencies](https://infobus.bucr.digital/api/agencies/).
- Infobús Admin: no tiene.

## 1. Componente

- Nombre: `AgencyCard`
- Archivo ([SFC](https://vuejs.org/guide/scaling-up/sfc)): `components/AgencyCard.vue`

## 2. Descripción

Desplegar información de una agencia de transporte público (empresa de autobuses, por ejemplo) en un arreglo de tarjetas (_cards_).

## 3. Propiedades (_props_)

Todas los campos (_fields_) de la tabla `agency.txt` de GTFS.

| Nombre            | Tipo   | Requerido | Valor por defecto | Descripción               |
| ----------------- | ------ | --------- | ----------------- | ------------------------- |
| `agency_id`       | String | Sí        | -                 | Descripción de la prop    |
| `agency_name`     | String | Sí        | -                 | Si se permite editar o no |
| `agency_url`      | String | Sí        | -                 | Descripción de la prop    |
| `agency_timezone` | String | No        | -                 | Descripción de la prop    |
| `agency_lang`     | String | No        | -                 | Descripción de la prop    |
| `agency_phone`    | String | No        | -                 | Descripción de la prop    |
| `agency_fare_url` | String | No        | -                 | Descripción de la prop    |
| `agency_email`    | String | No        | -                 | Descripción de la prop    |

## 4. Fuentes de datos

### Infobús API

- **Endpoint(s):** `GET /agencies/:id`
- **Momento de llamada:** Al montar el componente (`onMounted`)
- **Estructura esperada de respuesta:**

```json
{
  "url": "https://infobus.bucr.digital/api/agencies/1/",
  "feed": "1",
  "agency_id": "bUCR",
  "agency_name": "Buses de la Universidad de Costa Rica",
  "agency_url": "https://bus.ucr.ac.cr/",
  "agency_timezone": "America/Costa_Rica",
  "agency_lang": "es",
  "agency_phone": "25112919",
  "agency_fare_url": "https://bus.ucr.ac.cr/#tarifas",
  "agency_email": "bus@ucr.ac.cr"
}
```

- ¿Usa Vuex / Pinia / llamada directa a la API?: Directa a la API.

### Infobús Admin API

No utiliza.

## 5. Estructura visual (_template_)

PrimeVue

- [Card](https://primevue.org/card/)

## 6. Eventos emitidos

No tiene.

## 7. Plazas (_slots_)

No tiene.

## 8. Dependencias internas

No tiene.

## 9. Estado interno y propiedades reactivas

- Variables internas (`data`): no tiene.
- Propiedades computadas (`computed`): no tiene.
- Observadores (`watch`) relevantes: no tiene.

## 10. Comportamiento y lógica

- Lógica interactiva del componente: no tiene.
- Reglas condicionales de renderizado: no tiene.

## 11. Accesibilidad y responsividad

- Comportamiento esperado en pantallas pequeñas, medianas y grandes
- Accesibilidad (navegación por teclado, ARIA roles, etc.)

## 12. Pruebas

- Escenarios que se deben cubrir con pruebas unitarias o de integración
- Mock de datos esperados

## Ejemplo de implementación

### Resultado

```html
<script setup>
  import { ref } from "vue";
  import AgencyCard from "../../.vitepress/components/AgencyCard.vue";

  const id = ref("ABC");
  const name = ref("Agencia de Transporte Público");
  const url = ref("https://www.agencia-transporte.com");
  const phone = ref("123-456-7890");
  const fareUrl = ref("https://www.agencia-transporte.com/tarifas");
  const email = ref("info@agencia-transporte.com");
</script>

<AgencyCard
  :agency_id="id"
  :agency_name="name"
  :agency_url="url"
  :agency_phone="phone"
  :agency_fare_url="fareUrl"
/>
```

<script setup>
  import { ref } from "vue";
  import AgencyCard from "../../.vitepress/components/AgencyCard.vue";

  const id = ref("ABC");
  const name = ref("Agencia de Transporte Público");
  const url = ref("https://www.agencia-transporte.com");
  const phone = ref("123-456-7890");
  const fareUrl = ref("https://www.agencia-transporte.com/tarifas");
  const email = ref("info@agencia-transporte.com");
</script>

---

<AgencyCard
  :agency_id="id"
  :agency_name="name"
  :agency_url="url"
  :agency_phone="phone"
  :agency_fare_url="fareUrl"
/>

---

### Código fuente

<<< @/.vitepress/components/AgencyCard.vue
