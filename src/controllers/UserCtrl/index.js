"use strict";

const axios = require("axios");
const now = require("performance-now");
const Op = require("sequelize").Op;

const GF = require("../../utils/globalFunctions");
const User = require("../../models/").hue_user_account;
const authService = require('../../services/AuthService');


const create = async (req, res) => {
	res.setHeader("Content-Type", "application/json");
	const body = req.body;
	// check empty input
	if (!body.userInput) {
		return GF.ReE(res, { message: 'Please enter an email or username to login.' });
	}

	const userInput = body.userInput;
	
	// TODO:
	// format and return any format error from raw input
	// return with error key
	if (!userInput.userName.trim() || !userInput.emailAddress.trim()) {
		return GF.ReE(res, { key:'uniqueKey', message: 'Please enter an email and username to register.'});
	} else if (!userInput.password) {
		return GF.ReE(res, { key: 'password', message: 'Please enter a password to register.' });
	} else {
		let err, authUser;
		// pre-save to db and check any error from saving to db
		[err, authUser] = await GF.to(authService.createUser(userInput));
		if (err) return GF.ReE(res, err, 422);

		// successfully created and saved to db!
		return GF.ReS(res, { token: authUser.getJWT(), user: authUser.toWeb() });
	}
};


const login = async (req, res) => {
	// res.setHeader("Content-Type", "application/json");
	const body = req.body;
	// check empty input
	if (!body.userInput) {
		return GF.ReE(res, { message: 'Please enter an email or username to login.' });
	}

	const userInput = body.userInput;

	if (!userInput.usernameOrEmail.trim()) {
		return GF.ReE(res, { key: 'uniqueKey', message: 'Please enter an email or username to login.' });
	} else if (!userInput.password) {
		return GF.ReE(res, { key: 'password', message: 'Please enter a password to login.' });
	} else {
		let err, authUser;

		[err, authUser] = await GF.to(authService.authUser(userInput));
		if (err) return GF.ReE(res, err, 422);

		return GF.ReS(res, { token: authUser.getJWT(), user: authUser.toWeb() });
	}
}

module.exports = { create, login };

