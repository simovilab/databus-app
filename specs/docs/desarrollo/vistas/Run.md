# Carreras

| Item     | Descripción                                                    |
| -------- | -------------------------------------------------------------- |
| Nombre   | `Run`                                                          |
| Ruta     | `/run`                                                         |
| Posición | `1`                                                            |
| Ícono    | <span class="material-symbols-outlined">departure_board</span> |

`if` no hay un viaje en progreso:

Si no está configurada la carrera:

- `RunSetup`: Abre un modal para elegir ruta, recorrido y tipo de viaje.

Si está configurada la carrera:

- Muestra los datos de la carrera configurada.
- Muestra un botón para cambiar la configuración de la carrera.
- Muestra un gran botón verde para iniciar el viaje.

`else if` hay un viaje en progreso:

- `RunInfo`: Muestra información del viaje en progreso.

`else`

Algo

## Anatomía

## Componentes

## Datos

## Comportamiento
