/**
 * * Recommended image property for the using of Google Vision AI: https://cloud.google.com/vision/product-search/docs/csv-format
 * 1. Make sure the size of the file doesn 't exceed the maximum size (20MB).
 * 2. Consider viewpoints that logically highlight the product and contain relevant visual information.
 * 3. Create reference images that supplement any missing viewpoints.For example, 
 *  if you only have images of the right shoe in a pair, provide mirrored versions of those files as the left shoe.
 * 4. Upload the highest resolution image available.
 * 5. Show the product against a white background.
 * 6. Convert PNGs with transparent backgrounds to a solid background.
 */

/**
 * * To improve result accuracy:
 * 1. Use the highest resolution image
 * 2. Include bounding-poly data for each image, tool: https://cloud.google.com/vision/docs/detecting-objects
 * 3. 
 */


"use strict";

const Vision = require("@google-cloud/vision");
const { Parser } = require('json2csv');
const fs = require("fs");
const {Op} = require("sequelize");
const {gcConfig} = require('../../config');
const {ReE, ReS, to} = require("../../utils/globalFunctions");
const Model = require("../../models");
const now = require("performance-now");

const location = 'us-west1';

const productSearchClient = new Vision.ProductSearchClient(gcConfig);
const imageAnnotatorClient = new Vision.ImageAnnotatorClient(gcConfig);

const LOCATION_PATH = productSearchClient.locationPath(gcConfig.projectId, location);
// const PRODUCT_SET_ID = 'roomscene-set';
const PRODUCT_SET_ID = 'product-set';

async function generateRoomSceneCsvFile() {
	const imgUrlPrefix = 'gs://huedeck/img/roomScene/origin/';

	try {
		const json = await Model.RoomScene.findAll({
			raw: true,
		}).then(scenes => {
			const {length} = scenes;
			console.log(`Start to parse ${length} rows...`)
			const jsonList = [];
			for (let i = 0; i < length; i += 1) {
				const sc = scenes[i];
				const imageName = sc.originImage.split('/').pop().replace(/\.[^/.]+$/, '.jpeg');
				jsonList.push({
					'image-uri': imgUrlPrefix + imageName,
					'image-id': imageName,
					'product-set-id': PRODUCT_SET_ID,
					'product-id': sc.id.toString(),
					'product-category': 'homegoods',
					'product-display-name': '',
					'labels': '',
					'bounding-poly': ''
				})
			}
			
			// CSV field of columns required for product set import
			const fields = ['image-uri', 'image-id', 'product-set-id', 'product-id', 'product-category', 'product-display-name', 'labels', 'bounding-poly'];
			const opts = {
				fields,
				header: false,
			};

			// parse and output json to csv
			const parser = new Parser(opts);
			const csvData = parser.parse(jsonList);
			const outputCsvPath = '/Users/Gijoncheng/Desktop/roomscene_set.csv';
			fs.writeFileSync(outputCsvPath, csvData);
			console.log(`Done writing to ${outputCsvPath}!`);
		});
	} catch (e) {
		console.error(e);
	}
}

/**
 * Generate training data (csv) for AutoML
 */
