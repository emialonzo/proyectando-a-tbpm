var PEG = require("pegjs");
var fs = require("fs");
var _ = require("underscore");

var gramatica = null;
var parser = null;

var init = function(path){
  path = path || __dirname + '/gramatica.pegjs';
  gramatica = fs.readFileSync(path).toString();
  parser = PEG.buildParser(gramatica);
}

var getActors = function(model){
  return _.uniq(_.map(_.flatten(model), function(elem){ return elem.actor; }));
}

var bpmn = {}

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

var head = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
    `;
var pools = `<bpmn:collaboration id="Collaboration_08s4zor">
    <bpmn:participant id="Participant_0j5ydp8" name="restaurante" processRef="Process_1" />
</bpmn:collaboration>`

var lanes = `<bpmn:laneSet>
    <bpmn:lane id="Lane_0t1npma" name="cocinero">
        <bpmn:flowNodeRef>Task_1h4lllm</bpmn:flowNodeRef>
    </bpmn:lane>
    <bpmn:lane id="Lane_1hwq0iu" name="mozo">
        <bpmn:flowNodeRef>Task_1l1l4c6</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>Task_1xffedn</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>EndEvent_1doakpt</bpmn:flowNodeRef>
        <bpmn:flowNodeRef>StartEvent_1</bpmn:flowNodeRef>
    </bpmn:lane>
</bpmn:laneSet>`

module.exports = {
  init : init,
  makeBpmn : makeBpmn,
  getActors : getActors
}
