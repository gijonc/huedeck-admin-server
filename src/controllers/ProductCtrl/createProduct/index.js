"use strict";

const overwrite = require('./overwrite');

const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require("../../../utils/globalFunctions");
const Model = require("../../../models");

const {getDatabaseProductCount} = require('../productUtils');

async function _insertProduct(file, row_per_trans) {
	const old_cnt = await getDatabaseProductCount();
	const data_len = file.length;
	const loop_count = Math.ceil(data_len / row_per_trans);
	let total_spent_time = 0;

	console.log(`\nStarting to insert ${data_len} products to database...\n`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * row_per_trans;
		let end = start + row_per_trans > data_len ? data_len : start + row_per_trans;

		const t0 = now();

		let result = await Model.sequelize.transaction(t => {
			const promises = [];
			for (let j = start; j < end; j += 1) {
				let newPromise = Model.Product.create(
					file[j], {
						include: [{
							model: Model.ProductMedia,
							required: true,
							as: 'medias',
						}, {
							model: Model.ProductColor,
							required: true,
							as: 'colors'
						}, {
							model: Model.Inventory,
							required: true,
							as: 'variants',
							include: [{
								model: Model.InventoryShipping,
								required: true,
								as: 'shipping',
								include: [{
									model: Model.ShippingSize,
									required: true,
									as: 'size',
								}]
							}]
						}, {
							model: Model.ProductOption,
							required: true,
							as: 'options',
							include: {
								model: Model.OptionValue,
								required: true,
								as: 'values'
							}
						}],

						// passing to transaction for concurrent executions
						transaction: t
					}
				);
				promises.push(newPromise);
			};
			return Promise.all(promises);

		}).then(() => {
			let spent = Math.round((now() - t0) / 1000);
			return spent;
		}).catch(err => {
			// TODO: return valid errors
			console.error(err);
			return false;
		});

		if (result) {
			console.log(`successfully created ${start} - ${end} items in ${result} second`);

			total_spent_time += result;
			
		} else {
			return false;
		}
	}

	const new_cnt = await getDatabaseProductCount();
	if (new_cnt - old_cnt === data_len) {
		console.log(`\nDONE with inserting ${data_len} items in ${total_spent_time} seconds!`);
		console.log(`Total product count in database: ${new_cnt}\n`);
		return total_spent_time;
	}

	console.log('Failed');
	return false;
}


const bulkCreate = async (req, res) => {
	res.setHeader("Content-Type", "application/json");

	const { file_name } = req.body;
	const num_of_row_per_transaction = 1000;

	console.log(`\nreading data from ${file_name}...`);

	try {
		const path = '/Users/Gijoncheng/localServer/hue/data-handle/deploy/database/';
		
		const raw_file = fs.readFileSync(path + file_name, 'utf8', err => {
			if (err) {
				return ReE(res, err);
			}
		});

		const jsonData = JSON.parse(raw_file);
		const result = await _insertProduct(jsonData, num_of_row_per_transaction);
	
		return ReS(res, result);

	} catch (err) {
		console.log(err.message);
		return ReE(res, err);
	}
};


module.exports = {
	bulkCreate,
	overwrite
};