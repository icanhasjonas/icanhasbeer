const path = require('path')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')
const HtmlWebpackInlineSourcePlugin = require('html-webpack-inline-source-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const WebpackChunkHash = require('webpack-chunk-hash')
const FaviconsWebpackPlugin = require('favicons-webpack-plugin')
const SriPlugin = require('webpack-subresource-integrity')
const InlineChunkManifestHtmlWebpackPlugin = require('inline-chunk-manifest-html-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')

const WebpackDeleteAfterEmit = require('webpack-delete-after-emit')

const pkg = require('./package.json')
const moment = require('moment')

const optimized = !!~process.argv.indexOf('-p') && !~process.argv.indexOf('--skip-optimized')
const generateSourceMap = !optimized

function regexpEscape(s) {
	return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
}

const outputPrefix = `oel/`
const loaderFileName = `_loader.js`
const paths = {
	font: `${outputPrefix}font/[name].${optimized ? '[hash:8].' : ''}[ext]`,
	video: `${outputPrefix}video/[name].${optimized ? '[hash:8].' : ''}[ext]`,
	image: `${outputPrefix}image/[name].${optimized ? '[hash:8].' : ''}[ext]`,
	js: `${outputPrefix}js/[name].${optimized ? '[chunkhash:8].' : ''}js`,
	css: `${outputPrefix}css/[name].${optimized ? '[contenthash:8].' : ''}css`,
	loader: `${outputPrefix}js/${loaderFileName}`,
}

const babelOptions = {
	presets: [
		[
			'env',
			{
				modules: false,
			},
		],
	],
}

const postcssLoader = {
	loader: 'postcss-loader',
	options: {
		plugins: function() {
			return [require('autoprefixer')]
		},
	},
}

function noop() {}

const initialLessMatcher = optimized ? /initial\.less$/i : /^no-way-this-shit-matches/
const initialExtractor = new ExtractTextPlugin({
	filename: paths.css,
	allChunks: true,
})

const imageLoader = {
	loader: 'image-webpack-loader',
	options: {
		bypassOnDebug: true,
		mozjpeg: {
			progressive: false,
			quality: 90,
		},
		gifsicle: {
			interlaced: false,
		},
		optipng: {
			optimizationLevel: 4,
		},
		pngquant: {
			quality: '75-90',
			speed: 3,
		},
	},
}

module.exports = {
	//recordsPath: optimized ? path.resolve(__dirname, './records.json') : undefined,

	target: 'web',

	entry: {
		main: 'main',
		//kernel: ['babel-polyfill', 'whatwg-fetch', 'tslib'],
	},

	output: {
		path: path.resolve(__dirname, 'dist'),
		crossOriginLoading: 'anonymous',
		publicPath: '/',
		hashFunction: 'sha256',
		filename: `${outputPrefix}js/[name].${optimized ? '[chunkhash:8].' : ''}js`,
	},

	resolve: {
		extensions: ['.ts', '.js'],
		modules: ['src', 'node_modules'],
	},

	devServer: {
		host: '0.0.0.0',
		port: 3000,
		disableHostCheck: true,
		historyApiFallback: true,
		stats: { colors: true },
		proxy: {
			'/dagar/': {
				secure: false,
				changeOrigin: true,
				target: 'https://api.dryg.net:443',
			},
		},
	},

	module: {
		rules: [
			/* Images and Videos */
			{
				test: /\.(png|gif|jpg|svg)$/,
				oneOf: [
					{
						/* only for fav icons */
						include: /images[/\\]icons[/\\]fav/,
						use: [
							{
								loader: 'file-loader',
								options: {
									name: paths.image,
								},
							},
							imageLoader,
						],
					},
					{
						use: [
							{
								loader: 'url-loader',
								options: {
									limit: 2048,
									name: paths.image,
								},
							},
							imageLoader,
						],
					},
				],
			},
			{
				test: /\.mp4$/,
				use: {
					loader: 'file-loader',
					options: {
						name: paths.video,
					},
				},
			},

			/* FONTS */
			{
				test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				use: {
					loader: 'url-loader',
					options: {
						limit: 4096,
						mimetype: 'application/font-woff2',
						name: paths.font,
					},
				},
			},
			{
				test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				use: {
					loader: 'url-loader',
					options: {
						limit: 4096,
						mimetype: 'application/font-woff',
						name: paths.font,
					},
				},
			},
			{
				test: /\.(ttf|eot)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
				use: {
					loader: 'file-loader',
					options: {
						name: paths.font,
					},
				},
			},

			{ test: /\.css$/i, exclude: initialLessMatcher, use: ['style-loader', 'css-loader', postcssLoader] },
			{
				test: /\.scss$/i,
				exclude: initialLessMatcher,
				use: ['style-loader', 'css-loader', postcssLoader, 'sass-loader'],
			},
			{
				test: /\.less$/i,
				exclude: initialLessMatcher,
				use: ['style-loader', 'css-loader', postcssLoader, 'less-loader'],
			},
			{ test: initialLessMatcher, use: ExtractTextPlugin.extract(['css-loader', postcssLoader, 'less-loader']) },
			{
				test: /\.js$/i,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: babelOptions,
				},
			},
			{
				test: /\.ts$/i,
				use: [
					{
						loader: 'babel-loader',
						options: babelOptions,
					},
					{
						loader: 'ts-loader',
						options: {
							//silent: true,
							compilerOptions: {
								sourceMap: generateSourceMap,
								inlineSources: generateSourceMap,
							},
						},
					},
				],
			},
			{
				test: /\.html$/i,
				use: {
					loader: 'html-loader',
					options: {
						interpolate: 'require',
						minimize: optimized,
						collapseWhitespace: optimized,
						attrs: ['img:src', 'source:src', 'video:poster', 'link:href'],
					},
				},
			},
		],
	},

	plugins: [
		new webpack.DefinePlugin({
			BUILD_VERSION: JSON.stringify(pkg.version),
			PACKAGE_NAME: JSON.stringify(pkg.name),
		}),

		new webpack.BannerPlugin(`ES/OS v${pkg.version} (c) ${new Date().getFullYear()}`),

		// new webpack.optimize.CommonsChunkPlugin({
		// 	name: ['kernel'],
		// 	minChunks: Infinity,
		// 	//children: true,
		// }),

		/* no moment localization */
		new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
		new webpack.NamedModulesPlugin(),
		new webpack.NamedChunksPlugin(),
		// new webpack.NamedChunksPlugin(chunk => {
		// 	if (chunk.name) {
		// 		return chunk.name;
		// 	}
		// 	const generatedName = chunk.modules.map(m => {
		// 		const p = path.relative('.', m.request)
		// 		const i = p.indexOf('!')
		// 		return i !== -1 ? p.substr(0,i) : p
		// 	}).join("_");
		// 	return generatedName
		// }),

		optimized
			? new WebpackDeleteAfterEmit({
					globs: [paths.loader],
				})
			: noop,

		optimized
			? new WebpackChunkHash({
					additionalHashContent(chunk) {
						return `HELLO WORLD ${pkg.version}`
					},
				})
			: noop,

		new ScriptExtHtmlWebpackPlugin({
			sync: [/_loader\.js$/, /kernel\.([a-z0-9]+\.)js$/],
			defaultAttribute: 'async',
		}),

		new HtmlWebpackInlineSourcePlugin(),
		new HtmlWebpackPlugin({
			cache: false,
			template: './index.html',
			inlineSource: optimized ? `(\.css|${regexpEscape(paths.loader)})$` : `${regexpEscape(paths.loader)}$`,
			filename: 'index.html',
		}),
		/* /PRODUCTION */

		optimized ? initialExtractor : noop,

		optimized
			? new CopyWebpackPlugin([{ from: './humans.txt' }, { from: './robots.txt' }, { from: './brains.txt' }])
			: noop,

		// new InlineChunkManifestHtmlWebpackPlugin({
		//	//dropAsset: true
		// }),

		new webpack.optimize.CommonsChunkPlugin({
			name: 'loader',
			filename: paths.loader,
		}),

		optimized
			? new FaviconsWebpackPlugin({
					// Your source logo
					logo: './images/beer-icon.png',
					// The prefix for all image files (might be a folder or a name)
					prefix: `${outputPrefix}image/icon/[hash:8]/`,
					// Emit all stats of the generated icons
					emitStats: false,
					// The name of the json containing all favicon information
					statsFilename: 'iconstats-[hash].json',
					// Generate a cache file with control hashes and
					// don't rebuild the favicons until those hashes change
					persistentCache: true,
					// Inject the html into the html-webpack-plugin
					inject: true,

					background: '#fff',
					appName: 'I CAN HAS BEER',
					appDescription: 'Is it safe to have oel?',

					developerName: 'HUGESOUTH/AB',
					developerURL: 'https://huge.south/',

					// which icons should be generated (see https://github.com/haydenbleasel/favicons#usage)
					icons: {
						android: true,
						appleIcon: true,
						appleStartup: true,
						coast: false,
						favicons: true,
						firefox: true,
						opengraph: true,
						twitter: true,
						yandex: false,
						windows: false,
					},
				})
			: noop,

		/* does not work over CloudFront as of now */
		// optimized ? new SriPlugin({
		// 	hashFuncNames: ['sha256'],
		// 	enabled: optimized
		// }) : noop,
	],
}
