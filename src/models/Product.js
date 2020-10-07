"use strict";

const tableName = "Product";

module.exports = (sequelize, DataType) => {
  const Model = sequelize.define(tableName, {
     ProductID: {
      type: DataType.BIGINT,
      primaryKey: true,
    },

    productName: {
      type: DataType.STRING,
      allowNull: false,
    },

    vendorCollection: {
      type: DataType.STRING,
      allowNull: true,
    },

    material: {
      type: DataType.STRING(511),
    },

    description: {
      type: DataType.TEXT,
    },

    style: {
      type: DataType.TEXT,
      allowNull: false,
    },

    manufacturer: {
      type: DataType.STRING,
      allowNull: false,
	 },
	 
	 image: {
		type: DataType.STRING,
      allowNull: false,
	 },

    shopifyURL: {
      type: DataType.STRING,
      allowNull: false,
      validate: {
        isUrl: {
          args: true,
          msg: 'invalid [shopifyURL] format',
        },
      },
    },

    designName: {
      type: DataType.STRING,
      allowNull: false,
    },

    countryOfOrigin: {
      type: DataType.STRING,
    },

    keyword: {
      type: DataType.STRING,
    },

    status: {
      type: DataType.STRING,
      allowNull: false,
      defaultValue: 'active',
      validate: {
        isIn: {
          args: [['active', 'discontinued']],
          msg: 'unknown value in field [status]',
        },
      },
    },

    display: {
      type: DataType.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },

    category1: {
      type: DataType.STRING,
      allowNull: false,
    },

    category2: {
      type: DataType.STRING,
      allowNull: false,
    },

    category3: {
      type: DataType.STRING,
      allowNull: false,
    },

    category4: {
      type: DataType.STRING,
      allowNull: true,
    },

    score: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [score] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [score] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [score] must be decimal numbers',
        },
      },
    },

    topSeller: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [topSeller] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [topSeller] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [topSeller] must be decimal numbers',
        },
      },
    },

    pdpImpressions: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [pdpImpressions] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [pdpImpressions] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [pdpImpressions] must be decimal numbers',
        },
      },
    },

    saleImpressionsRate: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [saleImpressionsRate] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [saleImpressionsRate] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [saleImpressionsRate] must be decimal numbers',
        },
      },
    },

    dataQuality: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [dataQuality] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [dataQuality] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [dataQuality] must be decimal numbers',
        },
      },
    },

    deliverySpeed: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [deliverySpeed] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [deliverySpeed] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [deliverySpeed] must be decimal numbers',
        },
      },
    },

    random: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [random] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [random] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [random] must be decimal numbers',
        },
      },
    },

    stock: {
      type: DataType.DECIMAL(4, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: {
          args: [0],
          msg: 'min value of field [stock] is 0',
        },
        max: {
          args: [1],
          msg: 'max value of field [stock] is 1',
        },
        isDecimal: {
          args: true,
          msg: 'field [stock] must be decimal numbers',
        },
      },
	 },

    minPrice: {
      type: DataType.DECIMAL(8, 2),
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'min value of field [minPrice] is 1',
        },
        isDecimal: {
          args: true,
          msg: '[minPrice] requires 2 decimal numbers',
        },
      },
    },

    maxPrice: {
      type: DataType.DECIMAL(8, 2),
      allowNull: false,
      validate: {
        min: {
          args: [1],
          msg: 'min value of field [maxPrice] is 1',
        },
        isDecimal: {
          args: true,
          msg: '[maxPrice] requires 2 decimal numbers',
        },
      },
    },
  }, {
  	createdAt: false
  });

  Model.associate = function (models) {
	  this.Variants = this.hasMany(models.Inventory, {
			foreignKey: 'ProductID',
			as: 'variants',
			onUpdate: 'cascade',
			onDelete: 'cascade',
	  });
	  
	  this.Colors = this.hasMany(models.ProductColor, {
	  		foreignKey: 'ProductID',
		  	as: 'colors',
		  	onUpdate: 'cascade',
			onDelete: 'cascade',
	  });

	  this.Medias = this.hasMany(models.ProductMedia, {
	  		foreignKey: 'ProductID',
		  	as: 'medias',
		  	onUpdate: 'cascade',
			onDelete: 'cascade',
	  });

	  this.Options = this.hasMany(models.ProductOption, {
	  		foreignKey: 'ProductID',
		  	as: 'options',
		  	onUpdate: 'cascade',
			onDelete: 'cascade',
	  });
  };

  return Model;
};