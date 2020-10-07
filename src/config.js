// uncomment below if you can .env setup

// create a .emv file and uncomment the following line to connect to remote database

// require("dotenv").config();	// uncomment to switch to gcp database

// const fs = require('fs');
const path = require('path');

module.exports = {
	self: {
		name: "admin-server",
		version: '0.0.1'
	},

	app: process.env.NODE_ENV || "dev",
	port: process.env.PORT || "9000",

	jwt_encryption: process.env.JWT_ENCRYPTION || "jwt_please_change",
	jwt_expiration: process.env.JWT_EXPIRATION || "60000",

	db_dialect: process.env.DB_DIALECT || "mysql",
	db_host: process.env.DB_HOST || "localhost",
	db_port: process.env.DB_PORT || "3306",
	db_name: process.env.DB_NAME || "dev",
	db_user: process.env.DB_USER || "root",
	db_password: process.env.DB_PASSWORD || "root",

	db_ssl: {
	    ca: process.env.DB_SSL_PATH ? fs.readFileSync(process.env.DB_SSL_PATH + 'server-ca.pem') : '',
	    key: process.env.DB_SSL_PATH ? fs.readFileSync(process.env.DB_SSL_PATH + 'client-key.pem') : '',
		cert: process.env.DB_SSL_PATH ? fs.readFileSync(process.env.DB_SSL_PATH + 'client-cert.pem') : '',
	},

	myShopify: {
		domain: '',
		key: '',
		secret: '',
	},

	gcsBucketPath: '',

	gcConfig: {
		projectId: '',
  		keyFilename: path.join(__dirname, 'gc_storage-credentials.json'),
	}

};
