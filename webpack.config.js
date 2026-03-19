const webpack = require("@nativescript/webpack");
const { DefinePlugin } = require("webpack");

module.exports = (env) => {
	webpack.init(env);

	webpack.chainWebpack((config) => {
		config.plugin("DefineDevFlag").use(DefinePlugin, [
			{ __DEV__: JSON.stringify(!env.production) },
		]);
	});

	return webpack.resolveConfig();
};
