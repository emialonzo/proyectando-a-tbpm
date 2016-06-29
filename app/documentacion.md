# Informe Proyecto de grado

## Introducción
El objetivo del proyecto era generar prototipos evolituvos pero se estamos lejos muy lejos del objetivo.

## Estado del arte y temas relacionados
QUe puntos manejar de los trabajos exitentes? Que ideas utilizamos? Que enfoques buscamos?
- QUe es BPMN?

## Problema
- Transformar texto en BPMN,
- requerimientos.
  - generar version funcional activiti
  -

## Solucion

### Lenguaje
Donde está el límite de uno y empieza el otro?
- La lenguaje/gramática: xq se eligió esta gramática y como la utilizamos (podría ser un capítulo)(podríamos poner ejemplos particulares de las construcciones)
- fragmento texto -> xml -> generacióñ gráfica

### --Diseño/Implementación-- Desarrollo
- El modelo intermedio: su estructura y limitaciones. distancia con BPMN y posibles correcciones
- Las transformaciones al modelo: Una serie de transforamciones aplicadas al modelo para acercar al modelo BPMN, ids => balances => flujo => correcciones flujo.
- El pasaje a bpmn:
  - Estructura de BPMN en formato json según librería x2js
  - El pasaje de modelo intermedio a json
#### Evaluacion alternativas (discusión de como llegamos a estas herramientas)
- MakeDot: Para corrección de flujo se obtiene a partir del XML el despliegue de las actividades. (Graphviz)
- Yaoqiang y modeler:
  - yaoqiang como módulo, su utilizacion como un módulo externo.
  - Moldeler bpmn.io


##Pruebas
- Que pruebas realizamos, que estábamos probando. Frederich.

##Caso de estudio
- El ojetivo de juntar todo. Proponer paso a paso. Presentar el caso de estudio.
- Ir al detalle, desde el texto hasta la ejecución en activiti.

##Herramienta desarrollada
- Capturas

## Conclusiones  y Trabajos a futuro
Mencionar y resaltar: Lo que se pedíá, a lo que se llegó. Cosas que agregamos por "nuestra cuenta".
Limitaciones: cosas que dejaron colgadas y no se resuelven de la mejora manera. Ej: no poder dibjar los lanes.
Modelo intermedio anidado, complica la extensibilidad.

Generar un asistente para la gramática: autocompletado y resaltado de alcance de construcciones.
Proceso inverso, generar código a partir de BPMN
