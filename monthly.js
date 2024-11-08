import { readFile, writeFile } from "fs/promises";

const fileContent = await readFile("data.json", { encoding: "utf8" });
const dailyData = JSON.parse(fileContent);

// Functions to compute average, median, and standard deviation
function average(arr) {
	const sum = arr.reduce((a, b) => a + b, 0);
	return sum / arr.length;
}

// Main script to convert daily data to monthly format
function convertToMonthlyFormat(data) {
	const monthsData = {};

	data.forEach((dayData) => {
		// Extract date and parse month and year
		const dateStr = dayData.metadata.date;
		const [day, month, year] = dateStr.split(" ");
		const monthYear = `${month} ${year}`.toUpperCase();

		if (!monthsData[monthYear]) {
			monthsData[monthYear] = {
				fundsData: {},
				statisticsData: {
					average: {
						nominalRates: [],
						afterTaxReturns: [],
						realReturns: [],
					},
				},
			};
		}

		// Collect fund data
		dayData.funds.forEach((fund) => {
			const fundManager = fund.fundManager;
			if (!monthsData[monthYear].fundsData[fundManager]) {
				monthsData[monthYear].fundsData[fundManager] = {
					nominalRates: [],
					afterTaxReturns: [],
					realReturns: [],
				};
			}
			monthsData[monthYear].fundsData[fundManager].nominalRates.push(
				fund.nominalRate
			);
			monthsData[monthYear].fundsData[fundManager].afterTaxReturns.push(
				fund.afterTaxReturn
			);
			monthsData[monthYear].fundsData[fundManager].realReturns.push(
				fund.realReturn
			);
		});

		// Collect statistics data
		const stats = dayData.metadata.statistics;
		monthsData[monthYear].statisticsData.average.nominalRates.push(
			stats.average.nominalRate
		);
		monthsData[monthYear].statisticsData.average.afterTaxReturns.push(
			stats.average.afterTaxReturn
		);
		monthsData[monthYear].statisticsData.average.realReturns.push(
			stats.average.realReturn
		);
		console.log(stats);
		console.log("---");
	});

	// Prepare monthly data
	const monthlyData = [];

	Object.keys(monthsData).forEach((monthYear) => {
		const monthObj = monthsData[monthYear];

		// Process funds
		const funds = [];
		Object.keys(monthObj.fundsData).forEach((fundManager) => {
			const fundData = monthObj.fundsData[fundManager];

			funds.push({
				fundManager: fundManager,
				nominalRate: average(fundData.nominalRates),
				afterTaxReturn: average(fundData.afterTaxReturns),
				realReturn: average(fundData.realReturns),
			});
		});

		// Process statistics
		const statsData = monthObj.statisticsData;
		const statistics = {
			average: {
				nominalRate: average(statsData.average.nominalRates),
				afterTaxReturn: average(statsData.average.afterTaxReturns),
				realReturn: average(statsData.average.realReturns),
			},
		};

		monthlyData.push({
			metadata: {
				month: monthYear,
				source: "Daily Nation and M-PESA APP",
				statistics: statistics,
			},
			funds: funds,
		});
	});

	return monthlyData;
}

// Convert the data and log the result
console.log(dailyData.length);
const monthlyData = convertToMonthlyFormat(dailyData);
// console.log(JSON.stringify(monthlyData, null, 2));

try {
	await writeFile("monthly.json", JSON.stringify(monthlyData, null, 2));
	console.log("Successfully wrote to monthly.json");
} catch (error) {
	console.error("Error writing file:", error);
}
