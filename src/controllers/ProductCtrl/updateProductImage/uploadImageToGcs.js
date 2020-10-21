"use strict";

const now = require("performance-now");
const gcsApi = require("../../gcStorage");
const { bytesToSize, wait } = require("../../utils");

function getResizedImageUri(url, size) {
	const suffix = "." + url.split(".").pop();
	const prefix = url.substring(0, url.indexOf(suffix));
	return prefix + `_${size}x${size}` + suffix;
}

/**
 * @param {string[]} imageUriList
 */

module.exports = async function upload(imageUriList) {
	const t0 = now();
	const dataLen = imageUriList.length;

	// define the number of promises to resolve concurrently (in a single batch)
	// recommended payload between 20 ~ 50
	const payload = 50;

	// how many batch of promises (how many times to loop over)
	const batchCount = Math.ceil(dataLen / payload);

	const successList = [];
	const failedList = [];

	console.log(`\nStarting to upload ${dataLen} images =>`);

	for (let i = 0; i < batchCount; i += 1) {
		let start = i * payload;

		// if end >= data length, use data length instead
		let end =
			(start + payload > dataLen) ? dataLen : (start + payload);

		// create promises from GCS upload api
		const promises = [];
		for (let j = start; j < end; j += 1) {
			const { src, miniPic } = imageUriList[j];
			const resizedUrl = getResizedImageUri(src, 256);
			const imgName = miniPic.split("/").pop();
			const prom = gcsApi.uploadImage(resizedUrl, imgName, "img/256/");
			promises.push(prom);
		}

		// handle promises results
		const resolvedPromises = await Promise.all(promises);
		for (let j = 0; j < resolvedPromises.length; j += 1) {
			const result = resolvedPromises[j];
			if (result.success) {
				successList.push(result);
			} else {
				console.error(result);
				failedList.push(result);
			}
		}

		// print progress after every batch of promise resolved
		if (end % payload === 0) {
			// print process
			const spent = Math.round((now() - t0) / 1000);
			console.log(`${end} items processed in ${spent} seconds, halting...`);
			await wait(1000);
		}
	}

	// calculate the total bytes got uploaded
	const totalBytes = successList.length
		? successList
				.map((item) => item.bytes)
				.reduce((prev, next) => prev + next)
		: 0;

	// return upload result
	return {
		"Total processed items": dataLen,
		"Total Uploaded": successList.length,
		"Failed": failedList,
		"Total spent": Math.round((now() - t0) / 1000) + " seconds",
		"Total uploaded size": bytesToSize(totalBytes),
	};
}