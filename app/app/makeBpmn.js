var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");

var gramatica = null;
var parser = null;
var bpmn = {};
var laneSet = {
  lane : []
};
laneSet.lane.push(
  {
    "_id" : "idLane1",
    "_name": "Lane1",
    "flowNodeRef": {
      "__text":"idTarea1"
    }
  }
);

var filtroXOR = function(memo, elem){
  console.log("TIPOS: ultimo memo: " + _.last(memo) + " elemento" + elem.tipo);
  // console.info("tipo memo:" + typeof(memo));
  // console.info("elem.tipo:" + elem.tipo);
  var list = [];
  if(elem.tipo == "xor"){
    console.error("ES xor");
    var cierroXor = {
      "tipo": "CierroXOR"
    };
    list = _.union(list, [elem], filtroXOR(elem.sentencia), [cierroXor]);
  } else if (typeof elem.condicion !== 'undefined') {
    list.push(filtroXOR(elem.sentencia));
  }
  else {
    console.info("NO es xor");
    list.push(elem);
  }
  return _.union(memo, list);
}

var filtros = function (model){
  var res = _.reduce(model, filtroXOR, []);
  return res;
}

function mapJson(model, fun){
  if(_.isArray(model)){
    _.each(model, mapJson);
  }
  else{
    procesarObject(model);
  }
}

const task = "TASK";
var pruebaAnidada = [
  {"tipo": task, "lane":"usuario x", "accion":"baila rapido"},
  {"tipo": "XOR", "lane":"usuario y", "accion":[
    {"tipo": task, "lane":"usuario z", "accion":"baila rapido"},
    {"tipo": task, "lane":"usuario w", "accion":"baila rapido"},
    {"tipo": task, "lane":"usuario s", "accion":"baila rapido"}
  ]},
  {"tipo": "AND", "lane":"usuario r", "accion":[
    {"tipo": task, "lane":"usuario l", "accion":"baila agil"},
    {"tipo": task, "lane":"usuario j", "accion":"baila lento"},
    {"tipo": task, "lane":"usuario k", "accion":"baila torpe"}
  ]
}
];
// `<bpmn:laneSet>
//     <bpmn:lane id="Lane_0t1npma" name="cocinero">
//         <bpmn:flowNodeRef>Task_1h4lllm</bpmn:flowNodeRef>
//     </bpmn:lane>
//     <bpmn:lane id="Lane_1hwq0iu" name="mozo">
//         <bpmn:flowNodeRef>Task_1l1l4c6</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>Task_1xffedn</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>EndEvent_1doakpt</bpmn:flowNodeRef>
//         <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
//     </bpmn:lane>
// </bpmn:laneSet>`

var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var getActors = function(model){
  return _.uniq(_.map(_.flatten(model), function(elem){ return elem.actor; }));
}

var fillLaneSet = function(elem){
  bpmn.lanes.push(elem.acotr);
}

var start = function(model){
  bpmn.lanes = []
  var actor = model[0].actor;
  model.unshift()
}
var makeBpmn = function(model){
  bpmn.laneset = [];
  for(var i=0; i < model.length; i++){
    var elem = model[i];
  }

}

module.exports = {
  init : init,
  makeBpmn : makeBpmn,
  getActors : getActors,
  filtros:filtros
}
