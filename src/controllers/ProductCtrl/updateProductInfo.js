"use strict";
// const axios = require("axios");
const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const csvtojson = require("csvtojson");
const shopifyApi = require("../shopify");
// const Sequelize = require("sequelize");
const formidable = require("formidable");

const CSV_PATH = "C:/Users/jinka/OneDrive/Projects/git/hue-tools/deploy/database/20181113_inventory_pricing_updates/csv/";
const JSON_PATH = "C:/Users/jinka/OneDrive/Projects/git/hue-tools/deploy/database/20181113_inventory_pricing_updates/json/";

async function _csvToJson (csvFilePath) {
	let jsonList = [];
	try {
		jsonList = await csvtojson().fromFile(csvFilePath);
	} catch (err) {
		throw new Error(err);
	}
	
	if (!jsonList.length) {
		throw new Error("failed to convert csv to json");
	} 
	return jsonList;
}

/* Use UPDATE_SHOPIFY as a variable to decide if we need to update SHOPIFY.	*/
const UPDATE_SHOPIFY = true;

const bulkUpdate = async function (req, res) {
	res.setHeader("Content-Type", "application/json");
	const t0 = now()

	const {fileName} = req.body;

	let updateContent = [];
	const failedList = [];
	const successList = [];

	const csv_path = 'C:/Users/jinka/OneDrive/Projects/git/hue-tools/deploy/database/20181113_inventory_pricing_updates/';

	try {
		updateContent = await _csvToJson(csv_path + fileName + ".csv");
	} catch (err) {
		console.error(err.message);
	}
	// const updated = await _updateProduct(updateContent[0]);
	// console.log(updated);

	const data_len = updateContent.length;
	const concurrent_load = 2;
	const loop_count = Math.ceil(data_len / concurrent_load);

	console.log(`starting to update ${data_len} of ${updateContent.length} items...`);

	// create json result directory
	if (!fs.existsSync(JSON_PATH)) {
		fs.mkdirSync(JSON_PATH);
	}

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const updateResult = _updateProduct(updateContent[j]);
			promises.push(updateResult);
		}

		const updateRes = await Promise.all(promises);

		if (updateRes.length) {
			for (let k = 0, len = updateRes.length; k < len; k += 1) {
				let udres = updateRes[k];
				if (udres.success === true) {
					successList.push(udres.ProductID);
				} else if (udres.success === false) {
					failedList.push(udres);
				} 
			}

			if (start !== 0 && start % 100 === 0) {
				const spent = Math.round((now() - t0) / 1000);
				console.log(`processed ${end} items in ${spent} second`);
			}
		}
	}

	

	 // syncronized calls (no concurrency)
		// for (let i = 0; i < data_len; i += 1) {
		// 	let udres = await _updateProduct(updateContent[i]);
		// 	if (udres.success === true) {
		// 		successList.push(udres.ProductID);
		// 	} else if (udres.success === false) {
		// 		failedList.push(udres);
		// 	} 
		// 	if (i % 10 === 0) {
		// 		const spent = Math.round((now() - t0) / 1000);
		// 		console.log(`processed ${i} items in ${spent} second`);
		// 	}
		// }


	if (failedList.length) {
		const jsonName = 'failed_' + fileName.split('.')[0] + '.json';
		fs.writeFile(JSON_PATH + jsonName, JSON.stringify(failedList), 'utf8', err => {
			if (err) throw new Error(err);
		});
	}

	if (successList.length) {
		const jsonName = 'successed_' + fileName.split('.')[0] + '.json';
		fs.writeFile(JSON_PATH + jsonName, JSON.stringify(successList), 'utf8', err => {
			if (err) throw new Error(err);
		});
	}

	const totalSpentTime = Math.round((now() - t0) / 1000);

	const conclu = {
		readyToUpdate: data_len,
		failed: failedList.length,
		successed: successList.length,
		spentTime: totalSpentTime + ' seconds'
	};

	console.log("\nDONE  => ", conclu);
	
	return ReS(res, conclu);
}

/**
 * api to update 1 product varaint
 */

async function _updateProduct({ProductID, ...dbMeta}) {
	const spfMeta = {
		body_html: dbMeta['description']
	};

	// console.log(dbMeta)
	// return;
	if (dbMeta.display === 'TRUE') {
		dbMeta.display = true;
	} else if (dbMeta.display === 'FALSE') {
		dbMeta.display = false;
	}

	// define seqeulize transaction
	const transaction = await Model.sequelize.transaction();

	try {
		// update to database
		const updated_db = await Model.Product.update(dbMeta, {
			where: { ProductID },
			transaction
		}).then( res => {
			return res[0];
		});

		if (updated_db) {
			if (UPDATE_SHOPIFY) {
				// calling api to update shopify inventory item
				const updated_spf = await shopifyApi.product.update(ProductID, spfMeta);
				if (Number(updated_spf.id) === Number(ProductID)) {
					await transaction.commit();
					return {
						success: true,
						ProductID
					}
				} 
				throw new Error("Error on updating shopify");
			}
			else {
				await transaction.commit();
				return {
					success: true,
					ProductID
				}
			}
		} else {
			throw new Error("Error on updating database")
		}

	} catch (err) {
		console.log(err.message);
		await transaction.rollback();
		return {
			success: false,
			ProductID,
			error: err.message
		}
	}
}



module.exports = {
	bulkUpdate
};