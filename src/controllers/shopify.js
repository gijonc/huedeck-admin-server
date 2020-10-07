
const config = require("../config");
const Shopify = require("shopify-api-node");

const api = new Shopify({
	shopName: config.myShopify.domain,
	apiKey: config.myShopify.key,
	password: config.myShopify.secret,
	autoLimit: {
		calls: 5,
	},
	timeout: 100000
});

module.exports = api;
// export default api;