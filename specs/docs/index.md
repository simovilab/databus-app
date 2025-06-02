---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "Databús app"
  text: "Aplicación móvil para rastreo y telemetría de autobuses"
  tagline: Especificación de las funcionalidades y características para el desarrollo de la aplicación.
  image:
    src: /db.png
    alt: Logo Databús
  actions:
    - theme: brand
      text: Sobre el proyecto
      link: /proyecto/
    - theme: alt
      text: Mapa del sitio
      link: /diseno/sitio/

features:
  - title: Proyecto
    icon: <span class="material-symbols-outlined">assignment</span>
    details: Información general sobre el proyecto Infobús
    link: /proyecto/
  - title: Diseño
    icon: <span class="material-symbols-outlined">draw</span>
    details: Consideraciones para el diseño del sitio web
    link: /diseno/
  - title: Desarrollo
    icon: <span class="material-symbols-outlined">rocket_launch</span>
    details: Lineamientos para el desarrollo del sitio web
    link: /desarrollo/
---

&nbsp;

<div style="
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 32px;
  align-items: center;
">
  <img src="/simovi.png" alt="SIMOVI" style="width:100%; max-width:400px;" />
  <img src="/tropicalizacion.png" alt="Tropicalización de la tecnología" style="width:100%; max-width:250px;" />
</div>
