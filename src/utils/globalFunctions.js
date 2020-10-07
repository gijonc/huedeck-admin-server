"use strict";

const pe = require("parse-error");

module.exports = {
	to: promise => {
		//global function that will help use handle promise rejections, this article talks about it http://blog.grossman.io/how-to-write-async-await-without-try-catch-blocks-in-javascript/
		return promise
			.then(data => {
				return [null, data];
			})
			.catch(err => [pe(err)]);
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
		let key = "";
		let msg = "";
		if (typeof err == "object" && typeof err.message != "undefined") {
			msg = err.message;

			if (err.key)
				key = err.key;
		}
		if (typeof code !== "undefined") res.statusCode = code;
		return res.json({ success: false, key: key, error: msg });
	},

	// return success
	ReS: (res, data, code) => {
		// Success Web Response
		let send_data = { success: true };

		if (typeof data == "object") {
			send_data = Object.assign(data, send_data); //merge the objects
		}
		if (typeof code !== "undefined") res.statusCode = code;
		return res.json(send_data);
	},

}

