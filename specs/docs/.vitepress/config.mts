import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Infobús web",
  description: "Página web del transporte público de Infobús",
  cleanUrls: true,
  base: "/infobus-web/",

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: "Inicio", link: "/" },
      { text: "Proyecto", link: "/proyecto/" },
      { text: "Diseño", link: "/diseno/" },
      { text: "Desarrollo", link: "/desarrollo/" },
    ],

    sidebar: [
      {
        text: "Proyecto",
        items: [
          { text: "Acerca", link: "/proyecto/" },
          { text: "Glosario", link: "/proyecto/glosario/" },
        ],
      },
      {
        text: "Diseño",
        items: [
          { text: "Principios", link: "/diseno/" },
          { text: "Arquitectura", link: "/diseno/arquitectura/" },
          { text: "Mapa del sitio", link: "/diseno/sitio/" },
          { text: "Lenguaje de diseño", link: "/diseno/lenguaje/" },
          { text: "Interfaz del usuario", link: "/diseno/interfaz/" },
          { text: "Experiencia del usuario", link: "/diseno/experiencia/" },
          { text: "Inteligencia artificial", link: "/diseno/ia/" },
          { text: "Panel de administración", link: "/diseno/admin/" },
        ],
      },
      {
        text: "Desarrollo",
        items: [
          { text: "Lineamientos", link: "/desarrollo/" },
          { text: "Infobús API", link: "/desarrollo/infobus-api/" },
          { text: "Infobús Admin", link: "/desarrollo/infobus-admin/" },
          { text: "Infobús MCP", link: "/desarrollo/infobus-mcp/" },
          { text: "Configuración", link: "/desarrollo/configuracion/" },
          { text: "Implementación", link: "/desarrollo/implementacion/" },
          {
            text: "Componentes",
            collapsed: true,
            items: [
              { text: "Descripción", link: "/desarrollo/componentes/" },
              { text: "ShapeMap", link: "/desarrollo/componentes/" },
              { text: "RealTimeMap", link: "/desarrollo/componentes/" },
              { text: "RouteCard", link: "/desarrollo/componentes/" },
              {
                text: "AgencyCard",
                link: "/desarrollo/componentes/AgencyCard",
              },
              { text: "Chat", link: "/desarrollo/componentes/" },
              { text: "NextTrips", link: "/desarrollo/componentes/" },
              { text: "RouteStops", link: "/desarrollo/componentes/" },
              { text: "Alert", link: "/desarrollo/componentes/" },
              { text: "ScheduleTable", link: "/desarrollo/componentes/" },
              { text: "TripPlanner", link: "/desarrollo/componentes/" },
              { text: "FareCard", link: "/desarrollo/componentes/" },
              { text: "FeedbackForm", link: "/desarrollo/componentes/" },
            ],
          },
          {
            text: "Módulos",
            collapsed: true,
            items: [
              { text: "Descripción", link: "/desarrollo/modulos/" },
              {
                text: "Nuxt Infobús",
                link: "/desarrollo/modulos/nuxt-infobus/",
              },
            ],
          },
          { text: "Pruebas", link: "/desarrollo/pruebas/" },
          { text: "Guía de estilo", link: "/desarrollo/estilo/" },
        ],
      },
    ],

    socialLinks: [
      { icon: "github", link: "https://github.com/simovilab/infobus-web" },
    ],

    outlineTitle: "En esta página",
    lastUpdatedText: "Última actualización",
    darkModeSwitchLabel: "Apariencia",
    lightModeSwitchTitle: "Cambiar a modo claro",
    darkModeSwitchTitle: "Cambiar a modo oscuro",
    returnToTopLabel: "Volver arriba",
    docFooter: {
      prev: "Página anterior",
      next: "Página siguiente",
    },
    search: {
      placeholder: "Buscar",
    },
  },
});