async function generateTrainingData() {
	const t0 = now();
	const imgUrlPrefix = 'gs://huedeck/img/product/origin/';

	const styles = [
		"contemporary",
		"modern",
		"classic",
		"traditional",
		"glam",
		"transitional",
		"global",
		"rustic",
		"beach style",
		"industrial"
	];

	const cat3s = [
		'wall mirrors',
		'wall accents',
		'vases',
		'valances',
		'throws',
		'table lamps',
		'side & end tables',
		'paintings',
		'hall & stair runners',
		'footstools & ottomans',
		'floor pillows & poufs',
		'dining tables',
		'dining chairs',
		'decorative pillows',
		'decorative items',
		'curtains',
		'console tables',
		'coffee tables',
		'buffets & sideboards',
		'benches',
		'bar stools & counter stools',
		'armchairs & accent chairs',
		'area rugs',
		'accent chests & cabinets',
	];

	try {
		const json = await Model.Product.findAll({
      attributes: ['category1', 'category2', 'category3', 'style', 'image'],
      include: [
        {
          model: Model.ProductMedia,
          as: "medias",
          where: {
            mediaType: "image"
          },
          attributes: ["miniPic"]
        }
      ],
      where: {
        style: {
          [Op.in]: styles
		  },
		  
		  category3: {
			  [Op.in]: cat3s
		  }
      }
    }).then(products => {
		 const selected = [];
		 const styleTbl = {};
		 const cat3Tbl = {};

		 // Arrange data by category3 
		 for (let i = 0, len = products.length; i < len; i += 1) {
			const pd = products[i];
			const cat3Idx = cat3s.indexOf(pd.category3);
			let arrOfCat = cat3Tbl[cat3s[cat3Idx]];
			if (arrOfCat && Array.isArray(arrOfCat)) {
				arrOfCat.push(pd);
			} else {
				cat3Tbl[cat3s[cat3Idx]] = [];
			}
		 }

		 // distribute data by category3
		 console.log("Selected categories:");
		 Object.keys(cat3Tbl).forEach(key => {
		 	const maxLen = 200;
			if (cat3Tbl[key].length > maxLen) {
				const shuffled = cat3Tbl[key].sort(() => 0.5 - Math.random());
				cat3Tbl[key] = shuffled.slice(0, maxLen)
			}
			selected.push(...cat3Tbl[key]);
			console.log(key, cat3Tbl[key].length);
		 });

		 console.log("Product Length:", selected.length);
		 
		 // get json format for the training data 
		 const {length} = selected;
		 const jsonData = [];
		 const imgUrlPrefix = 'gs://x-victor-215617-vcm/image/product/';
		 for (let i = 0; i < length; i += 1) {
			// print style distribution
			const pd = selected[i];
			pd.style = pd.style.toLowerCase();
			const styleIdx = styles.indexOf(pd.style);

			const styleKey = styles[styleIdx];
			Object.prototype.hasOwnProperty.call(styleTbl, styleKey) ? styleTbl[styleKey] += 1 : styleTbl[styleKey] = 0;

			const {category1, category2, category3, style, image} = pd;
	
			jsonData.push({
				imageUrl: imgUrlPrefix + image.split('/').pop().replace(/\.[^/.]+$/, '.jpeg'),
				category1,
				category2,
				category3,
				style
			})

			// for (let j = 0, len = pd.medias.length; j < len; j += 1) {
			// 	jsonData.push({
			// 		imageUrl: imgUrlPrefix + pd.medias[j].miniPic.split('/').pop().replace(/\.[^/.]+$/, '.jpeg'),
			// 		category1,
			// 		category2,
			// 		category3,
			// 		style
			// 	})
			// }
		 }
		 console.log("Selected Styles:", styleTbl);

		// parse and output json to csv
      const parser = new Parser({
			header: false
		});
		const csvData = parser.parse(jsonData);
      const outputCsvPath = `/Users/Gijoncheng/Desktop/trainingData_${jsonData.length}.csv`;
      fs.writeFileSync(outputCsvPath, csvData);
		console.log(`Done writing ${jsonData.length} rows to ${outputCsvPath} in ${Math.round((now() - t0) / 1000)} seconds!`);
    });
	} catch (e) {
		console.error(e);
	}
}

