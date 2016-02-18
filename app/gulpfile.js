var gulp = require('gulp');
var packager = require('electron-packager')
var fs = require('fs');
var clean = require('gulp-clean');

const jasmine = require('gulp-jasmine');
const reporters = require('jasmine-reporters');


// define tasks here
gulp.task('default', function(){
  console.log("probando");
});

gulp.task('build', ['clean'], function(){
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

gulp.task('clean', function () {
  return gulp.src('dist', {read: false})
    .pipe(clean());
});

gulp.task('test',  function () {
	gulp.src('spec/test/*.js')
  				.pipe(jasmine())
		// .pipe(jasmine({
		// 	reporter: new reporters.JUnitXmlReporter()
		// }))
  });
