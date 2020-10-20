"use strict";

const Model = require("../../../models");
const { ReS } = require('../../../utils/globalFunctions');
const uploadImageToGcStore = require("./uploadImageToGcs");

// product image  path in GCS
const EXISTED_IMAGES = require('../tmp/gcsImgName.json');

function getDatabaseProductImage() {
	return Model.ProductMedia.findAll({
		raw: true,
		attributes: ['MediaID', 'src', 'miniPic'],
		where: { mediaType: 'image' }
	});
}

// route 
const uploadImage = async function (req, res) {
	console.log("\nPreparing to upload image...");

	// retrieve all product image uri from database
	const imageURIs = await getDatabaseProductImage();

	// filter out images that are already exist 
	const imagesToUpload = await imageURIs.filter(obj => EXISTED_IMAGES.indexOf(obj.miniPic.split('/').pop()) === -1);
	const result = await uploadImageToGcStore(imagesToUpload);

	return ReS(res, { result });
}

module.exports = {
	uploadImage,
};