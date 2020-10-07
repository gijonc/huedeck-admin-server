"use strict";

const router = require("express").Router();
const passport = require("passport");

// controllers 
const UserCtrl = require("../controllers/UserCtrl");

require('../middleware/passport')(passport);

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "user",
  });
  next("error");
});

// user API handle 
router.post(
	"/users/create",
	// passport.authenticate("jwt", { session: false }),
	UserCtrl.create
); 
router.post(
	"/users/login",
	// passport.authenticate("jwt", { session: false }),
	UserCtrl.login
); 

module.exports = router;