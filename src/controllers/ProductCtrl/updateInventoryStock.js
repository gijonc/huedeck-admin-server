"use strict";

const now = require("performance-now");
const fs = require("fs");
const path = require("path");
const formidable = require("formidable");
const csvtojson = require("csvtojson");
const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const shopifyApi = require("../shopify");
// const Sequelize = require("sequelize");
const {wait} = require("../utils");

const CSV_PATH = path.join(__dirname, '../../tmp/csv/');
const JSON_PATH = path.join(__dirname, '../../tmp/json/');
const ORIGIN_JSON_FILE = 'origin_data.json';
const FILTERED_JSON_FILE = 'filtered_data.json';

// convert input csv file to json file
async function _csvToJson (csvFilePath) {
	let jsonList = [];
	try {
		jsonList = await csvtojson().fromFile(csvFilePath)
			.subscribe((json) => {
				// filter out unuseful data and trim
				Object.keys(json).forEach(key => {
					if (key === "sku") {
						json.sku = json.sku.trim().toLowerCase();
					} else if (key === "inventoryQty") {
						json.inventoryQty = parseInt(json.inventoryQty.replace(/,/g, ''), 10);
					} else if (key === "price") {
						json.price = parseFloat(json.price.replace(/[\$,]/g, ''), 10).toFixed(2);
					} else if (key === "msrpPrice") {
						json.msrpPrice = parseFloat((json.msrpPrice).replace(/[\$,]/g, ''), 10).toFixed(2);
					} else {
						delete json[key];
					}
				});
			});
	} catch (err) {
		throw new Error(err);
	}
	
	if (!jsonList.length) {
		throw new Error("failed to convert csv to json");
	} 
	return jsonList;
}

const getUploadFile = async function(req, res) {
	res.setHeader("Content-Type", "application/json");

	// create file path
	if (!fs.existsSync(CSV_PATH)) fs.mkdirSync(CSV_PATH);
	if (!fs.existsSync(JSON_PATH)) fs.mkdirSync(JSON_PATH);

	// read input file
	const form = new formidable.IncomingForm();

	form.on('error', err => {
		return ReE(res, err);
	}).on('fileBegin', function (name, file) {
		//rename the incoming file to the file's name
		file.path = CSV_PATH + file.name;
	}).on('end', async () => {
		try {
			const csvFile = info.openedFiles[0];

			// get name before extension (.csv)
			const rawJsonData = await _csvToJson(csvFile.path);
			fs.writeFileSync(JSON_PATH + ORIGIN_JSON_FILE, JSON.stringify(rawJsonData), 'utf8', err => {
				if (err) throw new Error(err.message);
			});

			const filteredJsonData = await filterUpdateData(rawJsonData);

			// remove csv file
			fs.unlink(csvFile.path, function (err) {
				if (err) throw err;
			});

			return ReS(res, {
				totalRowCnt: rawJsonData.length,
				availableEntryCnt: filteredJsonData.length,
				name: csvFile.name.split('.')[0]
			});

		} catch (err) {
			return ReE(res, err);
		}
	})

	// put this at the end
	const info = await form.parse(req);
}

const sortbySku = function(a,b) {
	if(a.sku < b.sku) { return -1; }
	if(a.sku > b.sku) { return 1; }
	return 0;
}

async function filterUpdateData(preFilterData) {
	const preFilterDataSkuList = preFilterData.map(obj => {
		return obj.sku.toLowerCase()	// NOT necessary, but better to keep sku in lower case
	});

	const contentKeys = Object.keys(preFilterData[0]);
	contentKeys.splice(contentKeys.indexOf('sku'), 1);

	// get related item from database
	const [dbFetchErr, filteredList] = await to(Model.Inventory.findAll({
		raw: true,
		attributes: contentKeys.concat(['sku', 'VariantID', 'totalSoldQty', 'ProductID']),
		where: {	sku: preFilterDataSkuList }
	}).then(result => {
		const hashList = {};
		for (let i = 0, len = result.length; i < len; i += 1) {
			hashList[result[i].sku.toLowerCase()] = result[i];
		}
		return hashList;
	}));

	if (dbFetchErr) {
		throw new Error(dbFetchErr);
	}

	const previewList = [];

	for (let i = 0, len = preFilterData.length; i < len; i += 1) {
		const itemToUpdate = preFilterData[i];
		const itemInDb = filteredList[itemToUpdate.sku];
		if (itemInDb) {
			// create preview row, DO NOT CHANGE KEY NAME of the row!!!
			const row = {};
			row['sku'] = itemInDb.sku.toUpperCase();	// for reading
			row['VariantID'] = itemInDb.VariantID,

			contentKeys.forEach(name => {
				row['old_' + name] = itemInDb[name];
				row['new_' + name] = itemToUpdate[name];

				// determine any updated data
				if (!row["get_updated"] && Number(itemInDb[name]) !== Number(itemToUpdate[name])) {
					row["get_updated"] = true;
				} 
			});

			// put this to the last
			row['totalSoldQty'] = itemInDb.totalSoldQty;
			row['ProductID'] = itemInDb.ProductID,
			previewList.push(row);
		} 
	}

	await previewList.sort(sortbySku);

	fs.writeFileSync(JSON_PATH + FILTERED_JSON_FILE, JSON.stringify(previewList), 'utf8', err => {
		if (err) throw new Error(err.message);
	});

	return previewList;
}

const previewPreUpdateData = async function (req, res) {
	res.setHeader("Content-Type", "application/json");

	const rawFile = fs.readFileSync(JSON_PATH + FILTERED_JSON_FILE, 'utf8', err => {
		if (err) return ReE(res, err);
	});
	const preUpdateList = await JSON.parse(rawFile);

	return ReS(res, { preUpdateList });
}


