// this file is for first time to create the RoomScene Table


"use strict";

const now = require("performance-now");
const axios = require("axios");
const csvtojson = require("csvtojson");

const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const { gcsBucketPath } = require("../../config");
const {createGcpBucket, writeToJson} = require("../utils");

// temp files
const resultOutputDir = '/Users/Gijoncheng/Desktop/upload_result/';
// const resizedImgUrlPath = resultOutputDir + 'resizedImage.json';
// const originImgUrlPath = resultOutputDir + 'originImage.json';
// const validData = resultOutputDir + 'validData.json';

// const resizedJSON = require(resizedImgUrlPath);
// const originJSON = require(originImgUrlPath);
// const validJSON = require(validData);

const FOLDER_NAME = 'img/roomScene/';

/**
 * Helper functions
 */

function parseOriginImageUrl(url) {
	if (url.includes('resize/512x512/')) {
		return url.replace('resize/512x512/', '');
	} else if (url.includes('512x512/')) {
		const str = url.replace('512x512/', 'x');
		return str.replace('png', 'jpg');
	} 
	return false;
}

function getDatabaseProductIdByDesignName() {
	return Model.Product.findAll({
		raw: true,
		attributes: ['ProductID', 'designName'],
	}).then(pds => {
		const table = {};
		for (let i = 0; i < pds.length; i += 1) {
			const {designName, ProductID} = pds[i];
			table[designName] = ProductID;
		}
		return table;
	});
}

/**
 * csv file to json reader
 */

async function csvToJson (csvFilePath) {

	// get all product id that maps to the designName
	const pdIdOfDisignName = await getDatabaseProductIdByDesignName();

	try {
		const urls = [];
		const hash = {};
		const pdIdOfImage = {};
		await csvtojson().fromFile(csvFilePath)
			.subscribe( json => {

				// filter out unuseful data and trim
				Object.keys(json).forEach(key => {
					if (key === "imageUrl") {

						// filter out duplicate urls
						const urlStr = json[key];
						if (!hash[urlStr]) {
							hash[urlStr] = true;
							urls.push({type: '512', url: urlStr});
							urls.push({type: 'origin', url: parseOriginImageUrl(urlStr)});
						}
						
					} else if (key === "item") {
						const imgName = json.imageUrl.split('/').pop().split('.')[0];
						if (!pdIdOfImage[imgName]) {
							const designNameList = json[key].split(',');
							let pdIdList = [];
							for (let i = 0; i < designNameList.length; i += 1) {
								const dsn = designNameList[i];
								// filter out product that its designName does not exist
								if (pdIdOfDisignName[dsn]) {
									pdIdList.push(pdIdOfDisignName[dsn]);
								} 
							}

							if (pdIdList.length) {
								pdIdOfImage[imgName] = pdIdList;
							}
						}
					} else {
						delete json[key];
					}
				});
			});

		return {
			urls,
			pdIdOfImage,
		}
	} catch (err) {
		throw new Error(err);
	}
}


// bulk upload concurrently
async function upload(images) {
	const t0 = now();
	const data_len = images.length;
	const concurrent_load = 50;
	const loop_count = Math.ceil(data_len / concurrent_load);
	const failedList = [];
	let successCount = 0;
	let existCount = 0;
	let totalSpent = 0;

	console.log(`\nStarting to upload ${data_len} files...`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const prom = _uploadImg(images[j]);
			promises.push(prom);
		}

		// handle upload result 
		const results = await Promise.all(promises);
		if (results.length) {
			for (let j = 0, len = results.length; j < len; j += 1) {
				const result = results[j];
				if (result === true) {
					successCount += result
				} else if (result.exist) {
					existCount += 1;
				} else {
					failedList.push(result);
					console.error(result);
				}
			}
		}

		// print progress
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 1000);
			totalSpent += spent;
			console.log(`Processed ${start} ~ ${end} items in ${spent} seconds, successed: ${successCount}, exist: ${existCount}`);
		}
	}

	console.log({
		totalSpent,
		existCount,
		successCount,
		failedList
	});
}

