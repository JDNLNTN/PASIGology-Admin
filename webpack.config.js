const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html'
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '.', globOptions: { ignore: ['**/index.html'] } }
      ]
    })
  ],
  devServer: {
    historyApiFallback: {
      disableDotRule: true,
      rewrites: [
        { from: /^\//, to: '/index.html' }
      ]
    },
    static: {
      directory: path.join(__dirname, 'public'),
      serveIndex: false
    },
    port: 3000,
    hot: true,
    open: true,
    compress: true,
    client: {
      overlay: {
        errors: true,
        warnings: false
      }
    },
    headers: {
      'Access-Control-Allow-Origin': '*'
    },
    allowedHosts: 'all',
    host: 'localhost',
    setupMiddlewares: (middlewares, devServer) => {
      if (!devServer) {
        throw new Error('webpack-dev-server is not defined');
      }
      return middlewares;
    }
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
}; 