const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  target: "node", // Add this to indicate this is a Node.js application
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
    clean: true,
  },
  mode: "development",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: "ts-loader", // or use babel-loader with @babel/preset-typescript
      },
    ],
  },
  devtool: "source-map",
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      // Provide fallbacks for Node.js core modules
      events: require.resolve("events/"),
      os: require.resolve("os-browserify/browser"),
    },
  },
  externals: {
    // Mark Node.js built-in modules as external
    events: "commonjs events",
    os: "commonjs os",
  },
};
