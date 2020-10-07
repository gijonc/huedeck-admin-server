"use strict";

const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require("../../utils/globalFunctions");
const shopifyApi = require("../shopify");
const Model = require("../../models");
const {wait} = require("../utils");
const csvtojson = require("csvtojson");

const SRC_PATH = "C:/Users/jinka/OneDrive/Projects/git/hue-tools/20181130_updated_surya_id.txt";
var writeStream = fs.createWriteStream(SRC_PATH, {flags:'a', defaultEncoding: 'utf8'});
const readStream = fs.createReadStream(SRC_PATH, {encoding: 'utf8'});
var updatedItem = '';

async function _csvToJson (csvFilePath) {
	let jsonList = [];
	try {
		jsonList = await csvtojson().fromFile(csvFilePath)
			.subscribe((json) => {

				// filter out unuseful data and trim
				Object.keys(json).forEach(key => {
					if (key === "sku") {
						json.sku = json.sku.trim().toLowerCase();
					} else if (key === "VariantID") {
						// json.VariantID = json.VariantID;
					} else if (key === "shopifyWeight") {
						json.shopifyWeight = parseFloat(json.shopifyWeight.replace(/,/g, '')).toFixed(1);
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

function _filterShippingData(data) {
	const output = Object.assign({}, data);
	let shippingWeightLbTotal = 0;

	const {size} = output;
	for (let i = 0, len = size.length; i < len; i += 1) {
		Object.keys(size[i]).forEach(key => {

			// handle invalid data
			if (!size[i][key] || size[i][key] === "" || size[i][key] === "NaN") {
				if (key === 'packageIndex') {
					size[i][key] = 1;
				} else {
					size[i][key] = null;
				}
			} else {
				if (key === 'shippingWeightLb') {
					shippingWeightLbTotal += Number(size[i][key]);
				}
			}
		});
	}
	// if total === 0; set weightTotalLb to null
	output.weightTotalLb = shippingWeightLbTotal || null;

	Object.keys(output).forEach(key => {
		if (!output[key] || output[key] === "" || output[key] === "NaN") {
			output[key] = null;
		}
	});

	return output;
}

async function creatDatabaseShippingInfo(json) {
	const threshold = 100;
	const data_len = json.length;
	const loop_count = Math.ceil(data_len / threshold);

	const shippingTableCount_before = await Model.InventoryShipping.count();
	const shippingSizeTableCount_before = await Model.ShippingSize.count();
	const t0 = now();

	console.log(`Starting to insert ${data_len} products to database...\n`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * threshold;
		let end = start + threshold > data_len ? data_len : start + threshold;

		const result = await Model.sequelize.transaction(t => {
			const promises = [];
			for (let j = start; j < end; j += 1) {
				const inputData = _filterShippingData(json[j].shipping);

				const prom = Model.InventoryShipping.create(
					inputData, {
						include: [{
							model: Model.ShippingSize,
							required: true,
							as: 'size',
						}],
						transaction: t
					}
				);
				promises.push(prom);
			};
			return Promise.all(promises);

		}).then(() => {
			return Math.round((now() - t0) / 1000);
		}).catch(err => {
			console.error(err);
			return false;
		});

		if (result !== false) {
			console.log(`successfully inserted ${start} - ${end} items in ${result} seconds`);
		} else {
			return false;
		}
	}

	const shippingTableCount_after = await Model.InventoryShipping.count();
	const shippingSizeTableCount_after = await Model.ShippingSize.count();

	console.log(`\nDONE with inserting ${data_len} items!`);
	console.log(`Table InventoryShipping count (before : after) => ${shippingTableCount_before} : ${shippingTableCount_after}`);
	console.log(`Table ShippingSize count (before : after) => ${shippingSizeTableCount_before} : ${shippingSizeTableCount_after}\n`);

	return true;
}

async function updateDatabaseShippingInfo(json) {
	const threshold = 100;
	const data_len = json.length;
	const loop_count = Math.ceil(data_len / threshold);

	const shippingTableCount_before = await Model.InventoryShipping.count();
	const shippingSizeTableCount_before = await Model.ShippingSize.count();
	const t0 = now();

	console.log(`Starting to insert ${data_len} products to database...\n`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * threshold;
		let end = start + threshold > data_len ? data_len : start + threshold;

		const result = await Model.sequelize.transaction(t => {
			const promises = [];
			for (let j = start; j < end; j += 1) {
				const inputData = _filterShippingData(json[j].shipping);

				const prom = Model.InventoryShipping.update(
					{shopifyWeight: inputData.shopifyWeight}, {
						where: {
							VariantID: inputData['VariantID'],
						},
						transaction: t
					}
				);
				promises.push(prom);
			};
			return Promise.all(promises);

		}).then(() => {
			return Math.round((now() - t0) / 1000);
		}).catch(err => {
			console.error(err);
			return false;
		});

		if (result !== false) {
			console.log(`successfully inserted ${start} - ${end} items in ${result} seconds`);
		} else {
			return false;
		}
	}

	const shippingTableCount_after = await Model.InventoryShipping.count();
	const shippingSizeTableCount_after = await Model.ShippingSize.count();

	console.log(`\nDONE with inserting ${data_len} items!`);
	console.log(`Table InventoryShipping count (before : after) => ${shippingTableCount_before} : ${shippingTableCount_after}`);
	console.log(`Table ShippingSize count (before : after) => ${shippingSizeTableCount_before} : ${shippingSizeTableCount_after}\n`);

	return true;
}

async function updateDatabaseInventory(json) {
	const threshold = 100;
	const data_len = json.length;
	const loop_count = Math.ceil(data_len / threshold);

	// const shippingTableCount_before = await Model.InventoryShipping.count();
	// const shippingSizeTableCount_before = await Model.ShippingSize.count();
	const t0 = now();

	console.log(`Starting to insert ${data_len} products to database...\n`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * threshold;
		let end = start + threshold > data_len ? data_len : start + threshold;

		const result = await Model.sequelize.transaction(t => {
			const promises = [];
			for (let j = start; j < end; j += 1) {
				const inputData = json[j];
				const prom = Model.Inventory.update(
					inputData, {
						where: {
							VariantID: inputData['VariantID'],
						},
						transaction: t
					}
				).then(
					rest => {
						if (rest[0] === 1) {
							Model.InventoryShipping.update(
								{shopifyWeight: inputData.shopifyWeight}, {
									where: {
										VariantID: inputData['VariantID'],
									},
									transaction: t
								}
							);
						}
					}
				);
				promises.push(prom);
			};
			return Promise.all(promises);

		}).then(() => {
			return Math.round((now() - t0) / 1000);
		}).catch(err => {
			console.error(err);
			return false;
		});

		if (result !== false) {
			console.log(`successfully inserted ${start} - ${end} items in ${result} seconds`);
		} else {
			return false;
		}
	}

	// const shippingTableCount_after = await Model.InventoryShipping.count();
	// const shippingSizeTableCount_after = await Model.ShippingSize.count();

	console.log(`\nDONE with inserting ${data_len} items!`);
	// console.log(`Table InventoryShipping count (before : after) => ${shippingTableCount_before} : ${shippingTableCount_after}`);
	// console.log(`Table ShippingSize count (before : after) => ${shippingSizeTableCount_before} : ${shippingSizeTableCount_after}\n`);

	return true;
}

async function updateToShopify(json) {
	let waitTime = 1000;	// 1 seconds
	const threshold = 5;	// 5 threads per second
	
	const data_len = json.length;
	const loop_count = Math.ceil(data_len / threshold);
	const t0 = now();

	let totalSpent = 0;
	let inValidCount = 0;
	let successedCount = 0;
	let failedCount = 0;
	// const failedList = [];
	console.log(`\nStarting to update ${data_len} items to shopify...\n`);

	// monitor shopify api calls
	shopifyApi.on('callLimits', async limits => {
		global.SHOPIFY_UPDATE_COUNTER = limits.current;
		if (limits.current > 30) {
			// console.log(limits);
		}
	});

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * threshold;
		let end = start + threshold > data_len ? data_len : start + threshold;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const inputData = json[j];
			// console.log(json[j].VariantID);
			if (updatedItem.includes(json[j].VariantID)) {
				// console.log("Skip")
				continue;
			}
			/* Here we consolidate the data to be updated on Shopify.
				Feel free to add other corresponding fields here if they are in same Shopify Admin API.	*/
			var updateData = {};
			if (Object.prototype.hasOwnProperty.call(inputData, 'shopifyWeight')) {
				updateData['weight'] = inputData.shopifyWeight;
				updateData['weight_unit'] = 'lb';
			}
			if (Object.prototype.hasOwnProperty.call(inputData, 'inventoryQty')) {
				updateData['inventory_quantity'] = inputData.inventoryQty;
			}
			if (Object.prototype.hasOwnProperty.call(inputData, 'price')) {
				updateData['price'] = inputData.price;
			}
			if (Object.prototype.hasOwnProperty.call(inputData, 'msrpPrice')) {
				updateData['compare_at_price'] = inputData.msrpPrice;
			}
			if (updateData) {
				try {
					const prom = shopifyApi.productVariant.update(inputData.VariantID, updateData);
					promises.push(prom);
				} catch (err) {
					console.log('shopifyApi', err.message);
					await wait(10000);
				}
			} else {
				inValidCount += 1;
			}
		}

		const res = await Promise.all(promises);

		for (let k = 0, len = res.length; k < len; k += 1) {
			if (res[k].id) {
				writeStream.write(res[k].id + ";");
				updatedItem = updatedItem + (res[k].id + ";");
				successedCount += 1;
			} else {
				failedCount += 1;
			}
		}

		if (end % 10 === 0) {
			const sec = Math.round((now() - t0) / 1000);
			console.log(`\nProcessed ${end} items in ${sec} seconds`);
			console.log(`Successed count => ${successedCount}`);
			console.log(`Failed count => ${failedCount}`);
			console.log(`Invalid item count => ${inValidCount}`);
			totalSpent = sec;
		}

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
		
		// await wait(waitTime); // wait for 1 seconds for every 2 calls, refer to https://help.shopify.com/en/api/getting-started/api-call-limit
	}

	console.log(`\nDONE with processing ${data_len} items in ${totalSpent} seconds!\n`);
	console.log(`Successed count => ${successedCount}`);
	console.log(`Failed count => ${failedCount}`);
	console.log(`Invalid item count => ${inValidCount}`);
}


const bulkCreate = async (req, res) => {
	res.setHeader("Content-Type", "application/json");

	// get json source data
	const { file_name } = req.body;
	console.log(`\nreading data from => ${file_name}...`);
	const path = '/Users/Gijoncheng/localServer/huedeck/data-handle/deploy/database/20181107_shipping_updates/';
	const raw_file = fs.readFileSync(path + file_name + '.json', 'utf8', err => {
		if (err) return ReE(res, err);
	});
	const data = JSON.parse(raw_file);

	// extract shipping data from product info
	const variants = [];
	for (let i = 0, len = data.length; i < len; i += 1) {
		variants.push(...data[i].variants);
	}

	const result = await updateToShopify(variants);


	return ReS(res, result);

};

const bulkUpdate = async (req, res) => {
	res.setHeader("Content-Type", "application/json");

	// get json source data
	const { file_name } = req.body;
	console.log(`\nreading data from => ${file_name}...`);
	const path = 'C:/Users/jinka/OneDrive/Projects/git/hue-tools/deploy/database/20181113_inventory_pricing_updates/';
	var dataInJson = await _csvToJson(path + file_name + ".csv");

	/* For use when we input a json file instead of a csv.	*/
	// const raw_file = fs.readFileSync(path + file_name + '.json', 'utf8', err => {
	// 	if (err) return ReE(res, err);
	// });
	// const data = JSON.parse(raw_file);
	// extract shipping data from product info
	// const variants = [];
	// for (let i = 0, len = data.length; i < len; i += 1) {
	// 	variants.push(...data[i].variants);
	// }

	/* For use when we need to update Database.	*/
	// const result = await updateDatabaseInventory(dataInJson);

	/* For use when we need to update Shopify.	*/
	/* We read the updatedItem data that we saved before, so we will skip those updated items for Shopify calls. */
	readStream.on('data', function(chunk) {
		updatedItem += chunk;
	}).on('end', function() {
		// console.log("updatedItem");
	})
	const result = await updateToShopify(dataInJson);
	return ReS(res, result);
};


module.exports = {
	bulkCreate,
	bulkUpdate
};