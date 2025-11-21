# Mapa del sitio

## Objetivos principales

1. Dispositivo de localización para rastreo y telemetría (_gateway_) de vehículos
1. Aplicación operativa (mensajería, reportes, alertas, comunicación interna)

## Canales y protocolos de comunicación

- Wi-Fi
- Bluetooth
- Red celular

- HTTP (REST/GraphQL API): eventos esporádicos (inicio de un viaje, una alerta, etc.)
- TCP (MQTT): actualizaciones de alta frecuencia (rastreo y telemetría)

- Intermediador: tcp://mqtt.simovi.org:1883 (tcp://mqtt.databus.ucr.ac.cr:1883)

La aplicación es dos cosas:

- Aplicación móvil (interfaz con conexión a API)
- Cliente MQTT (_publisher_)

```mermaid
flowchart TD
    S[splash]
    L[login]
    subgraph tabs
      H([home])
      T([trips])
      M([messages])
    end
    subgraph home
      subgraph home-index
        HF[front page]
        P[\profile/]
        G[\settings/]
      end
      GC[[settings config]]
      PC[[profile config]]
    end
    subgraph trips
      subgraph trips-segments
        subgraph trips-index
          TF[front page]
          ST[\start trip/]
          ET[\end trip/]
          TA[\create alert/]
        end
        subgraph trips-history
          TH[trips history]
          THD[/trip details/]
        end
      end
      TC[[trip config]]
      EC[[end trip config]]
      TAC[[trip alert config]]
    end
    subgraph messages
      subgraph messages-segments
        MM[messages]
        MA[alerts]
        MMD[/message details/]
        MAD[/alert details/]
      end
    end

    S --> L
    L --> tabs
    H --> home
    T --> trips
    M --> messages

    P --> PC
    G --> GC

    ST --> TC
    ET --> EC
    TA --> TAC
    TH --> THD

    MM --> MMD
    MA --> MAD
```

- `Splash`: logo, versión, etc.
- `Login`: credenciales (usuario, contraseña, recuperar contraseña)
- `Home`: bitácora de viajes realizados, tipo "front-page" con los últimos viajes, las últimas alertas, los últimos mensajes (cuando dice "Ver más")
- `Trip`:
  - Sin un viaje en progreso: información general, botón de iniciar viaje (`Trip Config`), botón de alertas (`Trip Alerts`)
  - Con un viaje en progreso: datos del viaje, botón de alertas (`Trip Alerts`), botón de finalizar viaje (`End Trip`)
- `Messages`: chat, anuncios, mensajería operativa en general
- `Profile`: perfil
- `Settings`: ajustes de la aplicación

## "Reglas" de uso

- Cada espacio de edición es un modal (demanda edición y guardar y cancelar)
- Tabs y segments son para visualización

## Simbología

Gerardo, favor colocar links a los componentes de Ion:

```mermaid
flowchart TD
    S[Pantalla]
```

```mermaid
flowchart TD
    S([Pestaña del menú inferior])
```

```mermaid
flowchart TD
    S[[Modal]]
```

```mermaid
flowchart TD
    S[\Botón/]
```

```mermaid
flowchart TD
    S[/Página/]
```

## Especificaciones

Elementos de entrada/salida a utilizar: [Ionic Framework](https://ionicframework.com/docs/api/input "Lista de elementos de interfaz que posee Ionic")

- Ingreso `login`
  - [Entrada de Texto](https://ionicframework.com/docs/api/input): ID de usuario.
  - [Entrada de Texto](https://ionicframework.com/docs/api/input): Contraseña.
  - [Botón](https://ionicframework.com/docs/api/button): Enlace para recuperar la contraseña.
- Inicio `home`
  - [Lista](https://ionicframework.com/docs/api/infinite-scroll): Historial de viajes realizados.
    - [Calendario](https://ionicframework.com/docs/api/datetime): Calendario que permita filtrar el historial de viajes por un rango de fechas.
    - [Barra de Búsqueda](https://ionicframework.com/docs/api/searchbar): Entrada de texto que permita filtrar el historial de viajes por parámetros textuales.
    - [Modal](https://ionicframework.com/docs/api/modal): Modal que despliegue los detalles del viaje seleccionado.
    - [Texto](https://ionicframework.com/docs/api/content): Detalles textuales, específicos del viaje seleccionado.
  - [Barra de Navegación](https://ionicframework.com/docs/api/tabs):
    - Perfil `profile`
      - [Botón](https://ionicframework.com/docs/api/button): Botón de navegación para la vista de Perfil de Usuario.
        - [Modal](https://ionicframework.com/docs/api/modal): Modal que despliega la ventana de Perfil de Usuario.
          - [Texto](https://ionicframework.com/docs/api/content): Datos textuales del Usuario.
          - [Avatar](https://ionicframework.com/docs/api/avatar): Foto/Avatar del Usuario.
    - Viajes `trips`
      - [Botón](https://ionicframework.com/docs/api/button): Botón de navegación para la vista de Viajes.
        - [Modal](https://ionicframework.com/docs/api/modal)
          - [Entradas de Texto](https://ionicframework.com/docs/api/input): Entradas de texto para ingresar los distintos parámetros necesarios para configurar y dar inicio a un nuevo viaje.
          - [Lista](https://ionicframework.com/docs/api/menu): Lista que despliega las rutas disponibles que puede seleccionar el usuario.
          - [Botón](https://ionicframework.com/docs/api/button): Botón de confirmación para comenzar un nuevo viaje.
        - [Modal (alternativo)](https://ionicframework.com/docs/api/modal): En caso de existir un viaje actualmente en progreso.
          - [Texto](https://ionicframework.com/docs/api/content): Detalles textuales del viaje en progreso.
          - [Botón](https://ionicframework.com/docs/api/button): Botón para crear alertas sobre el viaje en progreso.
          - [Botón](https://ionicframework.com/docs/api/button): Botón para finalizar viaje.
    - Mensajes ``
      - [Botón](https://ionicframework.com/docs/api/button): Botón de navegación para la vista de Mensajes.
        - [Notificación](https://ionicframework.com/docs/api/badge): Valor numérico en el botón que indica la presencia de notificaciones pendientes.
        - [Modal](https://ionicframework.com/docs/api/modal)
          - [Lista](https://ionicframework.com/docs/api/infinite-scroll): Lista de notificaciones/mensajes recientes.
