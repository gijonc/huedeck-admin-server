const axios = require("axios");
const {
	gcsBucketPath
} = require("../config");
const {
	createGcpBucket
} = require('./utils');

// creating data stream to upload to GCS bucket
const bucket = new createGcpBucket();

async function uploadImage(url, imgName, bucketPath) {
	try {
		const response = await axios({
			method: "GET",
			url, // request for resized image from shopify cdn
			responseType: "stream",
			timeout: 50000
		});

		// create GCS bucket streaming
		const blob = bucket.file(bucketPath + imgName);
		const blobStream = blob.createWriteStream({
			validation: 'md5',
			resumable: false,
			public: true,
			metadata: {
				contentType: response.headers['content-type'],
				contentLength: response.headers['content-length'],
			}
		});

		// transfering data from url to GCS
		response.data.pipe(blobStream);

		// get result from promise 
		return new Promise( resolve => {
			response.data.on('end', () => {
				resolve({
					success: true,
					inputUrl: url,
					imageUrl: gcsBucketPath + bucketPath + imgName,
					bytes: Number(response.headers['content-length']),
				});
			});

			response.data.on('error', err => {
				throw new Error(err);
			});
		});
	} catch (err) {
		return {
			error: err.message,
			url,
			imgName
		};
	}

}

module.exports = {
	uploadImage,
};