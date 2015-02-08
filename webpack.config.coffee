path = require("path")
module.exports = {
  entry: './src/app.coffee'
  output: {
    path: path.join(__dirname, 'public')
    publicPath: 'public/'
    filename: 'bundle.js'
  }
  module: {
    loaders: [
      # { test: /\.less$/, loader: 'style!css!less' },
      { test: /\.coffee$/, loader: "coffee" }
      { test: /\.vue$/, loader: "vue" }
      # { test: /\.jade$/, loader: "template-html" }
    ]
  }
  devtool: 'inline-source-map'
}
