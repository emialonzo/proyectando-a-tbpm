// var child = require('child_process').spawn('java done.jar',['argument to pass in']);
// var child = require('child_process').spawn('java xmlToImg');

var child = require('child_process').spawn(
  'java', ['-jar', 'yaoqian/modules/org.yaoqiang.asaf.bpmn-graph.jar', 'processes/simpleDepurado.bpmn ', '--export']
);

child.stdout.on('data', function(data) {
    console.log(data.toString());
});

child.stderr.on("data", function (data) {
    console.log(data.toString());
});

child.on('close', function (code) {
  console.log('child process exited with code ',code);
});
