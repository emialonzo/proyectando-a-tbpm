# Agregar elementos
A continuacion se indican los pasos a seguir para extender el trabajo realizado.

### Procesamiento textual
La gramatica es la encargada de generar el modelo abstracto a partir del texto,
por lo que en un principio es necesario modificarla de forma que se pueda generar
la informacion que sea necesaria. Para esto se deben agregar las construcciones
correspondientes al elemento nuevo en `gramatica.pegjs`.
Es necesario estudiar que tipo de elemento se quiere agregar de forma de poder
decidir la forma en que se va a definir la construccion del mismo.
Las construcciones basicas de la gramatica permiten construir los siguientes elementos:
1. tareas
  * de usuario
  * de servicio
  * subproceso
2. eventos intermedios
  * timer
  * mensaje
3. eventos adjuntos
  * timer
4. compuerta AND
5. compuerta XOR
6. loops

### Procesamiento del modelo abstracto
Del procesamiento del modelo abstracto se obtiene el modelo intermedio,
en el cual tenemos informacion sobre el flujo, los identificadores de los elementos,
e informacion extra necesaria para luego poder construir el elemento BPMN.
En caso de ser necesario agregar informacion extra, se deben implementar
las funciones necesarias en `modeloIntermedio.js`. (chequear la implementacion de la funcion *procesarModelo*)

### Procesamieno del modelo intermedio
Como etapa final del procesamiento, a partir del modelo intermedio se obtiene el modelo bpmn.
La implementacion de este procesamiento se encuentra en `procesamientoModelo.js`.
En este procesamieno se generan los diferentes modelos bpmn (basico, ejecutable
y estandar) que se describen en ALGUN LADO. (chequear la implementacion en las funciones
`modelToXML`, `modelToXMLactiviti`)

### Observaciones
Para poder extender el trabajo es necesario tener ciertos conocimientos sobre
las herramientas utilizadas durante el desarrollo del proyecto, las cuales
son comentadas en otra seccion. Tambien es necesario haber leido la documentacion
del proyecto, en particular las secciones donde se describe la implementacion del mismo.
