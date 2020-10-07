"use strict";
// const axios = require("axios");
const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require("../../../utils/globalFunctions");
const Model = require("../../../models");

// CAUTION: this api is not fully tested!

/**
 * overwrite product database by json file 
 */

const overwrite = async (req, res) => {
	res.setHeader("Content-Type", "application/json");

	let totalSpent = 0;
	const {file_name} = req.body;
	const path = 'src/controllers/ProductCtrl/testData/';

	const raw_file = fs.readFileSync(path + file_name, 'utf8', data => {
		return data
	});
	const jsonData = JSON.parse(raw_file);
	const data_len = jsonData.length;

	console.log(`\nStarting to overwrite ${data_len} products...\n`)

	for (let i = 0; i < data_len; i += 1) {
		const t0 = now();
		const updated = {
			product: 0,
			inventory: 0,
			colors: 0,
			medias: 0,
			option: 0,
		};

		const { ProductID, variants, colors, medias, options } = jsonData[i];
		console.log(`updating product ID '${ProductID}'`);

		// update product 
		let [err, updatedPd] = await to(Model.Product.update(jsonData[i], {
			where: { ProductID }
		}));
		if (err) console.log("[ERROR from processing product] => ", err.message);
		if (updatedPd[0]) {
			updated.product += 1;
		}

		// update medias
		for (let i = 0, len = medias.length; i < len; i += 1) {
			const media = medias[i];
			let err, success;
			[err, success] = await to(Model.ProductMedia.findOne({
				where: {
					MediaID: media.MediaID
				}
			}).then(async found => {
				let res;
				if (found) {
					[err, res] = await to(Model.ProductMedia.update(media, {
						where: { MediaID: found.MediaID}
					}));
					if (res[0]) return true;
				} else {
					[err, res] = await to(Model.ProductMedia.create({
						...media,
						ProductID
					}));
					if (res) return true;
				}
			}));
			if (err) console.log("[ERROR from processing media] => ", err.message);
			if (success) updated.medias += 1;
		}
		
		// update variants
		for (let i = 0, len = variants.length; i < len; i += 1) {
			const variant = variants[i];
			let err, success;
			[err, success] = await to(Model.Inventory.findOne({
				where: {
					VariantID: variant.VariantID
				}
			}).then(async found => {
				let res;
				if (found) {
					[err, res] = await to(Model.Inventory.update(variant, {
						where: { VariantID: found.VariantID}
					}));
					if (res[0]) return true;
				} else {
					[err, res] = await to(Model.Inventory.create({
						...variant,
						ProductID
					}));
					if (res) return true;
				}

			}));
			if (err) console.log("[ERROR from processing variant] => ", err.message);
			if (success) updated.inventory += 1;
		}

		// update colors
		let updateColor;
		[err, updateColor] = await to(Model.ProductColor.destroy({
			where: {
				ProductID
			}
		}).then(async reseted => {
			if (reseted) {
				for (let i = 0, len = colors.length; i < len; i += 1) {
					const color = colors[i];
					let [err, success] = await to(Model.ProductColor.create({
						...color,
						ProductID
					}));
					if (err) console.log("[ERROR from processing color] => ", err.message);
					if (success) updated.colors += 1;
				}
			}
		}));


		// overwrite options
		let updateOptions;
		[err, updateOptions] = await to(Model.ProductOption.destroy({
			where: {
				ProductID
			}
		}).then(async reseted => {
			if (reseted) {
				for (let i = 0, len = options.length; i < len; i += 1) {
					const option = options[i];
					let [err, success] = await to(Model.ProductOption.create({
						...option,
						ProductID
					}, {
						include: {
							model: Model.OptionValue,
							required: true,
							as: 'values'
						}
					}));
					if (err) console.log("[ERROR from processing options] => ", err.message);
					if (success) updated.option += 1;
				}
			}
		}));

		let spentSec = Math.round((now() - t0));
		totalSpent += spentSec;

		console.log("updated => ", updated);
		console.log("spent => " + spentSec + 'ms\n');
	}

	console.log(`DONE! Overwrited ${data_len} products in ${totalSpent/1000} seconds\n`);

	const result = {
		spent: totalSpent + 'ms'
	};

	// response to API 
	return ReS(res, result);
}

module.exports = overwrite;
