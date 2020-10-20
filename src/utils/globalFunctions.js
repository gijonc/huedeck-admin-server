"use strict";

const pe = require("parse-error");

module.exports = {
	to: (promise) => {
		//global function that will help use handle promise rejections, this article talks about it http://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
		return promise
			.then((data) => {
				return [null, data];
			})
			.catch((err) => [pe(err)]);
	},

	// thorw Error
	TE: (err_message, log) => {
		// TE stands for Throw Error
		if (log === true) {
			console.error(err_message);
		}
		throw new Error(err_message);
	},

	// return error
	ReE: (res, err, code) => {
		// Error Web Response
		let key = "internal";
		let message = "Internal error";
		if (typeof err === "object" && typeof err.message !== "undefined") {
			message = err.message;

			if (err.key) key = err.key;
		}
		if (typeof code !== "undefined") res.statusCode = code || 501;
		return res.json({ success: false, key, message });
	},

	// return success
	ReS: (res, data, code) => {
		// Success Web Response
		let resData = { success: true };

		if (typeof data === "object") {
			resData = Object.assign(data, resData); // merge the objects
		}
		if (typeof code !== "undefined") res.statusCode = code || 200;
		return res.json(resData);
	},
};

