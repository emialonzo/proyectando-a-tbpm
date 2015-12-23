start
  = s:secuencia

secuencia = (ws sec:sentencia {return sec;})+

sentencia = sent_accion
         / sent_y

sent_accion = ws actor:actor ws accion:accion ws fin { return {"actor": actor , "accion" : accion };}
sent_y = ws id_y ws primero:sentencia resto:(ws op_y ws sen:sentencia {return sen;})+ { return [primero].concat(resto) }

actor   = articulo ws nombre:[a-z]i+ { return nombre.join("")}
accion = ([a-z]i+ ws)* { return text()}

op_y = "y"
id_y = "al mismo tiempo" / "a la vez" / "en paralelo"

ws "whitespace" = [ \t\n\r]*
articulo = "el" / "la"
fin = "."
