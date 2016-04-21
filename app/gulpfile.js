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



var browserify = require('gulp-browserify');
var uglify = require('gulp-uglify');

// Basic usage
gulp.task('scripts', function() {
  // Single entry point to browserify
  gulp.src('app/main.js')
  .pipe(browserify({
    insertGlobals : true,
    debug : true
  }))
  .pipe(uglify())
  .pipe(gulp.dest('./build/js'))
});

// gulp.task('uglify', ['scripts'], function() {
//   return gulp.src('build/car-finder.js')
//     .pipe(uglify())
//     .pipe(rename('car-finder.min.js'))
//     .pipe(gulp.dest('public/javascripts'));
// });
