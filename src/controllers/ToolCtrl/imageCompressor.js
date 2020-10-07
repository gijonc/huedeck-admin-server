"use strict";

const now = require("performance-now");
const sharp = require('sharp');
const axios = require("axios");
const fs = require('fs');
const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const {
	createGcpBucket,
} = require('../utils');
const OUPTUT_PATH = '/Users/Gijoncheng/Desktop/coffee_table/';

Array.prototype.diff = function(a) {
    return this.filter(function(i) {return a.indexOf(i) < 0;});
};

function _calcSize(img, maxNum) {
	const {width, height} = img;

	if (width > maxNum && width >= height) {
		return {
			width: maxNum,
			height: Math.round(height * (maxNum / width))
		}
	} else if (height > maxNum && height > width) {
		return {
			width: Math.round(width * (maxNum / height)),
			height: maxNum,
		}
	} else {
		return {
			width,
			height
		}
	}
}

async function getAllImgFileNameInStorage() {
	const t0 = now();
	const bucket = new createGcpBucket();
	const BUCKET_FOLDER = 'img/product/origin/';
	console.log(`Reading from GC storage <${bucket.name}/${BUCKET_FOLDER}> ...`);

	try {
		bucket.getFiles({}, (err, files) => {
			if (err) throw new Error(err);

			const gcsImgList = [];
			for (let i = 0, len = files.length; i < len; i += 1) {
				if (files[i].name.startsWith(BUCKET_FOLDER) && !files[i].name.endsWith('/')) {
					gcsImgList.push(files[i].name.split('/').pop().replace(/\.[^/.]+$/, ''));
				}
			}
			console.log(`Finished ==> ${gcsImgList.length} files found, writing to local =>`);
			if (gcsImgList.length) {
				const RESULT_OUTPUT_DIR = '/Users/Gijoncheng/Desktop/';
				const fileName = 'gcsImgName.json';
				const path = RESULT_OUTPUT_DIR + fileName;
				
				fs.writeFile(path, JSON.stringify(gcsImgList), 'utf8', () => {
					console.log(`\nwrited to ${fileName} in ${Math.round((now() - t0) / 1000) + ' seconds'}`);
				});
			}
		});
	} catch (err) {
		console.error(err.message);
	}
}

async function compress(data, type, outputPath) {
	// const outputImageName = imgUrl.split('/').pop().replace(/\.[^/.]+$/, ".") + type;
	const outputImageName = data.id + '.jpg';
	try {
		const imgSrc = await axios.get(data.imgUrl, {
			responseType: 'arraybuffer'
		}).then(res => { return Buffer.from(res.data, 'base64') });

		const image = sharp(imgSrc);
		const metadata = await image.metadata();
		const resized = _calcSize(metadata, 512);
		return new Promise( resolve => {
			image
				.resize(resized.width, resized.height)
				// [type]()
				.toFile(outputPath + outputImageName)
				.then(() => {
					resolve(true)
				}).catch(err => {
					throw new Error(err);
				});
		});

	} catch (err) {
		console.error(err);
		return {
			error: err.message,
			name: data.imgUrl
		};
	}
}

async function bulkCompress(dataSet, type, outputPath) {
	const t0 = now();
	const data_len = dataSet.length;
	const concurrent_load = 50;
	const loop_count = Math.ceil(data_len / concurrent_load);
	const failedList = [];
	let successCount = 0;
	let totalSpent = 0;

	console.log(`starting to compress and download ${data_len} images...`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const prom = compress(dataSet[j], type, outputPath);
			promises.push(prom);
		}

		// handle upload result 
		const results = await Promise.all(promises);
		if (results.length) {
			for (let j = 0, len = results.length; j < len; j += 1) {
				const result = results[j];
				if (result === true) {
					successCount += result;
				} else {
					failedList.push(result);
				}
			}
		}

		// print progress
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 100);
			totalSpent += spent;
			console.log(`Processed ${start} ~ ${end} items in ${spent} seconds`);
		}
	}

	console.log({
		successCount,
		totalSpent,
		failed: failedList.length
	});
}

/**
 * Main API function
 */
async function checkDiff(list) {
	const file = await fs.readdirSync(OUPTUT_PATH);
	const existed = file.map(f => f.replace(/\.[^/.]+$/, ''));
	const expected = list.map(f => f.split('/').pop().replace(/\.[^/.]+$/, ''));

	existed.sort();
	expected.sort();

	const missed = [];
	for (let i = 0, len = expected.length; i < len; i += 1) {
		if (existed[i] !== expected[i]) {
			missed.push(expected[i]);
			console.log(existed[i], expected[i]);
		}
	}

	console.log(list.length, existed.length, missed.length);
}

/**
 * MAIN
 */

async function compressImage(req, res) {
	res.setHeader("Content-Type", "application/json");

	const allUrls = await Model.Product.findAll({
		raw: true,
		where: {
			category3: 'coffee tables'
		},
		attributes: ['image', 'ProductID']
	}).then(products => 
		products.map(obj => {
			return {
				id: obj.ProductID,
				imgUrl: 'https://storage.googleapis.com/huedeck/img/product/origin/' + obj.image.split('/').pop().replace(/\.[^/.]+$/, '.jpeg')
			}
		})
	);

	// allUrls.sort();

	// const duplicated = [];
	// for (let i = 0; i < allUrls.length - 1; i += 1) {
	// 	if (allUrls[i] === allUrls[i + 1]) duplicated.push(allUrls[i]);
	// }
	// console.log(duplicated);

	// fs.readFile('/Users/Gijoncheng/Desktop/gcsImgName.json', 'utf8', async (err, file) => {
	// 	if (err) throw err;
	// 	const data = JSON.parse(file);
	// 	const urls = allUrls.filter(val => data.indexOf(val.split('/').pop().replace(/\.[^/.]+$/, '')) < 0);
	// 	console.log(urls);
	// });


	// await getAllImgFileNameInStorage();

	// checkDiff(urls);
	await bulkCompress(allUrls, 'jpeg', OUPTUT_PATH);

	return ReS(res);
}


module.exports = {
	compressImage,
};