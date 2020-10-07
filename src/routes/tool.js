"use strict";

const router = require("express").Router();

const {compressImage} = require('../controllers/ToolCtrl/imageCompressor');

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "Tool",
  });
  next("error");
});

router.post(
	"/compress",
	compressImage
);

module.exports = router;