const path = require("path");

// Common configuration
const common = {
  entry: "./src/index.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
    fallback: {
      stream: require.resolve("stream-browserify"),
      events: require.resolve("events"),
      buffer: require.resolve("buffer"),
      process: require.resolve("process/browser"),
    },
  },
  externals: {
    "socket.io-client": {
      commonjs: "socket.io-client",
      commonjs2: "socket.io-client",
      amd: "socket.io-client",
      root: "io",
    },
  },
  target: "web",
  devtool: "source-map",
};

// UMD build (for script tags and CommonJS)
const umdConfig = {
  ...common,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.js",
    library: {
      type: "umd",
    },
    globalObject: "this",
    clean: false, // Don't clean - tsc outputs type files
  },
};

// ESM build (for modern bundlers like Vite/Rollup)
const esmConfig = {
  ...common,
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "index.esm.js",
    library: {
      type: "module",
    },
    clean: false,
  },
  experiments: {
    outputModule: true,
  },
  externals: {
    "socket.io-client": "socket.io-client",
  },
};

module.exports = [umdConfig, esmConfig];