async function generateProductSetCsvFile() {
	const imgUrlPrefix = 'gs://huedeck/img/product/origin/';

	try {
		const json = await Model.Product.findAll({
			attributes: ['ProductID', 'productName', 'category1', 'category2', 'category3', 'style', 'manufacturer', 'image'],
			raw: true,
			// include: [
			// 	{
			// 		model: Model.ProductMedia,
			// 		as: 'medias',
			// 		where: {
			// 			mediaType: 'image'
			// 		},
			// 		attributes: ['miniPic']
			// 	}
			// ]			
		}).then(products => {
			const {length} = products;
			console.log(`Start to parse ${length} rows...`)
			const jsonList = [];
			for (let i = 0; i < length; i += 1) {
				const pd = products[i];
				// const {medias} = pd;
				// for (let j = 0; j < medias.length; j += 1) {
					const imageName = pd.image.split('/').pop().replace(/\.[^/.]+$/, '');
					jsonList.push({
						'image-uri': imgUrlPrefix + imageName + '.jpeg',
						'image-id': imageName,
						'product-set-id': PRODUCT_SET_ID,
						'product-id': pd.ProductID,
						'product-category': 'homegoods',
						'product-display-name': pd.productName,
						'labels': `style=${pd.style.split(' ').join('_')},category=${pd.category1.split(' ').join('_')},category=${pd.category2.split(' ').join('_')},category=${pd.category3.split(' ').join('_')},manufacturer=${pd.manufacturer.split(' ').join('_')}`,
						'bounding-poly': ''
					})
				// }
			}
			
			// CSV field of columns required for product set import
			const fields = ['image-uri', 'image-id', 'product-set-id', 'product-id', 'product-category', 'product-display-name', 'labels', 'bounding-poly'];
			const opts = {
				fields,
				header: false,
			};

			// parse and output json to csv
			const parser = new Parser(opts);
			// 1 csv can have only 20000 rows
			const csvData = parser.parse(jsonList);
			const outputCsvPath = '/Users/Gijoncheng/Desktop/product_set.csv';
			fs.writeFileSync(outputCsvPath, csvData);
			console.log(`Done writing ${jsonList.length} rows to ${outputCsvPath}!`);
		});
	} catch (e) {
		console.error(e);
	}
}
 
async function importProductSets(csvFileUri) {
	const t0 = now();
  // Set the input configuration along with Google Cloud Storage URI
  const inputConfig = {
    gcsSource: {
      csvFileUri,
    },
  };

  // A resource that represents Google Cloud Platform location.
  const [response, operation] = await productSearchClient.importProductSets({
    parent: LOCATION_PATH,
    inputConfig,
  });

  console.log('Processing operation name: ', operation.name);

  // synchronous check of operation status
  const [result] = await response.promise();

  console.log(`Processing done: ${result.statuses.length} items imported in ${Math.round((now() - t0) / 1000)} seconds`);

}

async function deleteProductSet(productSetId) {
  try {
    const productSetPath = productSearchClient.productSetPath(
      gcConfig.projectId,
      location,
      productSetId
    );

    await productSearchClient.deleteProductSet({
      name: productSetPath
    });

    const [productSets] = await productSearchClient.listProductSets({
      parent: LOCATION_PATH
    });

    console.log(productSetId, "has been deleted");
    console.log("All productSets of project:");
    productSets.forEach(productSet => {
      console.log(productSet.name);
    });

    return true;
  } catch (err) {
    console.error("[deleteProductSet] -->", err);
    return false;
  }
}

async function deleteProduct(productId) {
	try {
		const productPath = productSearchClient.productPath(gcConfig.projectId, location, productId);
		await productSearchClient.deleteProduct({
			name: productPath
		});
		// console.log('Deleted: ' + productId);
		return true;
	} catch (err) {
		console.error(err);
		return false;
	}
}

async function searchSimilarProduct(image, productSetId, category) {
	const t0 = now();
	const productSetPath = productSearchClient.productSetPath(
		gcConfig.projectId,
		location,
		productSetId
	);
	
	const request = {
		image,
		features: [{
			type: 'PRODUCT_SEARCH',
			maxResults: category ? 5 : 20
		}],
		imageContext: {
			productSearchParams: {
				productSet: productSetPath,
				productCategories: ['homegoods'],
				filter: category ? `category = ${category}` : ''
			},
		},
	};
	const [response] = await imageAnnotatorClient.batchAnnotateImages({
		requests: [request],
	});

	const {results} = response['responses'][0].productSearchResults;
	console.log(`* Similr products found in ${Math.round((now() - t0) / 1000)} seconds`);

	return results;
}

async function detectImageObjects(content) {
	const t0 = now();
	const [result] = await imageAnnotatorClient.objectLocalization(content);
	console.log(`* Object detected in ${Math.round((now() - t0) / 1000)} seconds`);
	return result.localizedObjectAnnotations;
}

async function listProductSet() {
	console.log('Listing productSet...');
	const [productSets] = await productSearchClient.listProductSets({
		parent: productSearchClient.locationPath(gcConfig.projectId, location)
	});
	productSets.forEach(productSet => {
		console.log(`Product Set name: ${productSet.name}`);
	});
}

