"use strict";

const fs = require("fs");
const path = require("path");
const basename = path.basename(__filename);
const Sequelize = require("sequelize");

const CONFIG = require("../config");

const db = {};

const sequelize = new Sequelize(
  CONFIG.db_name,
  CONFIG.db_user,
  CONFIG.db_password,
  {
	 host: CONFIG.db_host,
	 dialect: CONFIG.db_dialect,
	 operatorsAliases: false,
    logging: false, // prevent logging on console

    define: {
      // origin table naming
      freezeTableName: true,
		charset: 'utf8',
      collate: 'utf8_unicode_ci',
      sync: {
      	force: true
      },
    },

    dialectOptions: {
		  // useUTC: true,
      ssl: CONFIG.app === 'dev' ? false : CONFIG.db_ssl
   },

	 pool: {
	 	max: 5,
	 	idle: 30000,
	 	acquire: 60000,
	 },
  }
);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf(".") !== 0 && file !== basename && file.slice(-3) === ".js"
    );
  })
  .forEach(file => {
	 var model = sequelize["import"](path.join(__dirname, file));
	 db[model.name] = model;
  });


Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }

  if (db[modelName].relation) {
	  Object.keys(db[modelName].relation).forEach(name => {
		  db[name] = db[modelName].relation[name];
	  })
  }
});

db.sequelize = sequelize;

module.exports = db;