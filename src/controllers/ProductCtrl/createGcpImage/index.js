const now = require("performance-now");
const fs = require("fs");
const {ReE, ReS, to} = require('../../../utils/globalFunctions');
const Model = require("../../../models");
const { Storage } = require("@google-cloud/storage");
const { Op } = require("sequelize");
const axios = require("axios");
const {wait} = require('../../utils');

var uploadedJson = require('C:/Users/jinka/OneDrive/Projects/git/hue-tools/image/gcsImgName.json');
var productsInJson = require('C:/Users/jinka/OneDrive/Projects/git/hue-tools/deploy/database/20181126_olliix_updates/20181126_olliix_products_data.json');

const gcBucket = function() {
	const projectId = 'x-victor-215617';
	const keyFilename = 'C:/Users/jinka/Google\ Drive/Huedeck/Develop/GCP/storage/x-victor-215617-d79b71dcb542.json';
	const bucketName = 'huedeck';

	const googleCloudStorage = new Storage({
		projectId,
		keyFilename,
	});
	const bucket = googleCloudStorage.bucket(bucketName);
	return bucket;
}

function _getResizedImgUrl(srcStr, size) {
	const suffix = '.' + srcStr.split('.').pop();
	const prefix = srcStr.substring(0, srcStr.indexOf(suffix));
	return prefix + `_${size}x${size}` + suffix;
}

async function _bulkUploadImgToGCS(img) {
	const url = img.src;

	// specify output destination
	const imgName = url.split('/').pop().split('?')[0];

	// check existed
	if (uploadedJson.files.indexOf(imgName) !== -1) {
		return {
			exist: true
		}
	}

	// requesting image data from url (shopify cdn)
	const response = await axios({
    method: "GET",
    url: _getResizedImgUrl(url, 256), // request for resized image from shopify cdn
    responseType: "stream",
    timeout: 50000
  });

	// creating data stream to upload to GCS bucket
	const bucket = new gcBucket();

	// create GCS bucket streaming
	const blob = bucket.file('img/256/' + imgName);
	const blobStream = blob.createWriteStream({
		validation: 'md5', 
		resumable: false,
		public: true,
		metadata: {
			contentType: response.headers['content-type']
		}
	});

	// transfering data from url to GCS
	response.data.pipe(blobStream);

	// get promise 
	return new Promise( (resolve, reject) => {
		response.data.on('end', async () => {
			// await wait(200);
			const gcPublicUrl = `https://storage.googleapis.com/huedeck/img/256/${imgName}`;
			resolve({
				url: gcPublicUrl,
				bytes: Number(response.headers['content-length']),
				id: img.MediaID
			});
		});

		response.data.on('error', err => {
			console.error(err);
			reject({error: err.message, img});
		});
	})
}

/* _compareList is for download the GCP stored image names */
async function _compareList() {
	const t0 = now();
	const bucket = new gcBucket();

	const folderName = "img/256/";
	console.log(`reading from GCS bukcet '${bucket.name}/${folderName}' =>`);

	bucket.getFiles({}, (err, files) => {

		const gcsImgList = [];
		for (let i = 0, len = files.length; i < len; i += 1) {
			if (files[i].name && files[i].name.startsWith(folderName) && !files[i].name.endsWith('/')) {
				gcsImgList.push(files[i].name.split('/').pop());
			}
		}
		console.log(`${gcsImgList.length} files found, writing to local =>`);
		// const diffList = dbImgList.diff(gcsImgList);
		// console.log('Differences: ', diffList);
		if (gcsImgList.length) {
			const resultOutputDir = 'C:/Users/jinka/OneDrive/Projects/git/hue-tools/image/';
			const fileName = 'gcsImgName.json';
			const path = resultOutputDir + fileName;
			if (!fs.existsSync(resultOutputDir)) {
				fs.mkdirSync(resultOutputDir);
			}

			fs.writeFile(path, JSON.stringify({files: gcsImgList}), 'utf8', err => {
				if (err) throw new Error(err);
				console.log(`\nwrited to ${fileName} in ${Math.round((now() - t0) / 1000) + ' seconds'}`);
			});
		}
	});
}

/* Set breakPointMediaID to the MediaID where it breaks the communication when needed. 	*/
var breakPointMediaID = '';

const uploadImageToGcStore = async function (req, res) {
	res.setHeader("Content-Type", "application/json");
  console.log("upload image to gcp");

  // _compareList();
  
  for (var index = 0; index < productsInJson.length; index += 1) {
    console.log(productsInJson.length - index - 1);
    for (var jndex = 0; jndex < productsInJson[index].medias.length; jndex += 1) {
			if (breakPointMediaID) {
				if (productsInJson[index].medias[jndex]['MediaID'] === breakPointMediaID) {
					breakPointMediaID = '';
				}
				else {
					continue;
				}
			}
			var result = await _bulkUploadImgToGCS(productsInJson[index].medias[jndex]);
			console.log(result);
    }
  }
	return ReS(res);
}

module.exports = {
  uploadImageToGcStore
}