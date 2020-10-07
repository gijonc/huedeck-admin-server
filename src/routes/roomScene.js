"use strict";

const router = require("express").Router();

const {uploadRoomSceneImage} = require('../controllers/RoomSceneCtrl/init');

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "Room Scene",
  });
  next("error");
});

// create
router.post(
	"/init", // this route is public
	uploadRoomSceneImage
);

// router.post(
// 	"/update/bulkUpdate", // this route is public
// 	shippingCtrl.bulkUpdate
// );

module.exports = router;