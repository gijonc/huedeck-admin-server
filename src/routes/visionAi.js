"use strict";

const router = require("express").Router();

const {findSimilarProduct, visionAiConfig} = require('../controllers/VisionAiCtrl/createProductSet');

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "vision-ai",
  });
  next("error");
});

router.post("/search", findSimilarProduct);

router.post("/config", visionAiConfig);

module.exports = router;