gulp = require 'gulp'
gutil = require 'gulp-util'
browserify = require 'browserify'
source = require 'vinyl-source-stream'
buffer = require 'vinyl-buffer'
sourcemaps = require 'gulp-sourcemaps'
webpack = require 'webpack'


# webpackは難しいのでやめる！！！
gulp.task 'webpack', ->
  config = require './webpack.config.coffee'
  webpack config, (err, stats) ->
    if (err)
      throw gutil.PluginError("webpack", err)
      gutil.log "[webpack]", stats.toString()

gulp.task 'webpack-dev-server', ->
  config = require './webpack.config.coffee'
  #config.debug = true

  WebpackDevServer = require 'webpack-dev-server'
  WebpackDevServer webpack(config), {
    publicPath: "/" + config.output.publicPath
    stats: {
      color: true
    }
  }
  .listen 8080, "localhost", (err)->
    if err
      throw gutil.PluginError "webpack-dev-server", err

    gutil.log "[webpack-dev-server]", "http://localhost:8080/webpack-dev-server/index.html"


gulp.task 'webserver', ->
  webserver = require 'gulp-webserver'
  gulp.src 'public'
  .pipe webserver {
    livereload: true
  }

# vueify使うと、autoprefixerとかstyledoccoとか使えないけど、
# 前者はmixinで解決できるし、後者は1人PJだからまあおっけー！！
# 細かいこと気にせずやってみよう！！
gulp.task 'build', ->
  browserify
    entries: ['./src/app.coffee']
    extensions: ['coffee', 'vue'] # coffeeのファイルをrequireできるようにする
  .transform 'coffeeify' # transform coffee to js
  .transform 'vueify' # transform vue to js
  .bundle()
  .pipe source 'bundle.js' # convert to vinyl object by output filename
  .pipe buffer()
  .pipe sourcemaps.init loadMaps:true # loadMaps: trueでBrowserifyの出力の中のsource mapを拾う
  .pipe sourcemaps.write()
  .pipe gulp.dest 'public'

# usage: gulp csscomb --file static/less/hoge.less
# cssにセミコロン忘れとかあると、正しくsortされないので、lintかけたほうがいい
# csscomb.jsonもシンタックスエラーあると正しくsortされないのでlintかけたほうがいい
# できればcsscombデフォルトの設定にしたい. https://github.com/csscomb/csscomb.js/blob/master/config/csscomb.json
# 圧縮率高いらしい。http://peteschuster.com/2014/12/reduce-file-size-css-sorting/
gulp.task 'csscomb', ()->
  argv = require('minimist')(process.argv.slice(2))
  csscomb = require 'gulp-csscomb'
  path = require 'path'
  file = argv.file
  gulp.src file
  .pipe csscomb()
  .pipe gulp.dest path.dirname(file)



gulp.task 'watch', ->
  gulp.watch ['./src/*'], ['build']

gulp.task 'dev', ['build', 'watch', 'webserver']
