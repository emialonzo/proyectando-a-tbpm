var gulp = require('gulp');
var packager = require('electron-packager')


// define tasks here
gulp.task('default', function(){
  console.log("probando");
});

gulp.task('build', function(){
  // "electron-packager . proyecto --out=dist --ignore='^/dist$'
  //  --asar --arch=x64 --overwrite --platform=linux --version=0.36.1",
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
