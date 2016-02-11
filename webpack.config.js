var path = require('path');

module.exports = {
  entry: './js/entry.js',
  output: {
    path: path.join(__dirname),
    filename: 'build.js'
  },
  devtool: 'inline-source-map',
  module: {
    loaders: [
      { test: path.join(__dirname, 'scene-maker'), loader: 'babel-loader' },
      { test: path.join(__dirname, 'scenes' ,'\.html$'), loader: 'html-loader' }
      // { test: path.join(__dirname, 'scenes','\.json$'), loader: 'json-loader' }
    ]
  }
};
