var BpmnViewer = require('bpmn-js');

var getBpmnImage = function(xml, container){
  var container = container || '#id-bpmn-model';
  var viewer = new BpmnViewer({ container: container });

  viewer.importXML(xml, function(err) {
    if (!err) {
      console.log('success!');
      viewer.get('canvas').zoom('fit-viewport');
    } else {
      console.log('something went wrong:', err);
    }
  });
}

module.exports = {
  getImage : getBpmnImage
}
