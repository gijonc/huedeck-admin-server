"use strict";
const tableName = "Inventory";

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define(tableName, {
  	VariantID: {
		type: DataType.BIGINT,
		primaryKey: true,
	},

	price: {
		type: DataType.DECIMAL(8, 2),
		allowNull: false,
		validate: {
		 	min: {
		 		args: [1],
		 		msg: "min value of field [price] is 1"
			 },
			 isDecimal: {
			 	args: true,
			 	msg: "[price] requires 2 decimal numbers"
			 }
		}
	},

	msrpPrice: {
		type: DataType.DECIMAL(8, 2),
		allowNull: false,
		validate: {
			min: {
				args: [1],
				msg: "min value of field [msrpPrice] is 1"
			},
			isDecimal: {
				args: true,
				msg: "`msrpPrice` requires 2 decimal numbers"
			}
		}
	},

	sku: {
		type: DataType.STRING,
		allowNull: false,
	},

	upc: {
		type: DataType.STRING,
		allowNull: false,
	},

	inventoryQty: {
		type: DataType.INTEGER,
		validate: {
			min: {
				args: [0],
				msg: "invalid field [inventoryQty]"
			}
		}
	},

	totalSoldQty: {
		type: DataType.INTEGER,
		defaultValue: 0,
	},

	lastQtyUpdateAt: {
		type: DataType.DATEONLY,
		allowNull: true,
	},

	shape: {
		type: DataType.STRING,
	},

	weightLb: {
		type: DataType.DECIMAL(8, 2),
		defaultValue: 0,
		validate: {
			isDecimal: {
				args: true,
				msg: "field [weightLb] requires 2 decimal numbers"
			}
		}
	},

	heightInch: {
		type: DataType.DECIMAL(8, 2),
		defaultValue: 0,
		isDecimal: {
			args: true,
			msg: "field [heightInch] requires 2 decimal numbers"
		}
	},

	widthInch: {
		type: DataType.DECIMAL(8, 2),
		defaultValue: 0,
		isDecimal: {
			args: true,
			msg: "field [widthInch] requires 2 decimal numbers"
		}
	},

	lengthInch: {
		type: DataType.DECIMAL(8, 2),
		defaultValue: 0,
		isDecimal: {
			args: true,
			msg: "field [lengthInch] requires 2 decimal numbers"
		}
	},

	variantPosition: {
		type: DataType.INTEGER,
		allowNull: false,
		validate: {
			isInt: {
				args: true,
				msg: "field [variantPosition] must be an integer"
			},
			min: {
				args: [1],
				msg: "field [variantPosition] must start from 1"
			},
		}
	},

	variantOption1: {
		type: DataType.STRING,
		allowNull: true
	},

	variantOption2: {
		type: DataType.STRING,
		allowNull: true
	},

	variantOption3: {
		type: DataType.STRING,
		allowNull: true
	},

  });

  Model.associate = function (models) {
	  this.belongsTo(models.ProductMedia, {
			foreignKey: 'MediaID',
			as: 'variantMedia',
	  });

	  this.hasOne(models.InventoryShipping, {
			foreignKey: 'VariantID',
			as: 'shipping',
				onUpdate: 'cascade',
				onDelete: 'cascade',
	  });
  };

  return Model;
};