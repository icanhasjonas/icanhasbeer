const gulp = require('gulp')
const rename = require('gulp-rename')
const awspublish = require('gulp-awspublish')
const gulpif = require('gulp-if')
const gulpmatch = require('gulp-match')
const parallelize = require('concurrent-transform')
const AWS = require('aws-sdk')
const through = require('through2')
const gutil = require('gulp-util')
const argv = require('yargs').argv

const pkg = require('./package.json')

const force = !!argv.force

const pkgdeploy = pkg.deploy || {}
const pkgaws = pkgdeploy.aws || {}
const pkgs3 = pkgaws.s3 || {}
const pkgcloudfront = pkgaws.cloudfront || {}

const bucketName = argv.bucket || pkgs3.bucket
const region = argv.region || pkgs3.region

gulp.task('publish', function() {
	// create a new publisher using S3 options
	// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#constructor-property
	const aws = {
		region: region,
		credentials: new AWS.SharedIniFileCredentials({ profile: argv.pprofile || pkgaws.profile }),
		distributionId: pkgcloudfront.distributionId,
		params: {
			Bucket: bucketName,
		},
	}
	const publisher = awspublish.create(aws, { cacheFileName: './.publish-cache' })

	const headers = {
		cached: {
			'Cache-Control': `max-age=${60 * 60 * 24 * 365}, public, immutable`,
		},
		notCached: {
			'Cache-Control': `max-age=${60 * 60 * 24 * 30}, public`,
		},
	}

	const mutableFilter = /(index\.html|\.txt)$/

	function collectNonImmutableObjects(collection) {
		const cloudfrontInvalidation = {
			CallerReference: Date.now().toString(16),
			Paths: {
				Quantity: 0,
				Items: [],
			},
		}

		function collector(file, enc, next) {
			if (mutableFilter.test(file.s3.path) && file.s3.state !== 'cache') {
				cloudfrontInvalidation.Paths.Quantity++
				cloudfrontInvalidation.Paths.Items.push(`/${file.s3.path}`)
			}
			next()
		}

		function done(cb) {
			if (!cloudfrontInvalidation.Paths.Quantity) {
				return cb()
			}

			if (aws.distributionId) {
				new AWS.CloudFront().createInvalidation(
					{
						DistributionId: aws.distributionId,
						InvalidationBatch: cloudfrontInvalidation,
					},
					function(err, data) {
						if (err) {
							throw new gutil.PluginError(
								'gulp-invalidate-cloudfront',
								'Could not invalidate cloudfront: ' + err
							)
							return cb(false)
						}

						gutil.log('Cloudfront invalidation created with id: ' + data.Invalidation.Id)
						cb()
					}
				)
			} else {
				cb()
			}
		}

		return through.obj(collector, done)
	}

	return (gulp
			.src('./dist/**')
			// gzip, Set Content-Encoding headers and add .gz extension
			//.pipe(awspublish.gzip({ ext: '.gz' }))

			// move to _test directory
			//.pipe(rename(function (path) {
			//	path.dirname = '_test/' + path.dirname;
			//}))

			.pipe(
				parallelize(
					gulpif(
						mutableFilter,
						publisher.publish(headers.notCached, { force: force }),
						publisher.publish(headers.cached, { force: force })
					)
				),
				5
			)
			// create a cache file to speed up consecutive uploads
			.pipe(publisher.cache())
			// print upload updates to console
			.pipe(awspublish.reporter())
			.pipe(collectNonImmutableObjects()) )
})
