import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Databús app",
  description: "Aplicación operativa de transporte público con Databús",
  cleanUrls: true,
  base: "/databus-app/",

  head: [
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined",
      },
    ],
  ],

  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: "/db.png",
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
          { text: "Tecnologías", link: "/desarrollo/tecnologias" },
          { text: "Databús API", link: "/desarrollo/databus-api/" },
          { text: "Databús Admin", link: "/desarrollo/databus-admin/" },
          { text: "Databús MCP", link: "/desarrollo/databus-mcp/" },
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
            text: "Vistas",
            collapsed: true,
            items: [
              { text: "Splash", link: "/desarrollo/vistas/Splash" },
              { text: "Home", link: "/desarrollo/vistas/Home" },
              { text: "Login", link: "/desarrollo/vistas/Login" },
              { text: "Profile", link: "/desarrollo/vistas/Profile" },
              { text: "Run", link: "/desarrollo/vistas/Run" },
              { text: "Alerts", link: "/desarrollo/vistas/Alerts" },
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
      { icon: "github", link: "https://github.com/simovilab/databus-app" },
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
