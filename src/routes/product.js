"use strict";

const router = require("express").Router();
const passport = require("passport");

// product route controller functions
const connect = require("../controllers/ProductCtrl/connect");
const updateInventoryStock = require('../controllers/ProductCtrl/updateInventoryStock');
const createProduct = require('../controllers/ProductCtrl/createProduct');
const updateProductInfo = require('../controllers/ProductCtrl/updateProductInfo');
const updateProductImage = require('../controllers/ProductCtrl/updateProductImage');
// const uploadImageToGcStore = require('../controllers/ProductCtrl/createGcpImage');

require('../middleware/passport')(passport);

router.get("/", function(req, res, next) {
  res.json({
    status: "success",
    route: "products",
  });
  next("error");
});


router.post("/connect", connect);

// create
router.post(
	"/create/bulkCreate", // this route is public
	// passport.authenticate("jwt", { session: false }),	
	createProduct.bulkCreate
); 

router.post(
	"/overwrite/upload", // this route is public
	// passport.authenticate("jwt", { session: false }),	
	createProduct.overwrite
);


// product update 
router.post(
	"/update/upload",
	updateInventoryStock.getUploadFile
);

router.post(
	"/update/preview",
	updateInventoryStock.previewPreUpdateData
);

router.post(
	"/update/bulkUpdate",
	updateInventoryStock.bulkUpdate
);

router.post(
	"/updateProduct/bulkUpdate",
	updateProductInfo.bulkUpdate
);

router.post(
	"/updateProduct/uploadImage",
	updateProductImage.uploadImage
);

// router.post(
// 	"/create/uploadImage",
// 	uploadImageToGcStore.uploadImageToGcStore
// );

module.exports = router;