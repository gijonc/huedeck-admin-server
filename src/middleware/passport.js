"use strict";

const JwtStrategy = require("passport-jwt").Strategy;
const ExtractJwt = require("passport-jwt").ExtractJwt;
const GF = require("../utils/globalFunctions");
const User = require("../models/").hue_user_account;
const CONFIG = require("../config");

module.exports = function(passport) {
	var opts = {};
	opts.jwtFromRequest = ExtractJwt.fromAuthHeaderAsBearerToken();
	opts.secretOrKey = CONFIG.jwt_encryption;

	passport.use(
		new JwtStrategy(opts, async function(jwt_payload, done) {
			let err, user;
			[err, user] = await GF.to(User.findById(jwt_payload.id));
			console.log(jwt_payload);
			if (err) return done(err, false);
			if (user) {
				return done(null, user);
			} else {
				return done(null, false);
			}
		})
	);
	
};
