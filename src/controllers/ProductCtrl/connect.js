"use strict";

const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const CONFIG = require("../../config");

const connect = async function(req, res) {
	res.setHeader(
		"Content-Type", "application/json",
		"Connection", "keep-alive"
	);

	const ProductCnt = Model.Product.count();
	const InventoryCnt = Model.Inventory.count();

	const promises = await Promise.all([
		ProductCnt, InventoryCnt
	]);

	const stats = {
		server: CONFIG.self,
		db: {
			host: CONFIG.db_host + ':' + CONFIG.db_port
		},
		product: {
			productTbCnt: promises[0],
			InventoryTbCnt: promises[1],
		}
	}

	return ReS(res, stats);
}


module.exports = connect;