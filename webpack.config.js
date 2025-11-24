const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'build'),
  filename: 'static/js/[name].[contenthash].js',
  chunkFilename: 'static/js/[name].[contenthash].chunk.js',
  clean: true,
  // Use a production-friendly relative publicPath for static hosts (gh-pages)
  // but use an absolute path for the dev server so assets load correctly.
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/'
  },
  // Dev-friendly source maps (production will use full source-map)
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
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
      template: './public/index.html',
      filename: 'index.html'
    }),
    new HtmlWebpackPlugin({
      template: './public/index.html',
      filename: '404.html'
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
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:4000',
        changeOrigin: true,
        logLevel: 'debug'
      }
    ],
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