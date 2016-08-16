{
  function collect(obj1, obj2) {
    for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
    return obj1;
  }
  function makeInteger(o) {
      return parseInt(o.join(""), 10);
  }
  function getCampos(obj) {
    try{
      return obj.campos;
    }catch(e){
      return null;
    }
  }
}

start =
  s:secuencia ws
  {return {"proceso":s};}

secuencia =
  sec:(ws sent:elementos {return sent;})+
  {return {"tipo":"secuencia", "sentencia":sec}}

elementos =
  //EVENTOS INTERMEDIOS
  eventoIntermedios:construccion_evento_intermedio
  {return {"tipo":"evento", "sentencia":eventoIntermedios};} /
  //TAREAS
  tareas:construccion_tareas finaliza:finaliza?
  {return {"tipo":"task", "sentencia":tareas, "doc": text(), "finaliza":finaliza?true:false};} /
  //COMPUERTAS AND
  compuertaAND:construccion_compuerta_AND
  {return {"tipo":"and", "sentencia":compuertaAND};} /
  //COMPUERTAS OR
  compuertaOR:construccion_compuerta_OR
  {return {"tipo":"xor", "sentencia":compuertaOR};} /
  //EVENTOS ADJUNTOS
  eventoAdjunto:construccion_evento_adjunto
  {return {"tipo":"adjunto", "evento":eventoAdjunto.evento,
           "adjunto_a":eventoAdjunto.adjunto_a, "sentencia":eventoAdjunto.sentencia,
           "interrumpible":eventoAdjunto.interrumpible, "unica":eventoAdjunto.unica };} /
  //LOOPS
  loop:construccion_loop
  {return {"tipo":"loop", "expresion":loop.expresion , "sentencia":[loop.sentencia]  } }

construccion_evento_intermedio =
  ws actor:actor ws evento_catch ws evento:construccion_evento ws punto
  {return {"evento":evento, "actor":actor}} /
  ws actor:actor ws evento_throw ws pool:palabras ws punto
  {return {"evento":{"tipo":"mensaje", "throw":true, "pool":pool}, "actor":actor, }}

construccion_tareas =
    ws actor:actor ws prefijo_tarea_manual ws accion:accion ws punto
    { return {"actor": actor , "accion" : accion , "task": "manual"};} /
    ws actor:actor ws prefijo_tarea_servicio ws accion:accion ws punto
    { return {"actor": actor , "accion" : accion , "task": "service"};} /
    ws actor:actor ws prefijo_tarea_subproceso ws accion:accion
    loop:(ws puntoYcoma ws loop:subproceso_loop {return loop})? ws punto ws
    { return {"actor": actor , "accion" : accion , "task": "subproceso", "loop":loop}} /
    ws actor:actor ws accion:accion ws punto ws (campos:construccion_formulario?)
    { return {"actor": actor , "accion" : accion , "task": "human", "campos":getCampos(campos)};}

construccion_compuerta_AND =
  ws prefijo_compuerta_AND coma
  ws Integer primero:secuencia
  resto:(ws Integer sen:secuencia {return sen;})+ ws fin
  {return [primero].concat(resto);}

construccion_compuerta_OR =
  ws prefijo_compuerta_OR coma
  ws primero:(con:condicion "entonces" ws sen:secuencia_or
  {return collect({"condicion":con.expresion, "expresion":con.expresion, "doc":con.doc}, sen)})
  resto:(ws con:condicion "entonces" ws sen:secuencia_or
  {return collect({"condicion":con.expresion, "expresion":con.expresion, "doc":con.doc}, sen)})*
  final:(ws defecto ws sen:secuencia_or
  {return collect({"condicion":"defecto"}, sen)})
  ws fin
  {return [primero].concat(resto.concat(final));}

construccion_evento_adjunto =
  ws unica:"unica"?
  ws prefijo_evento_adjunto ws p:palabras ws coma
  ws inte:"se interrumpe"?
  ws auxiliar_evento_adjunto ws evento:construccion_evento
  ws sec:secuencia ws fin
  {return {"adjunto_a":p, "evento":evento, "sentencia":[sec],
           "interrumpible":inte?true:false, "unica":unica?true:false}}

construccion_loop =
  ws prefijo_loop ws con:condicion coma sent:secuencia ws fin
  {return {"condicion":con.expresion, "expresion":con.expresion, "doc":con.doc, "sentencia":sent}}

