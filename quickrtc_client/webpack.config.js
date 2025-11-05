const path = require("path");

module.exports = {
  mode: "development", // Change to 'production' for production builds
  entry: "./src/client.ts",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "client.js",
    library: {
      type: "module",
    },
    clean: true,
  },
  experiments: {
    outputModule: true,
  },
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
  // Remove externals to bundle socket.io-client
  // externals: {
  //   // Don't bundle these - they'll be available globally or via CDN
  //   "socket.io-client": "io",
  // },
  target: "web",
  devtool: "source-map",
};
