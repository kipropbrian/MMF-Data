import { readFile, writeFile } from "fs/promises";

// Statistical utility functions remain the same
const statistics = {
    average: (arr) => {
        if (!arr.length) return 0;
        const sum = arr.reduce((a, b) => a + b, 0);
        return +(sum / arr.length).toFixed(2);
    },
    
    median: (arr) => {
        if (!arr.length) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? +((sorted[mid - 1] + sorted[mid]) / 2).toFixed(2)
            : +sorted[mid].toFixed(2);
    },
    
    stdDev: (arr) => {
        if (!arr.length) return 0;
        const mean = statistics.average(arr);
        const variance = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / arr.length;
        return +Math.sqrt(variance).toFixed(2);
    }
};

// Data collection classes remain the same
class FundMetrics {
    constructor() {
        this.nominalRates = [];
        this.afterTaxReturns = [];
        this.realReturns = [];
        this.count = 0;
    }

    addMetrics(nominal, afterTax, real) {
        this.nominalRates.push(nominal);
        this.afterTaxReturns.push(afterTax);
        this.realReturns.push(real);
        this.count++;
    }

    getAverages() {
        return {
            nominalRate: statistics.average(this.nominalRates),
            afterTaxReturn: statistics.average(this.afterTaxReturns),
            realReturn: statistics.average(this.realReturns),
            dataPoints: this.count
        };
    }

    getDetailedStats() {
        return {
            nominalRate: {
                average: statistics.average(this.nominalRates),
                median: statistics.median(this.nominalRates),
                stdDev: statistics.stdDev(this.nominalRates)
            },
            afterTaxReturn: {
                average: statistics.average(this.afterTaxReturns),
                median: statistics.median(this.afterTaxReturns),
                stdDev: statistics.stdDev(this.afterTaxReturns)
            },
            realReturn: {
                average: statistics.average(this.realReturns),
                median: statistics.median(this.realReturns),
                stdDev: statistics.stdDev(this.realReturns)
            },
            dataPoints: this.count
        };
    }
}

class MonthData {
    constructor() {
        this.fundsData = new Map();
        this.statistics = new FundMetrics();
    }

    addFundData(fund) {
        if (!this.fundsData.has(fund.name)) {
            this.fundsData.set(fund.name, new FundMetrics());
        }
        const fundMetrics = this.fundsData.get(fund.name);
        fundMetrics.addMetrics(fund.nominalRate, fund.afterTaxReturn, fund.realReturn);
    }

    addStatistics(stats) {
        this.statistics.addMetrics(
            stats.average.nominalRate,
            stats.average.afterTaxReturn,
            stats.average.realReturn
        );
    }
}

// Main data processing function
function processMonthlyData(dailyData) {
    const monthsMap = new Map();

    // Process daily data
    dailyData.forEach(dayData => {
        try {
            const [day, month, year] = dayData.metadata.date.split(" ");
            const monthYear = `${month} ${year}`.toUpperCase();

            if (!monthsMap.has(monthYear)) {
                monthsMap.set(monthYear, new MonthData());
            }
            const monthData = monthsMap.get(monthYear);

            // Process funds
            dayData.funds.forEach(fund => monthData.addFundData(fund));

            // Process statistics
            monthData.addStatistics(dayData.metadata.statistics);
        } catch (error) {
            console.error(`Error processing data for date ${dayData.metadata.date}:`, error);
        }
    });

    // Convert to final format
    const monthlyData = Array.from(monthsMap.entries()).map(([monthYear, data]) => {
        // Get fund data with rankings
        const funds = Array.from(data.fundsData.entries())
            .map(([name, metrics]) => ({
                name,
                ...metrics.getAverages()
            }))
            .sort((a, b) => b.nominalRate - a.nominalRate)
            .map((fund, index) => ({
                ...fund,
                rank: index + 1  // Add ranking based on sorted position
            }));

        return {
            metadata: {
                month: monthYear,
                source: "Daily Nation and M-PESA APP",
                statistics: {
                    average: data.statistics.getAverages(),
                    detailed: data.statistics.getDetailedStats()
                },
                summary: {
                    totalFunds: funds.length,
                    topPerformer: { ...funds[0] },  // Include rank in top performer
                    bottomPerformer: { ...funds[funds.length - 1] }  // Include rank in bottom performer
                }
            },
            funds: funds
        };
    });

    // Sort months chronologically
    return monthlyData.sort((a, b) => {
        const [aMonth, aYear] = a.metadata.month.split(" ");
        const [bMonth, bYear] = b.metadata.month.split(" ");
        const months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
                       "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        
        if (aYear !== bYear) return aYear - bYear;
        return months.indexOf(aMonth) - months.indexOf(bMonth);
    });
}

// Main execution
async function main() {
    try {
        console.log("Reading data file...");
        const fileContent = await readFile("data.json", { encoding: "utf8" });
        const dailyData = JSON.parse(fileContent);

        console.log("Processing monthly data...");
        const monthlyData = processMonthlyData(dailyData);

        // Add overall summary
        const summaryData = {
            summary: {
                totalMonths: monthlyData.length,
                dateRange: {
                    start: monthlyData[0].metadata.month,
                    end: monthlyData[monthlyData.length - 1].metadata.month
                },
                averageNumberOfFunds: +(monthlyData.reduce((sum, month) => 
                    sum + month.metadata.summary.totalFunds, 0) / monthlyData.length).toFixed(2)
            },
            monthlyData
        };

        console.log("Writing results to file...");
        await writeFile("monthly.json", JSON.stringify(summaryData, null, 2));
        console.log("Successfully processed data and wrote to monthly.json");
        
        // Print summary
        console.log("\nProcessing Summary:");
        console.log(`Total months processed: ${summaryData.summary.totalMonths}`);
        console.log(`Date range: ${summaryData.summary.dateRange.start} to ${summaryData.summary.dateRange.end}`);
        console.log(`Average number of funds per month: ${summaryData.summary.averageNumberOfFunds}`);

    } catch (error) {
        console.error("Error processing data:", error);
        process.exit(1);
    }
}

main();