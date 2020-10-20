"use strict";
const { Op } = require("sequelize");
const fs = require("fs");
const { createGcpBucket } = require("../../utils");

const RESULT_OUTPUT_DIR = "/Users/Gijoncheng/Desktop/product_images/";

async function getAllImgFileNameInStorage() {
	const t0 = now();
	const bucket = new createGcpBucket();

	console.log(`Reading from GC storage <${bucket.name}/${BUCKET_FOLDER}> ...`);

	try {
		bucket.getFiles({}, (err, files) => {
			if (err) throw new Error(err);

			const gcsImgList = [];
			for (let i = 0, len = files.length; i < len; i += 1) {
				if (
					files[i].name.startsWith(BUCKET_FOLDER) &&
					!files[i].name.endsWith("/")
				) {
					gcsImgList.push(files[i].name.split("/").pop());
				}
			}
			console.log(
				`Finished ==> ${gcsImgList.length} files found, writing to local =>`
			);
			if (gcsImgList.length) {
				const fileName = "gcsImgName.json";
				const path = RESULT_OUTPUT_DIR + fileName;
				if (!fs.existsSync(RESULT_OUTPUT_DIR)) {
					fs.mkdirSync(RESULT_OUTPUT_DIR);
				}

				fs.writeFile(path, JSON.stringify(gcsImgList), "utf8", () => {
					console.log(
						`\nwrited to ${fileName} in ${
							Math.round((now() - t0) / 1000) + " seconds"
						}`
					);
				});
			}
		});
	} catch (err) {
		console.error(err.message);
	}
}

/**
 * The code below is for inserting image data to database
 */

async function _getUploadedImageId() {
	const dbImgList = await getDatabaseProductImage();
	const matchedIdList = dbImgList.map((img) => {
		return {
			id: img.MediaID,
			imgName: img.src.split("/").pop().split("?")[0],
		};
	});
	await _bulkUpdateProductMedia(matchedIdList, 100);
}

async function _bulkUpdateProductMedia(file, row_per_trans) {
	const dataLen = file.length;
	const loopCount = Math.ceil(dataLen / row_per_trans);
	let total_spent_time = 0;
	let total_unchanged = 0;
	let total_processed = 0;

	console.log(`\nStarting to update ${dataLen} items to database...\n`);

	for (let i = 0; i < loopCount; i += 1) {
		let start = i * row_per_trans;
		let end =
			start + row_per_trans > dataLen ? dataLen : start + row_per_trans;

		const t0 = now();

		let result = await Model.sequelize
			.transaction(async (t) => {
				const promises = [];
				for (let j = start; j < end; j += 1) {
					let obj = file[j];
					let newPromise = Model.ProductMedia.update(
						{
							miniPic:
								"https://storage.googleapis.com/huedeck/img/256/" +
								obj.imgName,
						},
						{
							where: {
								MediaID: obj.id,
								src: {
									[Op.like]: "%" + obj.imgName + "%",
								},
							},

							transaction: t,
						}
					).then((res) => res[0]);

					promises.push(newPromise);
				}
				return await Promise.all(promises);
			})
			.then((processed) => {
				return processed;
			})
			.catch((err) => {
				console.error(err);
				return false;
			});

		if (result) {
			const unchangedNum = await result.filter((num) => {
				return num === 0;
			}).length;
			const processedNum = result.length;
			const spent = Math.round(now() - t0);

			total_spent_time += spent;
			total_unchanged += unchangedNum;
			total_processed += processedNum;

			console.log(
				`Processed ${processedNum} items in ${
					spent / 1000
				} seconds (${unchangedNum} unchanged)`
			);
		} else {
			return false;
		}
	}

	const conslu = {
		"Total processed": total_processed,
		"Total unchanged": total_unchanged,
		"Total spent": total_spent_time / 1000 + " seconds",
	};

	console.log("\nDONE =>", conslu);
	return true;
}
