const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  entry: {
    taskpane: './src/taskpane/index.tsx',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].bundle.js',
    clean: true,
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@core': path.resolve(__dirname, 'src/core'),
      '@adapters': path.resolve(__dirname, 'src/adapters'),
      '@ui': path.resolve(__dirname, 'src/ui'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@utils': path.resolve(__dirname, 'src/utils'),
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              '@babel/preset-env',
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/taskpane/index.html',
      filename: 'taskpane.html',
      chunks: ['taskpane'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'assets', to: 'assets', noErrorOnMissing: true },
        { from: 'manifest.xml', to: 'manifest.xml' },
      ],
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    server: {
      type: 'https',
      options: {
        key: require('fs').readFileSync(require('os').homedir() + '/.office-addin-dev-certs/localhost.key'),
        cert: require('fs').readFileSync(require('os').homedir() + '/.office-addin-dev-certs/localhost.crt'),
        ca: require('fs').readFileSync(require('os').homedir() + '/.office-addin-dev-certs/ca.crt'),
      },
    },
    port: 3001,
    hot: true,
    proxy: [
      {
        context: ['/api-proxy'],
        target: 'https://ark.cn-beijing.volces.com',
        pathRewrite: { '^/api-proxy': '' },
        changeOrigin: true,
        secure: true,
        onProxyReq: (proxyReq, req, res) => {
          // 转发原始请求头
          if (req.headers.authorization) {
            proxyReq.setHeader('Authorization', req.headers.authorization);
          }
        },
      },
    ],
  },
  devtool: isProduction ? 'source-map' : 'eval-source-map',
};
