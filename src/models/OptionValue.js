"use strict";

const tableName = "OptionValue";

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define(tableName, 
	{
		value: {
			type: DataType.STRING,
			allowNull: false
		},

	}, {
		timestamps: false
	});
	
   return Model;
};