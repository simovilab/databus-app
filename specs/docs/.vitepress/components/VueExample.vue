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
