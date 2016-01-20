start = s:secuencia ws {return s;}

ws "whitespace" = [ \t\n\r]*
articulo = "el" / "la" / "los" / "las"
fin = "."
Integer "integer" = [0-9]+ { return parseInt(text(), 10); }

secuencia = (ws sec:sentencia {return sec;})+

sentencia = task:sent_accion {return {"tipo":"task", "sentencia":task};} /
            sentY:sent_y {return {"tipo":"and", "sentencia":sentY};} /
            sentO:sent_o {return {"tipo":"xor", "sentencia":sentO};}

actor = articulo ws nombre:[a-z]i+ { return nombre.join("")}
accion = ([a-z]i+ ws)* { return text()}
sent_accion = ws actor:actor
              ws accion:accion
              ws fin
              { return {"actor": actor , "accion" : accion };}

id_y = "al mismo tiempo" / "a la vez" / "en paralelo"
sent_y = ws id_y","
         ws Integer primero:sentencia
            resto:(ws Integer sen:sentencia {return sen;})+
            { return [primero].concat(resto);}

id_o = "si se cumple"
defecto = "si no"
condicion = cond:[a-z]i+ ws { return cond.join("");}
sent_o = ws id_o","
         ws primero:(con:condicion "entonces" ws sen:sentencia
         {return {"condcion":con, "sentencia":sen}})
         resto:(
         (ws con:condicion "entonces" ws sen:sentencia
         {return {"condcion":con, "sentencia":sen}})+
             (ws defecto ws sen:sentencia
             {return {"condcion":"defecto", "sentencia":sen}})
               /
         (ws "si no" ws sen:sentencia
         {return {"condcion":"defecto", "sentencia":sen}})
               )
         {return [primero].concat(resto);}
