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
          { text: "Identidad visual", link: "/diseno/lenguaje/" },
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
              { text: "Introducción", link: "/desarrollo/componentes/" },
              { text: "LoginForm", link: "/desarrollo/componentes/LoginForm" },
              {
                text: "AgencyVehicleSelector",
                link: "/desarrollo/componentes/AgencyVehicleSelector",
              },
              { text: "RunSetup", link: "/desarrollo/componentes/RunSetup" },
              { text: "RunInfo", link: "/desarrollo/componentes/RunInfo" },
              {
                text: "AlertSetup",
                link: "/desarrollo/componentes/AlertSetup",
              },
            ],
          },
          {
            text: "Vistas",
            collapsed: true,
            items: [
              { text: "Apertura", link: "/desarrollo/vistas/Splash" },
              { text: "Ingreso", link: "/desarrollo/vistas/Login" },
              { text: "Perfil", link: "/desarrollo/vistas/Profile" },
              { text: "Inicio", link: "/desarrollo/vistas/Home" },
              { text: "Carreras", link: "/desarrollo/vistas/Run" },
              { text: "Alertas", link: "/desarrollo/vistas/Alerts" },
              {
                text: "Notificaciones",
                link: "/desarrollo/vistas/Notifications",
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
