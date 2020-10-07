"use strict";

const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require('../../../utils/globalFunctions');
const Model = require("../../../models");
const { Op } = require("sequelize");
const {
	bytesToSize,
	createGcpBucket,
	wait
} = require('../../utils');

const gcsApi = require('../../gcStorage');

const RESULT_OUTPUT_DIR = '/Users/Gijoncheng/Desktop/product_images/';
const BUCKET_FOLDER = 'img/256/';

// const imagesOnGcStorage = require('/Users/Gijoncheng/Desktop/product_images/gcsImgName.json');

/**
 * Helper functions
 */

function getDatabaseProductImage() {
	return Model.ProductMedia.findAll({
		raw: true,
		attributes: ['MediaID', 'src', 'miniPic'],
		where: { mediaType: 'image' }
	});
}

function getShopifyResizedImgUrlStr(url, size) {
	const suffix = '.' + url.split('.').pop();
	const prefix = url.substring(0, url.indexOf(suffix));
	return prefix + `_${size}x${size}` + suffix;
}

// controller function
const compressImageToGcStore = async function (req, res) {
	res.setHeader("Content-Type", "application/json");

	// console.log("\nPreparing to upload image...");
	// const allImages = await getDatabaseProductImage();
	// const imagesToUpload = await allImages.filter(obj => imagesOnGcStorage.indexOf(obj.miniPic.split('/').pop()) === -1);
	// await upload(imagesToUpload);

	getAllImgFileNameInStorage();

	return ReS(res);
}


async function upload(images) {
	const t0 = now();
	const data_len = images.length;
	const concurrent_load = 50;
	const loop_count = Math.ceil(data_len / concurrent_load);

	const successList = [];
	const failedList = [];

	console.log(`\nStarting to upload ${data_len} images =>`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = (start + concurrent_load > data_len) ? data_len : (start + concurrent_load);
		
		// create promises
		const promises = [];
		for (let j = start; j < end; j += 1) {
			const {src, miniPic} = images[j];
			let resizedUrl = getShopifyResizedImgUrlStr(src, 256);
			let imgName = miniPic.split('/').pop();
			const prom = gcsApi.uploadImage(resizedUrl, imgName, BUCKET_FOLDER);
			promises.push(prom);
		}

		// handle promises results
		const results = await Promise.all(promises);
		for (let j = 0, len = results.length; j < len; j += 1) {
			const result = results[j];
			if (result.success) {
				successList.push(result);
			} else {
				console.error(result);
				failedList.push(result);
			}
		}

		// print progress when every job done
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 1000);
			console.log(`${end} items processed in ${spent} seconds, halting...`);
			await wait(1000);
		}
	}

	// print out upload info
	const totalBytes = successList.length ? successList.map(item => item.bytes).reduce((prev, next) => prev + next) : 0;
	const conclu = {
		"Total processed items": data_len,
		"Uploaded count": successList.length,
		"Failed count": failedList.length,
		"Total spent": Math.round((now() - t0) / 1000) + ' seconds',
		"Total uploaded size": bytesToSize(totalBytes)
	};

	console.log('\nDone ===>\n', conclu, '\n');
}


async function getAllImgFileNameInStorage() {
	const t0 = now();
	const bucket = new createGcpBucket();

	console.log(`Reading from GC storage <${bucket.name}/${BUCKET_FOLDER}> ...`);

	try {
		bucket.getFiles({}, (err, files) => {
			if (err) throw new Error(err);

			const gcsImgList = [];
			for (let i = 0, len = files.length; i < len; i += 1) {
				if (files[i].name.startsWith(BUCKET_FOLDER) && !files[i].name.endsWith('/')) {
					gcsImgList.push(files[i].name.split('/').pop());
				}
			}
			console.log(`Finished ==> ${gcsImgList.length} files found, writing to local =>`);
			if (gcsImgList.length) {
				const fileName = 'gcsImgName.json';
				const path = RESULT_OUTPUT_DIR + fileName;
				if (!fs.existsSync(RESULT_OUTPUT_DIR)) {
					fs.mkdirSync(RESULT_OUTPUT_DIR);
				}

				fs.writeFile(path, JSON.stringify(gcsImgList), 'utf8', () => {
					console.log(`\nwrited to ${fileName} in ${Math.round((now() - t0) / 1000) + ' seconds'}`);
				});
			}
		});
	} catch (err) {
		console.error(err.message);
	}
}


/**
 * The code below is for inserting image data to database
 */

async function _getUploadedImageId() {
	const dbImgList = await getDatabaseProductImage();
	const matchedIdList = dbImgList.map(img => {
		return {
			id: img.MediaID,
			imgName: img.src.split('/').pop().split('?')[0]
		}
	});
	await _bulkUpdateProductMedia(matchedIdList, 100);
}

async function _bulkUpdateProductMedia(file, row_per_trans) {
	const data_len = file.length;
	const loop_count = Math.ceil(data_len / row_per_trans);
	let total_spent_time = 0;
	let total_unchanged = 0;
	let total_processed = 0;

	console.log(`\nStarting to update ${data_len} items to database...\n`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * row_per_trans;
		let end = start + row_per_trans > data_len ? data_len : start + row_per_trans;

		const t0 = now();

		let result = await Model.sequelize.transaction( async t => {
			const promises = [];
			for (let j = start; j < end; j += 1) {
				let obj = file[j];
				let newPromise = Model.ProductMedia.update({
						miniPic: 'https://storage.googleapis.com/huedeck/img/256/' + obj.imgName
					}, {
						where: {
							MediaID: obj.id,
							src: {
								[Op.like]: '%' + obj.imgName + '%'
							}
						},

						transaction: t
					}).then(res => res[0]);

				promises.push(newPromise);
			};
			return await Promise.all(promises);
		}).then( processed => {
			return processed;
		}).catch(err => {
			console.error(err);
			return false;
		});

		if (result) {
			const unchangedNum = await result.filter(num => {return num === 0}).length;
			const processedNum = result.length;
			const spent = Math.round((now() - t0));

			total_spent_time += spent;
			total_unchanged += unchangedNum;
			total_processed += processedNum;

			console.log(`Processed ${processedNum} items in ${spent/1000} seconds (${unchangedNum} unchanged)`);
		} else {
			return false;
		}
	}

	const conslu = {
		"Total processed": total_processed,
		"Total unchanged": total_unchanged,
		"Total spent": (total_spent_time/1000) + ' seconds'
	}

	console.log('\nDONE =>', conslu);
	return true;
}


module.exports = {
	compressImageToGcStore,
};