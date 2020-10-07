"use strict";

const tableName = "InventoryShipping";

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define(tableName, {
	VariantID: {
		type: DataType.BIGINT,
		primaryKey: true,
	},

  	shippingMethod: {
		type: DataType.STRING,
		allowNull: true
	},

	codeNmfc: {
		type: DataType.STRING,
		allowNull: true
	},

	codeHts: {
		type: DataType.STRING,
		allowNull: true
	},

	freightClass: {
		type: DataType.STRING,
		allowNull: true
	},

	nOfPackages: {
		type: DataType.INTEGER,
		allowNull: true,
	},

	weightTotalLb: {
		type: DataType.DECIMAL(8, 2),
		allowNull: true,
	},

	shopifyWeight: {
		type: DataType.DECIMAL(8, 2),
		allowNull: true,
	},
  }, {
	  createdAt: false
  });

  Model.associate = function (models) {
	  this.belongsTo(models.Inventory, {
			foreignKey: 'VariantID',
			as: 'variant',
	  });

	  this.hasMany(models.ShippingSize, {
			foreignKey: 'VariantID',
			as: 'size',
			onUpdate: 'cascade',
			onDelete: 'cascade',
	  });
  };

  return Model;
};