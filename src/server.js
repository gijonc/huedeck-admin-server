"use strict";

const express = require("express");
// const logger = require("morgan");
const bodyParser = require("body-parser");
// const passport = require("passport");
const http = require("http");
const debug = require("debug")("server:server");
const path = require('path');
const models = require("./models");
// const ProductRoutes = require("./routes/product");
// const InventoryRoutes = require("./routes/inventory");
// const RoomSceneRoutes = require("./routes/roomScene");
const ToolRoutes = require("./routes/tool");
const VisionAiRoutes = require('./routes/visionAi');
const CONFIG = require("./config");

//This is here to handle all the uncaught promise rejections
process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled Rejection at:', p, 'reason:', reason);
	// send entire app down. Process manager will restart it
	process.exit(1);
});


const app = express();

// app.use(logger("dev"));
app.use(express.static(path.resolve(__dirname, "public")));
// app.use(cookieParser());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));
// app.use(passport.initialize());

// CORS
app.use(function (req, res, next) {
	// Website you wish to allow to connect
	res.setHeader('Access-Control-Allow-Origin', '*');
	// Request methods you wish to allow
	res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
	// Request headers you wish to allow
	res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, content-type, Authorization, Content-Type');
	// Set to true if you need the website to include cookies in the requests sent
	// to the API (e.g. in case you use sessions)
	res.setHeader('Access-Control-Allow-Credentials', true);
	// Pass to next layer of middleware
	next();
});

global.SHOPIFY_UPDATE_COUNTER = 0;

// app.use("/product", ProductRoutes);
// app.use("/inventory", InventoryRoutes);
// app.use("/roomScene", RoomSceneRoutes);
app.use("/tool", ToolRoutes);
app.use("/vision-ai", VisionAiRoutes);


app.use("*", function(req, res) {
  res.statusCode = 200; //send the appropriate status code
  res.json({ status: "success", message: "hue admin API" });
});

// //DATABASE
models.sequelize.sync().then(() => {
	console.log(`\n* Connected to ${CONFIG.db_dialect} database -> ${CONFIG.db_name} (${CONFIG.db_host})`);
})
.catch(err => {
	console.error(`* Unable to connect to ${CONFIG.db_dialect} database ->`,CONFIG.db_name, err);
});

const port = normalizePort(CONFIG.port);	// customied port
app.set("port", port);

const server = http.createServer(app);

server.listen(port, "0.0.0.0");
server.on("listening", onListening);


function normalizePort(val) {
	const port = parseInt(val, 10);

	if (isNaN(port)) { return val; }
	if (port >= 0) { return port; }

	return false;
}

function onListening() {
	const addr = server.address();
	const bind = typeof addr === 'string'
		? 'pipe ' + addr
		: 'port ' + addr.port;
	debug('Listening on ' + bind);

	console.log(`* Server listening on -> localhost:${addr.port}`);

}