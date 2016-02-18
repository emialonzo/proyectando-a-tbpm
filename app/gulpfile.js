var gulp = require('gulp');
var packager = require('electron-packager')


// define tasks here
gulp.task('default', function(){
  console.log("probando");
});

gulp.task('build', function(){
  var opts = {
    "arch": "x64",
    "dir": ".",
    "platform": "linux",
    "name": "proyecto",
    "out": "dist",
    "ignore": "^/dist$",
    "prune": "true",
    "overwrite": "true"
  }
  packager(opts, function done (err, appPath) { })
});
