"use strict";

const tableName = "RoomScene";

module.exports = (sequelize, DataType) => {

	// define a relational table links to Product Table
  const RoomSceneProduct = sequelize.define('RoomSceneProduct', {
	id: {
		autoIncrement: true,
		primaryKey: true,
		type: DataType.INTEGER
	},

  	RoomSceneID: {
  		type: DataType.BIGINT
  	},

  	ProductID: {
  		type: DataType.BIGINT,
  	},
  }, {
  	timestamps: false
  });

  const Model = sequelize.define(tableName, {
    id: {
		autoIncrement: true,
		primaryKey: true,
		type: DataType.BIGINT
	 },
	 
	 originImage: {
		type: DataType.STRING,
		allowNull: false,
		unique: true
	 },

	 resizedImage: {
	 	type: DataType.STRING,
		allowNull: false,
		unique: true
	 },

	 productCount: {
	 	type: DataType.INTEGER,
	 	allowNull: false,
	 	defaultValue: 0,
	 }
  }, {
  	createdAt: false
  });

  Model.associate = function (models) {
	 this.belongsToMany(models.Product, {
	 	through: RoomSceneProduct,
	 	as: 'products',
	 	foreignKey: 'RoomSceneID',
	 	onUpdate: 'cascade',
	 	onDelete: 'cascade',
	 });

	 models.Product.belongsToMany(this, {
	 	through: RoomSceneProduct,
	 	as: 'roomScene',
	 	foreignKey: 'ProductID',
	 	onUpdate: 'cascade',
	 	onDelete: 'cascade',
	 });
  };

  Model.relation = {
	  RoomSceneProduct
  }

  return Model;
};