// upload one image
async function _uploadImg(img) {

	const {url, type} = img;
	// specify output destination
	const imgName = url.split('/').pop();

	if (validJSON.indexOf(imgName.split('.')[0]) !== -1) return {exist: true};

	const gcpPath = '' + (type === '512' ? '512/' : '') + imgName;

	try {
		const response = await axios({
			method: "GET",
			url,
			responseType: "stream",
			timeout: 50000
		});

		// creating data stream to upload to GCS bucket
		const bucket = new createGcpBucket();

		// create GCS bucket streaming
		const blob = bucket.file(gcpPath);
		const blobStream = blob.createWriteStream({
			validation: false,
			resumable: false,
			public: true,
			metadata: {
				contentType: response.headers['content-type'],
				contentLength: response.headers['content-length'],
			}
		});

		// transfering data from url to GCS
		response.data.pipe(blobStream);

		// get promise 
		return new Promise((resolve, reject) => {
			response.data.on('end', async () => {
				resolve(true);
			});

			response.data.on('error', err => {
				throw new Error(err);
			});
		})
	} catch(err) {
		return {error: err.message, url};
	}
}

/**
 * get all images file from RoomScene folder
 */

async function readGcpRoomSceneFolder() {
	const t0 = now();
	const bucket = new createGcpBucket();

	const resizedImgFolderName = FOLDER_NAME + '512/';
	const resizedImages = [];
	const originImages = [];

	console.log(`reading from GCS bukcet <${bucket.name}/${FOLDER_NAME}> ...`);

	bucket.getFiles({}, (err, files) => {
		for (let i = 0, len = files.length; i < len; i += 1) {
			if (files[i].name && !files[i].name.endsWith('/')) {
				if (files[i].name.startsWith(resizedImgFolderName)) {
					resizedImages.push(files[i].name.split('/').pop());
				} else if (files[i].name.startsWith(FOLDER_NAME)) {
					originImages.push(files[i].name.split('/').pop());
				}
			}
		}

		try {
			writeToJson(resizedImages, resizedImgUrlPath);
			writeToJson(originImages, originImgUrlPath);
		} catch (e) {
			console.error(e.message);
		}

		console.log({
			resizedCount: resizedImages.length,
			originCount: originImages.length,
			spent: Math.round((now() - t0) / 1000) + ' seconds'
		});

		if (err) throw err.message;
	});
}

/*
 *	make sure both resized and original images are valid
 */
async function checkImgUrl(images) {

	async function validate(url) {
		try {
			const originImgUrl = parseOriginImageUrl(url);
			if (originImgUrl) {
				const resOfResizedImg = axios.get(url).then(r => r.status);
				const resOfOriginImg = axios.get(originImgUrl).then(r => r.status);
				const res = await Promise.all([resOfResizedImg, resOfOriginImg]);
				if (res[0] === 200 && res[0] === res[1]) {
					return {url}
				}
			}
			throw new Error('No origin image found')
		} catch (err) {
			return ({error: err.message, inputUrl: url})
		}
	}

	const t0 = now();
	const data_len = images.length;
	const concurrent_load = 10;
	const loop_count = Math.ceil(data_len / concurrent_load);
	const successList = [];
	const failedList = [];
	let totalSpent = 0;

	console.log(`\nStarting to validating ${data_len} files...`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const prom = validate(images[j]);
			promises.push(prom);
		}

		// handle upload result 
		const results = await Promise.all(promises);
		if (results.length) {
			for (let j = 0, len = results.length; j < len; j += 1) {
				const result = results[j];
				if (result.url) {
					successList.push(result.url);
				} else {
					failedList.push(result);
					console.error(result);
				}
			}
		}

		// print progress
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 1000);
			totalSpent += spent;
			console.log(`Processed ${start} ~ ${end} items in ${spent} seconds`);
		}
	}

	try {
		writeToJson(successList, resultOutputDir + 'validImagUrls.json');
	} catch (e) {
		console.error(e.message);
	}

	console.log({
		successCount,
		totalSpent,
		failed: failedList.length
	});
}


/**
 * Below is for inserting data to database
 */

