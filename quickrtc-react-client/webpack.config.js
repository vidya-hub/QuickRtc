const path = require("path");

module.exports = {
  entry: "./src/index.ts",
  output: {
    filename: "index.js",
    path: path.resolve(__dirname, "dist"),
    library: {
      name: "QuickRTCReactClient",
      type: "umd",
      umdNamedDefine: true,
    },
    globalObject: "this",
  },
  externals: {
    react: {
      commonjs: "react",
      commonjs2: "react",
      amd: "react",
      root: "React",
    },
    "react-redux": {
      commonjs: "react-redux",
      commonjs2: "react-redux",
      amd: "react-redux",
      root: "ReactRedux",
    },
    "@reduxjs/toolkit": {
      commonjs: "@reduxjs/toolkit",
      commonjs2: "@reduxjs/toolkit",
      amd: "@reduxjs/toolkit",
      root: "RTK",
    },
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
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
};