// AUXILIARES
// Caracteres de separacion, finalizacion y en blanco.
ws = [ \t\n\r]*
coma = ","
punto = "."
puntoYcoma = ";"

// Indica si el flujo debe terminar.
finaliza = "y finaliza"

// Indica el nombre del actor (nombre del Lane)
actor =
  articulo ws nombre:(n:[a-z ]i+ ws {return n.join("")}) "," ws {return nombre} /
  articulo ws nombre:[a-z]i+ { return nombre.join("")}

// Articulos
articulo = "el" / "la" / "los" / "las" / "del" / "de"
//articulo_evento = "del" / "de"

// Indica el fin de una construccion
fin = "fin"

// Numeros
Integer "integer" = [0-9]+ { return parseInt(text(), 10); }
digito "digito" = digits:[0-9]+ { return makeInteger(digits); }

// Una o varias palabras
palabra "palabra" = [a-z]i+ { return text()}
palabras "palabras" = ([a-z]i+ ws?)+ { return text()}

// Construccion para las sentencias de las compuertas OR
secuencia_or = "no hace nada" {  return {"tipo":"secuencia", "sentencia":[]}} / secuencia

// Accion a realizar o nombre de la tarea
accion = ([a-z_]i+ ws)* { return text()}

// Se utiliza para generar los formularios de las tareas de usuario
construccion_formulario =
  tarea:(palabras coma/ palabra) ws formulario_id ws palabras ws ":" ws listaCampos:formulario punto ws
  {return {"tarea":tarea, "campos":listaCampos}} /
  tarea:(palabras coma/ palabra) ws ver_form_id ws palabras ws ":" ws listaCampos:formulario_solo_lectura punto ws
  {return {"tarea":tarea, "campos":listaCampos}}

// Se utiliza para obtener la informacion de un evento
construccion_evento =
  d:digito ws unidad:tiempo
  {return "tiempo", {"tipo":"timer","tiempo":d, "unidad":unidad, "throw":false};} /
	mensaje ws articulo ws p:palabras
  {return {"tipo":"mensaje","evento":"mensaje", "mensaje":p, "pool":p, "throw":false};}

// Se utiliza para construir una condicion
condicion = exp:ex {return {expresion:exp, doc:text() }}

// Se utiliza para construir la expresion de una condicion
ex = t1:termino resto:(o:operador t2:termino {return [o,t2].join("")})? {return t1 + (resto?resto:"")}

// Se utiliza para construir un termino de una expresion
termino = ws term:[a-zA-Z0-9"]+ ws {return term.join("").replace("\\", "")}

// genera un formulario
formulario = campo+
campo = ws nombre:palabra ws "que es un" "a"? ws tipo:tipo ws ob:"obligatorio"? ws coma? ws {return {"nombre":nombre, "tipo":tipo, "obligatorio":ob?true:false, "writable":true}}

// genera un formulario de solo lectura
formulario_solo_lectura = campo_solo_lectura+
campo_solo_lectura = ws nombre:palabra ws coma? ws {return {"nombre":nombre, "tipo":"texto", "obligatorio":true, "writable":false}}

// AUXILIARES
evento_catch = "espera por"
evento_throw = "envia mensaje a" / "envia respuesta a"
auxiliar_evento_adjunto = "si transcurre" / "si llega" ws mensaje
mensaje = "mensaje" / "mail" / "respuesta"
prefijo_tarea_servicio = "utiliza el servicio"
prefijo_tarea_manual = "realiza la tarea manual"
prefijo_tarea_subproceso = "realiza el subproceso"
subproceso_loop = "varias veces" / "muchas veces"
formulario_id = "es un formulario"
ver_form_id = "muestra" / "despliega"
prefijo_compuerta_AND = "al mismo tiempo" / "a la vez" / "en paralelo"
prefijo_compuerta_OR = "si se cumple"
defecto = "si no"
prefijo_evento_adjunto = "alternativa de"
condicional = "si"
prefijo_loop = "mientras"
condicion_entonces = "entonces"
tipo = "texto" / "numero" / "fecha" / "booleano"
tiempo = "segundos" / "minutos" / "horas" / "dias" / "semanas" / "meses" / "años" /
  "segundo" / "minuto" / "hora" / "dia" / "semana" / "mes" / "año"
operador =
  "no es" {return "!="} /
  "es mayor que"  {return ">"} /
  "es menor que"  {return "<"} /
  "es" {return "=="}
