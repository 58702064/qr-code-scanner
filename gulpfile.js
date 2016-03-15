'use strict';

var browserify = require('browserify');
var babelify = require('babelify');
var browserSync = require('browser-sync');
var buffer = require('vinyl-buffer')
var concat = require('gulp-concat');
var del = require('del');
var gulp = require('gulp');
var reload = browserSync.reload;
var mergeStream = require('merge-stream');
var source = require('vinyl-source-stream');
var sourcemaps = require('gulp-sourcemaps');
var watch = require('gulp-watch');
var sass = require('gulp-sass');
var autoprefixer = require('gulp-autoprefixer');

//To serve files
gulp.task('browserSync', () => {
  browserSync({
    notify: false,
    port: 8000,
    server: 'dist/',
    open: false
  });

	//Watch for the below file changes and reload browser
	gulp.watch(['dist']).on('change', reload);
});

gulp.task('copy:html', () => {
  console.log('Coping html files...');

	return gulp.src(['app/*.html'])
		.pipe(gulp.dest('dist'));
});

gulp.task('copy:sass', () => {
  console.log('Compiling scss to css files...');

  return gulp.src(['app/css/styles.scss'])
    .pipe(sass({
      outputStyle: 'compressed',
      sourceComments: 'map',
      includePaths : ['./app/css']
    }))
    .on('error', function(err){
      displayError(err);
    })
    .pipe(autoprefixer())
		.pipe(gulp.dest('dist/css'));

});

gulp.task('copy:images', () => {
  console.log('Coping image files...');

	return gulp.src(['app/images/*.*'])
		.pipe(gulp.dest('dist/images'));
});

gulp.task('copy:others', () => {
  console.log('Coping other files...');

	return gulp.src(['app/favicon.ico', 'app/manifest.json', 'app/sw.js', './server.js'])
		.pipe(gulp.dest('dist'));
});

gulp.task('copy:js', function () {
  console.log('Coping js files...');

  return gulp.src(['app/js/vendor/*.js', 'app/js/*.js'])
    .pipe(concat('app.js'))
		.pipe(gulp.dest('dist/js'));
});

function displayError(err) {
  console.log(err);
}

function createBundler(src) {
  var b = browserify({
    fullPaths: true,
    debug: true
  });

  b.transform('babelify', { presets: ['es2015'] }).add(src);
  return b;
}

var bundlers = {
  'sw.js': createBundler('./app/sw.js')
};

function bundle(bundler, outputPath) {
  var splitPath = outputPath.split('/');
  var outputFile = splitPath[splitPath.length - 1];
  var outputDir = splitPath.slice(0, -1).join('/');

  return bundler.bundle()
    .on('error', displayError)
    .pipe(source(outputFile))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist/' + outputDir))
    .pipe(reload({stream: true}));
}

gulp.task('browserify', function () {
  return mergeStream.apply(null,
    Object.keys(bundlers).map(function(key) {
      return bundle(bundlers[key], key);
    })
  );
});

gulp.task('clean', (done) => {
	del(['dist'], done);
});

gulp.task('watch', function () {
  console.log('\n--------- Watching All Files -------------------------------------------\n');

  var HTML = gulp.watch(['app/*.html', 'app/**/*.html'], ['copy:html']);
  var JS   = gulp.watch(['app/js/**/*.js'], ['copy:js']);
  var SASS = gulp.watch(['app/css/**/*.scss'], ['copy:sass']);
  var IMG  = gulp.watch(['app/images/*.*'], ['copy:images']);
  var OTHERS  = gulp.watch(['app/manifest.json', 'app/sw.js', './server.js'], ['copy:others']);

  var log = function (event) {
    if (event.type === 'deleted') {
      runSequence('clean');
      setTimeout(function () {
        runSequence('copy:html', 'copy:sass', 'copy:images', 'watch');
      }, 500);
    }
    console.log(config.notify.update('\n--------- File ' + event.path + ' was ' + event.type + ' ------------------------\n'));
  };

  // On change print file name and event type
  HTML.once('update', log);
  SASS.once('update', log);
  JS.once('update', log);
  IMG.once('update', log);
  OTHERS.once('update', log);
});

gulp.task('default',  ['clean', 'copy:html', 'copy:sass', 'copy:images', 'copy:js', 'browserify', 'copy:others', 'browserSync', 'watch']);