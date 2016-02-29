{function collect(obj1, obj2) {
  for (var attrname in obj2) { obj1[attrname] = obj2[attrname]; }
  return obj1;
}}
start = s:secuencia ws {return s;}

separador = ","
ws "whitespace" = [ \t\n\r]*
articulo = "el" / "la" / "los" / "las"
punto = "."
fin = "fin"
Integer "integer" = [0-9]+ { return parseInt(text(), 10); }

secuencia = sec:(ws sent:sentencia {return sent;})+ {return {"tipo":"secuencia", "sentencia":sec};}

sentencia = task:sent_accion {return {"tipo":"task", "sentencia":task};} /
            sentY:sent_y {return {"tipo":"and", "sentencia":sentY};} /
            sentO:sent_o {return {"tipo":"xor", "sentencia":sentO};} /
            sentM:sent_mientras {return {"tipo":"loop", "sentencia":sentM};}

actor = articulo ws nombre:(n:[a-z ]i+ ws { return n.join("")}) "," ws { return nombre}/
        articulo ws nombre:[a-z]i+ { return nombre.join("")}

accion = ([a-z]i+ ws)* { return text()}
sent_accion = ws actor:actor
              ws accion:accion
              ws punto
              { return {"actor": actor , "accion" : accion };}

id_y = "al mismo tiempo" / "a la vez" / "en paralelo"
sent_y = ws id_y separador
         ws Integer primero:secuencia
            resto:(ws Integer sen:secuencia {return sen;})+
            ws fin
            { return [primero].concat(resto);}

id_o = "si se cumple"
defecto = "si no"
condicion = cond:[a-z]i+ ws { return cond.join("");}
sent_o = ws id_o separador
         ws primero:(con:condicion "entonces" ws sen:secuencia {return collect({"condcion":con}, sen)})
         resto:(ws con:condicion "entonces" ws sen:secuencia {return collect({"condcion":con}, sen)})*
         final:(ws defecto ws sen:secuencia {return collect({"condcion":"defecto"}, sen)})
         ws fin
         //ws primero:(con:condicion "entonces" ws sen:secuencia {return {"condcion":con, sentencia:sen};})
         //resto:(ws con:condicion "entonces" ws sen:secuencia {return {"condcion":con, sentencia:sen};})*
         //final:(ws defecto ws sen:secuencia {return {"condcion":"defecto", sentencia:sen};})
         {return [primero].concat(resto.concat(final));}

id_mientras = "mientras"
sent_mientras = ws id_mientras
                ws condicion separador sent:secuencia
                ws fin
                {return [sent]}