async function listProducts() {
	const [products] = await productSearchClient.listProducts({
		parent: LOCATION_PATH
	});
	// console.log(products);
	console.log('length:', products.length);
}

/**
 * main routing functions
 */

const findSimilarProduct = async (req, res) => {
	res.setHeader("Content-Type", "application/json");

	const {
		imgData,
		type,
		productSet
	} = req.body;

	if (!imgData) return ReE(res, {message: 'input not found!'});
	
	try {
		console.log("\nProcessing...");

		let searchSrc, detectSrc;
		if (type === "url") {
			searchSrc = {
				source: { imageUri: imgData }
			};
			detectSrc = imgData;
		} else {
			searchSrc = {
				content: imgData
			};
			detectSrc = {
				image: { content: imgData }
			};
		}

		const [detectedObjects, similarProducts] = await Promise.all([
			detectImageObjects(detectSrc),
			searchSimilarProduct(searchSrc, PRODUCT_SET_ID),
		]);

		// Uncomment below to test out for multiple matching items
		// const list = await Promise.all([
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'area_rugs'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'decorative_pillows'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'armchairs_&_accent_chairs'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'sofas'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'decorative_accents'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'console_tables'),
		// 	searchSimilarProduct(searchSrc, PRODUCT_SET_ID, 'side_&_end_tables'),
		// ]);
		// const similarProducts = [].concat(...list);

		const data = {
			similarProducts,
			detectedObjects
		};

		return ReS(res, data);
	} catch(err) {
		console.error(err);
		return ReE(res, err);
	}
}





async function bulkDelete(idList) {
	const t0 = now();
	const data_len = idList.length;
	const concurrent_load = 10;
	const loop_count = Math.ceil(data_len / concurrent_load);
	const failedList = [];
	let successCount = 0;
	let totalSpent = 0;

	console.log(`starting to delete ${data_len} products...`);

	for (let i = 0; i < loop_count; i += 1) {
		let start = i * concurrent_load;
		let end = start + concurrent_load > data_len ? data_len : start + concurrent_load;

		const promises = [];
		for (let j = start; j < end; j += 1) {
			const prom = deleteProduct(idList[j]);
			promises.push(prom);
		}

		// handle upload result 
		const results = await Promise.all(promises);
		if (results.length) {
			for (let j = 0, len = results.length; j < len; j += 1) {
				const result = results[j];
				if (result === true) {
					successCount += 1;
				} else {
					failedList.push(result);
				}
			}
		}

		// print progress
		if (end % concurrent_load === 0) { // print process
			const spent = Math.round((now() - t0) / 100);
			totalSpent += spent;
			console.log(`Processed ${start} ~ ${end} items in ${spent} seconds`);
		}
	}

	console.log({
		successCount,
		totalSpent,
		failed: failedList.length,
	}, failedList);

	
}

const visionAiConfig = async (req, res) => {
	// deleteProductSet('test-product-img-set');
	// await deleteProductSet('huedeck-pdset-v1');
	
	// await generateTrainingData();

	await listProductSet();
	// await listProducts();

	const productPath = productSearchClient.productPath(gcConfig.projectId, location, '1556564607094');
	const [product] = await productSearchClient.getProduct({
		name: productPath
	});
	console.log(`Product name: ${product.name}`);
	console.log(`Product id: ${product.name.split('/').pop()}`);
	console.log(`Product display name: ${product.displayName}`);
	console.log(`Product description: ${product.description}`);
	console.log(`Product category: ${product.productCategory}`);
	console.log(`Product labels: ${product.productLabels}`);
	const request = {
		parent: productPath,
	};
	const [response] = await productSearchClient.listReferenceImages(request);
	response.forEach(image => {
		console.log(`image.name: ${image.name}`);
		console.log(`image.uri: ${image.uri}`);
	});


	// await generateProductSetCsvFile();

	// const csvFileUri = 'gs://huedeck/others/product_set.csv';
	// await importProductSets(csvFileUri);
	

	return ReS(res);
}





module.exports = {
	findSimilarProduct,
	visionAiConfig
};
