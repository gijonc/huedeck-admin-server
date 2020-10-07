"use strict";

const tableName = "ProductOption";

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define(tableName, {
  	OptionID: {
		type: DataType.BIGINT,
		primaryKey: true
	},

	optionName: {
		type: DataType.STRING,
		allowNull: false
	},

	optionPosition: {
		type: DataType.INTEGER,
	}

  }, {
  	timestamps: false
  });

  Model.associate = function (models) {
	  this.OptionValues = this.hasMany(models.OptionValue, {
			foreignKey: 'OptionID',
			as: 'values',
			onUpdate: 'cascade',
			onDelete: 'cascade',
	  });
  };

  return Model;
};