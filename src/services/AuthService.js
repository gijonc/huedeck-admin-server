"use strict";

const validator = require('validator');

const GF = require("../utils/globalFunctions");
const User = require("../models/").hue_user_account;

const createUser = async userInput => {
	let uniqueKey = userInput.emailAddress;

	if (validator.isEmail(uniqueKey)) {
		let authUser, err, this_user;

		// create user to db
		[err, this_user] = await GF.to(User.create({
			first_name: userInput.firstName || "Hue Customer",
			last_name: userInput.lastName,
			user_name: userInput.userName,
			email: validator.normalizeEmail(uniqueKey),
			password_hash: userInput.password,
		}));
		if (err) GF.TE('This Email or username has already been taken, please use another one!');	// validation error
		// double check with new created user 
		[err, authUser] = await GF.to(User.findOne({
			where: { email: this_user.email } }
		));
		if (err) GF.TE(err.message, true);

		// successfully created
		return authUser;

	} else {
		GF.TE('A valid email was not entered.');
	}
}



const authUser = async userInput => {//returns token
	let auth_info = {};
	auth_info.status = 'login';

	let unique_key = userInput.usernameOrEmail.trim();

	let this_user, authUser, err;

	if (validator.isEmail(unique_key)) {
		unique_key = unique_key;
		auth_info.method = 'email';

		[err, this_user] = await GF.to(User.findOne({ where: { email: unique_key } }));
		if (err) GF.TE(err.message);

	} else {
		// using username
		[err, this_user] = await GF.to(User.findOne({ where: { user_name: unique_key } }));
		if (err) GF.TE(err.message);
	}
	if (!this_user) GF.TE('Username or email address is invlaid or doesn\'t exist.');

	[err, authUser] = await GF.to(this_user.checkPassword(userInput.password));
	if (err) GF.TE(err.message);

	return authUser;
}

module.exports = { createUser, authUser };
