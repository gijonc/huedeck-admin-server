"use strict";

const tableName = "ProductColor";

const MAX_H = 360;
const MAX_S_L = 100;

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define( tableName, {
  	 ProductID: {
		type: DataType.BIGINT,
      unique: 'composite',
    },

    hslHue: {
		type: DataType.INTEGER,
		allowNull: false,
      validate: {
			isInt: {
				args: true,
				msg: "invalid field [hslHue]"
			},
			min: {
				args: [0],
				msg: `'hslHue' value nust be between 0 ~ ${MAX_H}`
			},
			max: {
				args: [360],
				msg: `'hslHue' value nust be between 0 ~ ${MAX_H}`
			},
		}
    },

    hslSaturation: {
		type: DataType.INTEGER,
      validate: {
			isInt: {
				args: true,
				msg: "invalid field [hslSaturation]"
			},
      	min: {
				args: [0],
				msg: `field [hslSaturation] nust be between 0 ~ ${MAX_S_L}`
			},
			max: {
				args: [100],
				msg: `field [hslSaturation] nust be between 0 ~ ${MAX_S_L}`
			},
      }
    },

    hslLightness: {
		type: DataType.INTEGER,
		allowNull: false,
      validate: {
			isInt: {
				args: true,
				msg: "invalid `hslLightness` value"
			},
      	min: {
				args: [0],
				msg: `feild [hslLightness] nust be between 0 ~ ${MAX_S_L}`
			},
			max: {
				args: [100],
				msg: `feild [hslLightness] nust be between 0 ~ ${MAX_S_L}`
			},
      }
    },

    hslWeight: {
		type: DataType.INTEGER,
		allowNull: false,
      validate: {
			isInt: {
				args: true,
				msg: "invalid field [hslWeight]"
			},
      	min: {
				args: [0],
				msg: `feild [hslWeight] nust be between 0 ~ ${MAX_S_L}`
			},
			max: {
				args: [360],
				msg: `feild [hslWeight] nust be between 0 ~ ${MAX_S_L}`
			},
      }
    },

    colorIndex: {
    	type: DataType.INTEGER,
		allowNull: false,
		validate: {
			isInt: {
				args: true,
				msg: "field [colorIndex] must be an integer"
			},
			min: {
				args: [1],
				msg: "field [colorIndex] must starts from 1"
			},
		}
	 },
	 
    hexCode: {
		type: DataType.STRING,
		allowNull: false,
		unique: 'composite',
		validate: {
			isValidHexCode(value) {
				if (!/^#[0-9A-F]{6}$/i.test(value)) {
					throw new Error(`invalid [hexCode] format (start with "#" following with 6 characters/numbers)`)
				}
			}
		}
    },

    pantoneCode: {
      type: DataType.STRING,
    },

	 colorName: {
      type: DataType.STRING,
    },
  
	}, {
		timestamps: false
	})

  return Model;
};