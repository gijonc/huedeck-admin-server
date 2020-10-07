"use strict";

const router = require("express").Router();
const passport = require("passport");

// const shippingCtrl = require('../controllers/InventoryCtrl/inventoryShipping');

require('../middleware/passport')(passport);

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "inventory",
  });
  next("error");
});

// create
// router.post(
// 	"/create/bulkCreate", // this route is public
// 	shippingCtrl.bulkCreate
// );

// router.post(
// 	"/update/bulkUpdate", // this route is public
// 	shippingCtrl.bulkUpdate
// );

module.exports = router;