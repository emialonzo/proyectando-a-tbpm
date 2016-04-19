{
function makeInteger(o) {
    return parseInt(o.join(""), 10);
  }
function collect(obj1, obj2) {
  for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
  return obj1;
}
function getCampos(obj) {
  try{
    return obj.campos;
  }catch(e){
    return null;
  }
}
}

start = s:secuencia ws sentC:(sent_campos*) ws sentExpr:(sent_expresiones*) {return {"proceso":s, "campos":sentC, "expresiones":sentExpr};}


separador = ","
ws "whitespace" = [ \t\n\r]*
articulo = "el" / "la" / "los" / "las"
punto = "."
fin = "fin"
finproceso = "finproceso"

Integer "integer" = [0-9]+ { return parseInt(text(), 10); }
digito "digito" = digits:[0-9]+ { return makeInteger(digits); }
palabra "palabra" = [a-z]i+ { return text()}
palabras "palabras" = ([a-z]i+ ws?)+ { return text()}

secuencia = sec:(ws sent:sentencia {return sent;})+ {  return {"tipo":"secuencia", "sentencia":sec}}

sentencia =
      sentEv:sent_ev {return {"tipo":"evento", "sentencia":sentEv};} /
			task:sent_accion {return {"tipo":"task", "sentencia":task, "doc": text()};} /
      sentY:sent_y {return {"tipo":"and", "sentencia":sentY};} /
      sentO:sent_o {return {"tipo":"xor", "sentencia":sentO};} /
      sentAdj:sent_adj {return {"tipo":"adjunto", "evento":sentAdj.evento, "adjunto_a":sentAdj.adjunto_a, "sentencia":sentAdj.sentencia, "interrumpible":sentAdj.interrumpible };} /
      sentM:sent_mientras {return {"tipo":"loop", "sentencia":sentM} }


actor = articulo ws nombre:(n:[a-z ]i+ ws { return n.join("")}) "," ws { return nombre}/
        articulo ws nombre:[a-z]i+ { return nombre.join("")}

tiempo_evento  = "espera por"
sent_ev = ws actor:actor ws "espera por" ws evento:tipo_evento ws punto {return {"evento":evento, "actor":actor}} /
          ws actor:actor ws "envia mensaje a" ws pool:palabras ws punto {return {"evento":{"tipo":"mensaje", "throw":true}, "actor":actor, "pool":pool, "tipo":"throw"}}

tipo_evento = d:digito ws unidad:tiempo {return "tiempo", {"tipo":"timer","tiempo" : d, "unidad":unidad};}
		/ mensaje_evento

mensaje_evento = mensaje ws "de" ws p:palabras {return {"tipo":"mensaje","evento":"mensaje", "mensaje":p};}
mensaje = "mensaje" / "mail"
tiempo =  "segundos" / "minutos" / "horas" / "dias" / "semanas" / "meses" / "años" /
          "segundo" / "minuto" / "hora" / "dia" / "semana" / "mes" / "año"


servicio_id = "ejecuta el servicio"
accion = ([a-z]i+ ws)* { return text()}
sent_accion =  ws actor:actor ws "realiza la tarea manual" ws accion:accion ws punto
              { return {"actor": actor , "accion" : accion , "task": "manual"};}
              /ws actor:actor ws "ejecuta el servicio" ws accion:accion ws punto
              { return {"actor": actor , "accion" : accion , "task": "service"};}
              / ws actor:actor ws "ejecuta el subproceso" ws accion:accion ws punto
              { return {"actor": actor , "accion" : accion , "task": "subproceso"};}
              / ws actor:actor ws accion:accion ws punto ws (campos:sent_campos?)
              { return {"actor": actor , "accion" : accion , "task": "human", "campos":getCampos(campos)};}

/*sent_campos = (articulo ws)? tarea:palabra ws "es un formulario"  ws palabras ws ":" ws listaCampos:campos punto ws{return {"tarea":tarea, "campos":listaCampos}}*/
formulario_id = "es un formulario"
ver_form_id = "muestra" / "despliega"
sent_campos = tarea:(palabras separador/ palabra) ws formulario_id ws palabras ws ":" ws listaCampos:campos punto ws{return {"tarea":tarea, "campos":listaCampos}}
/ tarea:(palabras separador/ palabra) ws ver_form_id ws palabras ws ":" ws listaCampos:ver_campos punto ws{return {"tarea":tarea, "campos":listaCampos}}

id_y = "al mismo tiempo" / "a la vez" / "en paralelo"
sent_y = ws id_y separador
         ws Integer primero:secuencia
            resto:(ws Integer sen:secuencia {return sen;})+
            ws fin
            { return [primero].concat(resto);}

id_o = "si se cumple"
defecto = "si no"
condicion = expresion /  cond:[a-z]i+ ws { return cond.join("");}

condicion_entonces = "entonces"
sent_o = ws id_o separador
         ws primero:(con:condicion "entonces" ws sen:secuencia {return collect({"condicion":con}, sen)})
         resto:(ws con:condicion "entonces" ws sen:secuencia {return collect({"condicion":con}, sen)})*
         final:(ws defecto ws sen:secuencia {return collect({"condicion":"defecto"}, sen)})
         ws fin
         {return [primero].concat(resto.concat(final));}


adj_id = "alternativa de"
adj_cond = "transcurre" / "llega" ws mensaje
condicional = "si"
sent_adj = ws adj_id ws p:palabras ws separador ws condicional ws adj_cond ws evento:tipo_evento ws sec:secuencia ws fin {return {"adjunto_a":p, "evento":evento, "sentencia":[sec], "interrumpible":false}} /
  ws "se interrumpe" ws p:palabras ws separador ws condicional ws adj_cond ws evento:tipo_evento ws sec:secuencia ws fin {return {"adjunto_a":p, "evento":evento, "sentencia":[sec], "interrumpible":true}}

id_mientras = "mientras"
sent_mientras = ws id_mientras
				ws condicion separador sent:secuencia
				ws fin
				{return [sent]}

campos = campo+
tipo = "texto" / "numero" / "fecha" / "booleano"
campo = ws nombre:palabra ws "que es un" "a"? ws tipo:tipo ws ob:"obligatorio"? ws separador? ws {return {"nombre":nombre, "tipo":tipo, "obligatorio":ob?true:false, "writable":true}}

ver_campos = ver_campo+
ver_campo = ws nombre:palabra ws separador? ws {return {"nombre":nombre, "tipo":"texto", "obligatorio":true, "writable":false}}

opLog = "&&" / "||"
op = "!=" / "==" / ">=" / "<=" / ">" / "<"
term = [a-zA-Z0-9"]+
expr = term ws op ws term
expresion = expr (ws opLog ws expr)* {return text()}
sent_expresiones = "La expresion de la condicion" ws
        cond:palabras ws separador ws
        "es" ws expre:expresion punto ws
        {return {"condicion": cond, "expresion" : expre};}