const bulkUpdate = async function (req, res) {
	let waitTime = 1000;	// 1 seconds
	// monitor shopify api calls
	shopifyApi.on('callLimits', async limits => {
		global.SHOPIFY_UPDATE_COUNTER = limits.current;
		if (limits.current > 30) {
			// console.log(limits);
		}
	});
	
	const t0 = now();

	res.setHeader("Content-Type", "application/json");
	const {fileName} = req.body;

	const updateContent = [];
	const failedList = [];
	const successList = [];

	const rawJsonData = await JSON.parse(fs.readFileSync(JSON_PATH + FILTERED_JSON_FILE, 'utf8', err => {
		if (err) return ReE(res, err);
	}));

	for (let i = 0, len = rawJsonData.length; i < len; i += 1) {
		if (rawJsonData[i].get_updated) updateContent.push(rawJsonData[i]);
	}

	const data_len = updateContent.length;

	// number of item to process at a time
	const concurrent_load = 5;
	const loop_count = Math.ceil(data_len / concurrent_load);
	let filteredCount = 0;
	let expectedToUpdate = 0;

	console.log(`starting to update ${data_len} of ${updateContent.length} items... `)

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			if (updateContent[j].get_updated) {
				expectedToUpdate += 1;
				const updateResult = updateProduct(updateContent[j])
				promises.push(updateResult);
			}
		}

		const updateRes = await Promise.all(promises);

		if (updateRes.length) {
			for (let k = 0, len = updateRes.length; k < len; k += 1) {
				let udres = updateRes[k];
				if (udres.success === true) {
					successList.push(udres)
				} else if (udres.success === false) {
					failedList.push(udres)
				} else {
					filteredCount += 1
				}
			}

			if (end % 50 === 0) {
				const spent = Math.round((now() - t0) / 1000);
				console.log(`processed ${end} items in ${spent} seconds (unchanged: ${filteredCount})`);
			}

			// set wait time to limit stream speed

			if (global.SHOPIFY_UPDATE_COUNTER >= 36) {
				// console.log('waiting for 10 seconds...');
				await wait(10000);
			} 
			else if (global.SHOPIFY_UPDATE_COUNTER > 30) {
				// console.log('current > 30, increase wait time by 100ms');
				waitTime += 100;
			} else {
				if (waitTime > 500) waitTime -= 20;
			}
			
			await wait(waitTime);
		}
	}

	if (failedList.length) {
		const dir = JSON_PATH + 'failed/';
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}
		fs.writeFile(dir + fileName + '.json', JSON.stringify(failedList), 'utf8', err => {
			if (err) return ReE(res, err);
		});
	}

	const originDataFile = fs.readFileSync(JSON_PATH + ORIGIN_JSON_FILE, 'utf8', err => {
		if (err) return ReE(res, err);
	});
	const originData = await JSON.parse(originDataFile);
	await filterUpdateData(originData);

	const totalSpentTime = Math.round((now() - t0) / 1000);

	const conclu = {
		expectedToUpdate,
		filtered: filteredCount,
		failed: failedList.length,
		successed: successList.length,
		spentTime: totalSpentTime
	};

	console.log("\nDONE  => ", conclu);
	return ReS(res, conclu);
}

/**
 * api to update 1 product varaint
 */

async function updateProduct({sku, VariantID, ...metaContent}) {
	const spfMeta = {};
	const dbMeta = {};

	if (Object.prototype.hasOwnProperty.call(metaContent, "old_inventoryQty") && Object.prototype.hasOwnProperty.call(metaContent, "new_inventoryQty")) {
		if (Number(metaContent.old_inventoryQty) !== Number(metaContent.new_inventoryQty)) {
			const newVal = metaContent.new_inventoryQty;
			spfMeta["inventory_quantity"] = newVal;
			dbMeta["inventoryQty"] = newVal;
    	}
   }

	if (Object.prototype.hasOwnProperty.call(metaContent, "old_price") && Object.prototype.hasOwnProperty.call(metaContent, "new_price")) {
		if (Number(metaContent.old_price) !== Number(metaContent.new_price)) {
			const newVal = metaContent.new_price;
			spfMeta["price"] = newVal;
			dbMeta["price"] = newVal;
		}
   }

	if (Object.prototype.hasOwnProperty.call(metaContent, "old_msrpPrice") && Object.prototype.hasOwnProperty.call(metaContent, "new_msrpPrice")) {
		if (Number(metaContent.old_msrpPrice) !== Number(metaContent.new_msrpPrice)) {
			const newVal = metaContent.new_msrpPrice;
			spfMeta["compare_at_price"] = newVal;
			dbMeta["msrpPrice"] = newVal;
		}
	}

	if (!Object.keys(spfMeta).length) {
		return { success: null }
	};

	// define seqeulize transaction
	const transaction = await Model.sequelize.transaction();

	try {
		// update to database
		const updated_db = await Model.Inventory.update(dbMeta, {
			where: { VariantID },
			transaction
		}).then(res => res[0]);

		if (updated_db) {
			// calling api to update shopify inventory item
			const updated_spf = await shopifyApi.productVariant.update(VariantID, spfMeta);
			if (updated_spf.id === VariantID) {
				await transaction.commit();
				return { success: true }
			} 
			throw new Error("Error on updating shopify");
			// await transaction.commit();
			// return { success: true }
		} else {
			throw new Error("Error on updating database")
		}
	} catch (err) {
		await transaction.rollback();
		
	}
}

module.exports = {
  getUploadFile,
  previewPreUpdateData,
	bulkUpdate
};