async function insertDataToDb(pdIdOfImage) {

	// the id is generated based on the time of insertion and its index
	const time = new Date().getTime();
	const startId = await Model.RoomScene.count();

	resizedJSON.sort();
	originJSON.sort();
	const rLen = resizedJSON.length;
	const oLen = originJSON.length;

	if (rLen !== oLen) {
		console.error("Resized images' length NOT aligned with origin images' length!")
		return;
	}

	const dataSet = [];
	// process raw data for pre-insert data
	for (let i = 0; i < rLen; i += 1) {
		if (resizedJSON[i].split('.')[0] === originJSON[i].split('.')[0]) {
			const imgName = resizedJSON[i].split('.')[0];
			if (pdIdOfImage[imgName]) {
				const originImage = gcsBucketPath + FOLDER_NAME + originJSON[i];
				const resizedImage = gcsBucketPath + FOLDER_NAME + '512/' + resizedJSON[i];
				dataSet.push({
					id: String(startId + i) + String(time),
					originImage,
					resizedImage,
					productCount: pdIdOfImage[imgName].length,
					productIds: pdIdOfImage[imgName]
				});
			}
		}
	}

	bulkInsertRoomScene(dataSet);
	
}

async function insertRoomScene(data) {
	const {
		id,
		originImage,
		resizedImage,
		productCount,
		productIds
	} = data;
	try {
		const success = await Model.RoomScene.create({
			id,
			originImage,
			resizedImage,
			productCount
		}).then(createdRoomScene => {
			if (createdRoomScene.id === id) {
				const pdOfRoom = productIds.map(pid => {
					return {
						RoomSceneID: id,
						ProductID: pid
					}
				});
				return Model.RoomSceneProduct.bulkCreate(pdOfRoom).then(async () => {
					const createdRoomSceneProductLen = await Model.RoomSceneProduct.count({
						where: {
							RoomSceneID: id
						}
					});
					return createdRoomSceneProductLen === productIds.length;
				});
			}
			return false;
		});
		return {success};
	} catch(err) {
		return {
			error: err,
			imageUrl: resizedImage
		}
	}
}


async function bulkInsertRoomScene(dataSet) {
	const t0 = now();
	const data_len = dataSet.length;
	const concurrent_load = 100;
	const loop_count = Math.ceil(data_len / concurrent_load);
	const successList = [];
	const failedList = [];
	let totalSpent = 0;

	console.log(`starting to process ${data_len} items...`)

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = (start + concurrent_load > data_len) ? data_len : (start + concurrent_load);
		
		// create promises
		const promises = [];
		for (let j = start; j < end; j += 1) {
			const prom = insertRoomScene(dataSet[j]);
			promises.push(prom);
		}

		// handle promises results
		const results = await Promise.all(promises);
		for (let j = 0, len = results.length; j < len; j += 1) {
			const result = results[j];
			if (result.success) {
				successList.push(result);
			} else {
				// console.error(result);
				failedList.push(result);
			}
		}

		if (failedList.length) {
			writeToJson(failedList, resultOutputDir + 'failed.json');
		}

		// print progress when every job done
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 1000);
			totalSpent += spent;
			console.log(`${end} items processed in ${spent} seconds`);
		}
	}

	console.log("Done ==> \n");
	console.log({
		Total_processed: data_len,
		success_count: successList.length,
		failed_count: failedList.length,
		Total_spent: totalSpent
	});
}


function countAllPdOfImage(pds) {
	let cnt = 0;
	Object.keys(pds).forEach(img => {
		cnt += pds[img].length;
	});
	console.log("data:", cnt);
	Model.RoomSceneProduct.count().then(res => console.log("RoomSceneProduct:", res));
	Model.RoomScene.count().then(res => console.log("RoomScene:", res));
}

/**
 * Main API function
 */

async function uploadRoomSceneImage(req, res) {
	res.setHeader("Content-Type", "application/json");

	// const csvPath = '/Users/Gijoncheng/localServer/huedeck/data-handle/surya/styleshot_image_2019_03_11_16_31_19.csv';
	// const {pdIdOfImage} = await csvToJson(csvPath);

	// countAllPdOfImage(pdIdOfImage);
	
	// checkImgUrl(urls);
	// await upload(urls);
	readGcpRoomSceneFolder();

	// await insertDataToDb(pdIdOfImage);

	return ReS(res);
}


module.exports = {
	uploadRoomSceneImage,
};