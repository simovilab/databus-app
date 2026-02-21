# Principios de diseño del sitio

## Basado en estándares abiertos

### GTFS

La especificación del suministro de datos abiertos de transporte público (GTFS, _General Transit Feed Specification_) es la referencia más importante puesto que la función primaria de este sistema es proveer datos para sistemas de información para personas usuarias, y GTFS es, precisamente, la especificación _de facto_ para estos datos. GTFS es consumido principalmente por aplicaciones de planificación de viajes multimodales como Google Maps, Moovit, TransitApp y muchas otras.

- Más información: [GTFS](https://gtfs.org/)

### OTDS

### ARC-IT

La referencia de arquitectura de transporte inteligente y colaborativo del Departamento de Transporte de los Estados Unidos (ARC-IT, _Architecture Reference for Cooperative and Intelligent Transportation_) es un modelo exhaustivo de los sistemas tecnológicos del transporte inteligente, desarrollado desde distintas perspectivas. ARC-IT establece objetos, funcionalidades, relaciones, estándares y una gran cantidad de información de referencia. En este proyecto es utilizado para ayudar a establecer los componentes (como servidores y otros dispositivos) y sus flujos de información, conocidos como "tripletas" de fuente, mensaje y destino.

- Más información: [ARC-IT](https://www.arc-it.net/)

### OpenAPI

### MCP

### Smart Data Models

SDM es una iniciativa que sistematiza la _información de contexto_ en varias áreas de relevancia industrial, comercial y académica, como ciudades inteligentes, agricultura de precisión y muchos otros. Smart Data Models utiliza NGSI-LD (_Next Generation Service Interface with Linked Data_), un estándar del Instituto Europeo de Normas de Telecomunicaciones (ETSI, _European Telecommunications Standards Institute_) para proveer datos estructurados de contexto, que define entidades, relaciones y propiedades dentro de un área del conocimiento. Nótese que las definiciones en SDM están basadas en otros estándares comunes, incluyendo el mismo GTFS, por lo que constituye una valiosa fuente de estructuración de la información.

- Más información: [Smart Data Models](https://smartdatamodels.org/)

### Protocolo Común de Alerta

El Protocolo Común de Alerta (CAP, _Common Alerting Protocol_) es una opción recomendada para la especificación de los datos suministrados en sistemas de alertas. Es creado y promovido por la Oficina de las Naciones Unidas para la Reducción del Riesgo de Desastres (UNDRR), avalado por la Unión Internacional de Telecomunicaciones (UIT) y utilizado por la Cruz Roja y otras organizaciones.

- Más información: [Common Alerting Protocol](https://www.undrr.org/early-warnings-for-all/common-alerting-protocol)

**Referencia**

```bibtex
@Conference{abarca2024concentrador,
  author     = {Abarca, Fabián and Segura, David and Vargas, Josué},
  booktitle  = {Revista Ingeniería},
  date       = {2024-10},
  title      = {Concentrador de datos en tiempo real para servicios de información en el transporte público},
  eventtitle = {VI Jornadas de Investigación 2024},
}
```
