"use strict";
// const axios = require("axios");
const {to} = require("../../utils/globalFunctions");
const Model = require("../../models/");

async function getDatabaseProductCount() {
	let [err, count] = await to(Model.Product.count());
	if (err) throw new Error(err);
	return count;
}

module.exports = {
	getDatabaseProductCount
}