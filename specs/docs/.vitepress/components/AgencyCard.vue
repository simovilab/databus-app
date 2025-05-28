<!-- Datos GTFS: agency.txt -->
<template>
  <h3>{{ agency_name }}</h3>
  <strong>{{ agency_id }}</strong> <br />
  <i>{{ agency_url || "Sin información" }}</i>
  <ul>
    <li>Teléfono: {{ agency_phone || "Sin información" }}</li>
    <li>Tarifas: {{ agency_fare_url || "Sin información" }}</li>
    <li>Correo electrónico: {{ agency_email || "Sin información" }}</li>
    <li>Zona horaria: {{ agency_timezone || "Sin información" }}</li>
    <li>Idioma: {{ agency_lang || "Sin información" }}</li>
  </ul>
  <a href="#">Ver rutas</a>
</template>

<script setup>
import { ref } from "vue";

const props = defineProps({
  agency_id: {
    type: String,
    required: true,
  },
  agency_name: {
    type: String,
    required: true,
  },
  agency_url: {
    type: String,
    required: false,
  },
  agency_phone: {
    type: String,
    required: false,
  },
  agency_fare_url: {
    type: String,
    required: false,
  },
  agency_email: {
    type: String,
    required: false,
  },
  agency_timezone: {
    type: String,
    required: false,
  },
  agency_lang: {
    type: String,
    required: false,
  },
});
</script>
