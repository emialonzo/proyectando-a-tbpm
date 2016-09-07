var pd = require('pretty-data').pd;
var _ = require("underscore");

var x2js = require('x2js'); //new X2JS();
var conv = new x2js({
  arrayAccessFormPaths : [
    "definitions.process.startEvent" ,
    "definitions.process.userTask" ,
    "definitions.process.manualTask" ,
    "definitions.process.serviceTask" ,
    "definitions.process.exclusiveGateway" ,
    "definitions.process.parallelGateway" ,
    "definitions.process.intermediateCatchEvent" ,
    "definitions.process.intermediateThrowEvent" ,
    "definitions.process.boundaryEvent" ,
    "definitions.process.endEvent" ,
    "definitions.process.subProcess" ,
    "definitions.process.sequenceFlow"
  ]
});

function ajustarCompuertasInnecesarias(xmlBpmn){
  var jsonBpmn = conv.xml_str2json( xmlBpmn );
  var xorABorrar = {};
  for (xor of jsonBpmn.definitions.process.exclusiveGateway) {

    secuenciasEntrantes = _.filter(jsonBpmn.definitions.process.sequenceFlow, function(secuenceFlow){
      return secuenceFlow._targetRef == xor._id;
    });

    secuenciasSaliente = _.filter(jsonBpmn.definitions.process.sequenceFlow, function(secuenceFlow){
      return secuenceFlow._sourceRef == xor._id;
    });

    // console.log("Analizando: " + pd.json(xor))
    // console.log("Le entra: " + pd.json(secuenciasEntrantes))
    // console.log("Le entra: " + secuenciasEntrantes.length)
    // console.log("Le sale: " + pd.json(secuenciasSaliente))
    // console.log("Le sale: " + secuenciasSaliente.length)
    if((secuenciasEntrantes.length ==1) &&  (secuenciasSaliente.length == 1)){
      console.log("Esto se borra xor con id " + xor._id)
      var flujoAModificar = secuenciasEntrantes[0];
      var flujoABOrrar = secuenciasSaliente[0];
      var flujo;
      for (var i = 0; i < jsonBpmn.definitions.process.sequenceFlow.length; i++) {
        flujo = jsonBpmn.definitions.process.sequenceFlow[i];
        if(flujo._id==flujoAModificar._id){
          jsonBpmn.definitions.process.sequenceFlow[i]._targetRef = flujoABOrrar._targetRef;
        }

      }
      jsonBpmn.definitions.process.sequenceFlow = _.filter(jsonBpmn.definitions.process.sequenceFlow, function(secuenceFlow){
        return secuenceFlow._sourceRef != xor._id;
      });
      xorABorrar[xor._id]=true;
    }
  }
  jsonBpmn.definitions.process.exclusiveGateway = _.filter(jsonBpmn.definitions.process.exclusiveGateway, function(elem){
    return !(elem._id in xorABorrar);
  });
  return conv.json2xml_str(jsonBpmn);
}

module.exports = {
  ajustarCompuertasInnecesarias: ajustarCompuertasInnecesarias,
}
