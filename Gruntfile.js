module.exports = function(grunt) {


  // Set path variables for the files we want to include in the build
  var appConfigVars = {
    bowerSource: 'third_party/bower_components',
    thirdPartyJs: 'third_party/js',
    source: 'js',
    templates: 'templates',
    css: 'static/css',
    py: 'src',
  };

  // The target directory for the final build product.
  var targetDirectory = 'out';

  grunt.initConfig({

    //calling appConfigVars set above
    appConfig: appConfigVars,

    appengine: {
      app: {
        root: targetDirectory,
        manageScript: [process.env.HOME,
                       'bin', 'google_appengine', 'appcfg.py'].join('/'),
        runFlags: {
          port: 8080
        },
        runScript: [process.env.HOME,
                    'bin', 'google_appengine', 'dev_appserver.py'].join('/')
      }
    },

    build: grunt.file.readJSON('config.json'),

    clean: [targetDirectory],

     concat: {
        dist: {
            files: [
                {
                    dest: '<%= appConfig.source %>/build/vendor.js',
                    src: [
                        '<%= appConfig.bowerSource %>/jquery/dist/jquery.js',
                        '<%= appConfig.bowerSource %>/angular/angular.js',
                        '<%= appConfig.bowerSource %>/angular-cache/dist/angular-cache.js',
                        '<%= appConfig.bowerSource %>/angular-animate/angular-animate.js',
                        '<%= appConfig.thirdPartyJs %>/mm-foundation-tpls.js',
                    ]
                },
                {
                    dest: '<%= appConfig.source %>/build/scripts.js',
                    src: [
                        '<%= appConfig.source %>/*.js',
                        '<%= appConfig.source %>/app.js',
                        '<%= appConfig.source %>/controllers/{,*/}*.js',
                        '<%= appConfig.source %>/directives/{,*/}*.js',
                        '<%= appConfig.source %>/filters/{,*/}*.js',
                        '<%= appConfig.source %>/services/{,*/}*.js'
                    ]
                }
            ]
        }
    },


    copy: {
      source: {
        cwd: 'src/',
        dest: [targetDirectory, ''].join('/'),
        expand: true,
        src: '**'
      },
      js: {
        cwd: ['js', 'build', ''].join('/'),
        dest: [targetDirectory, 'static', 'js', ''].join('/'),
        expand: true,
        src: '**'
      },
      static: {
        cwd: 'static',
        dest: [targetDirectory, 'static', ''].join('/'),
        expand: true,
        src: '**'
      },
      templates: {
        cwd: 'templates',
        dest: [targetDirectory, 'templates', ''].join('/'),
        expand: true,
        src: '**'
      },
      third_party_js: {
        cwd: ['third_party', 'js'].join('/'),
        dest: [targetDirectory, 'static', 'third_party', ''].join('/'),
        expand: true,
        src: '**'
      },
      third_party_py: {
        cwd: ['third_party', 'py'].join('/'),
        dest: [targetDirectory, ''].join('/'),
        expand: true,
        src: '**'
      }
    },

    uglify: {
          dist: {
              files: [
                  {dest: '<%= appConfig.source %>/build/vendor.min.js', src: ['<%= appConfig.source %>/build/vendor.js']},
                  {dest: '<%= appConfig.source %>/build/scripts.min.js', src: ['<%= appConfig.source %>/build/scripts.js']}
              ]
          }
      },

    /**
     * Poll for changes in html, css, js, tpl, and py  files
     */
    watch: {
      scripts: {
        files: [
          '<%= appConfig.source %>/**/*.js',
          '<%= appConfig.thirdPartyJs %>/**/*.js',
          '!<%= appConfig.source %>/build/*'
        ],
        tasks: ['js']
      },
      html: {
        files: [
          '<%= appConfig.templates %>/**/*.html',
          '<%= appConfig.templates %>/**/*.tpl',
          'static/*.html'

        ],
        tasks: ['html']
      },
      css: {
        files: [
          '<%= appConfig.css %>/**/*.css'
        ],
        tasks:['css']
      },
      py: {
        files: [
          '<%= appConfig.py %>/**/*.py'
        ],
        tasks: ['py']
      },
      sass: {
        files: ['**/*.{scss,sass}'],
        tasks: ['compass:dev']
      }
    },
  });

  grunt.loadNpmTasks('grunt-appengine');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-closure-soy');
  grunt.loadNpmTasks('grunt-closure-tools');

  grunt.registerTask('nop', function() {});

  grunt.registerTask('yaml', 'Generates app.yaml',
      function() {
        var appid = grunt.option('appid') ||
                    grunt.config.get('build.appid', false);

        if (typeof(appid) !== 'string' || appid.length == 0) {
          grunt.fatal('no appid');
        }

        var uncommitedChanges = false;
        var done = this.async();

        var logCallback = function(error, result, code) {
          if (code != 0) {
            grunt.log.writeln('git log error: ' + result);
            done(false);
          }
          var hash = String(result).split(' ')[0].substr(0, 16);
          var versionString = hash + (uncommitedChanges ? '-dev' : '');
          var yamlData = grunt.file.read('app.yaml.base');
          yamlData = yamlData.replace('__APPLICATION__', appid);
          yamlData = yamlData.replace('__VERSION__', versionString);
          grunt.log.writeln('Generating yaml for application: ' + appid);
          grunt.file.write([targetDirectory, 'app.yaml'].join('/'), yamlData);
          done();
        };

        var statusCallback = function(error, result, code) {
          if (code != 0) {
            grunt.log.writeln('git status error: ' + result);
            done(false);
          }
          if (String(result).indexOf('\nnothing to commit, working ' +
                'directory clean') == -1) {
            uncommitedChanges = true;
          }
          grunt.util.spawn(
              {cmd: 'git', args: ['log', '--format=oneline', '-n', '1']},
              logCallback);
        };

        grunt.util.spawn({cmd: 'git', args: ['status']}, statusCallback);
        });

  grunt.registerTask('js', [
    'concat',
    'uglify',
    'copy:js',
    'copy:third_party_js'
  ]);

  grunt.registerTask('css', [
    'copy:static'
  ]);

  grunt.registerTask('html', [
    'copy:templates',
    'copy:static'
  ]);

  grunt.registerTask('py', [
    'copy:source',
    'copy:third_party_py'
  ]);

  grunt.registerTask('default',
      ['yaml', 'concat', 'uglify', 'copy:js', 'copy:source', 'copy:static', 'copy:templates',
       'copy:third_party_js', 'copy:third_party_py',
      grunt.config.get('build.use_closure_templates') ? 'closureSoys' : 'nop',
      grunt.config.get('build.use_closure_templates') ? 'copy:soyutils' : 'nop',
      grunt.config.get('build.use_closure') ? 'closureBuilder' : 'nop',
      'yaml']);
};

