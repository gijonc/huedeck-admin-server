const { Storage } = require("@google-cloud/storage");
const fs = require("fs");

function wait(ms) {
	return new Promise(resolve => {
		setTimeout(resolve, ms)
	})
}

function bytesToSize(bytes) {
	if (bytes == 0) return '0 Byte';
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
	const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
	return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

function createGcpBucket() {
	const projectId = '';
	const keyFilename = '';
	const bucketName = '';

	const gcs = new Storage({
		projectId,
		keyFilename,
	});

	gcs.interceptors.push({
		request: reqOpts => {
			reqOpts.forever = true
			return reqOpts
		}
	});

	const bucket = gcs.bucket(bucketName);
	return bucket;
}


function writeToJson(data, path) {
	fs.writeFile(path, JSON.stringify(data), 'utf8', err => {
		if (err) throw new Error(err);
	});
}

module.exports = {
	wait,
	bytesToSize,
	createGcpBucket,
	writeToJson
};
