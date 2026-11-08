import { describe, expect, test } from "./assert.js";

const { getAutoGratuity, getDurationMinutes, getFinancialBreakdown, getNetTips, getSalesTotal, hasReport, hasSalesReport, hasTipReport, inferMissingReport, toMinutes } = window.ShiftMath;

describe("report coverage", () => {
    test("covers sales and tips independently on single shifts", () => {
        const noSales = { mealPeriod: "Dinner", noSales: true, foodSales: 99, ccTips: 20, tipsPaidOut: 5 };
        expect(hasSalesReport(noSales)).toBe(false);
        expect(hasTipReport(noSales)).toBe(true);
        expect(getSalesTotal(noSales)).toBe(0);
        expect(getNetTips(noSales)).toBe(15);

        const noTips = { mealPeriod: "Dinner", noTips: true, foodSales: 99, ccTips: 20, autoGratuity: 4 };
        expect(hasSalesReport(noTips)).toBe(true);
        expect(hasTipReport(noTips)).toBe(false);
        expect(getSalesTotal(noTips)).toBe(99);
        expect(getNetTips(noTips)).toBe(0);
        expect(getAutoGratuity(noTips)).toBe(0);
        expect(getFinancialBreakdown(noTips).ccTips).toBe(0);
        expect(getFinancialBreakdown(noTips).foodSales).toBe(99);
    });

    test("treats single shifts as reported unless marked without a report", () => {
        expect(hasReport({ mealPeriod: "Dinner", foodSales: 0 })).toBe(true);
        expect(hasReport({ mealPeriod: "Dinner", noReport: true })).toBe(false);
    });

    test("ignores amounts on a single shift that has no report", () => {
        const shift = { mealPeriod: "Lunch", noReport: true, foodSales: 99, ccTips: 20 };
        expect(getSalesTotal(shift)).toBe(0);
        expect(getNetTips(shift)).toBe(0);
        expect(getFinancialBreakdown(shift).foodSales).toBe(0);
    });

    test("tells a zero-value report apart from no report on doubles", () => {
        const zero = { lunch: { foodSales: 0 }, dinner: null, whole: null };
        expect(hasReport({ mealPeriod: "Double", reports: zero })).toBe(true);
        expect(hasReport({ mealPeriod: "Double", reports: { lunch: null, dinner: null, whole: null } })).toBe(false);
    });

    test("tracks sales and tips coverage independently across double reports", () => {
        const shift = {
            mealPeriod: "Double",
            reports: {
                lunch: { foodSales: 100, ccTips: 10, noSales: true },
                dinner: { foodSales: 200, tipsPaidOut: 5, noTips: true },
                whole: null,
            },
        };
        expect(hasSalesReport(shift)).toBe(true);
        expect(hasTipReport(shift)).toBe(true);
        expect(getSalesTotal(shift)).toBe(200);
        expect(getNetTips(shift)).toBe(10);
        expect(getFinancialBreakdown(shift).tipsPaidOut).toBe(0);
    });

    test("counts legacy combined doubles as reported", () => {
        expect(hasReport({ mealPeriod: "Double", foodSales: 50 })).toBe(true);
    });
});

describe("financial breakdown", () => {
    test("uses the reports that count toward double totals", () => {
        const breakdown = getFinancialBreakdown({
            reports: {
                lunch: { foodSales: 100, ccTips: 10 },
                dinner: { foodSales: 200, tipsPaidOut: 5 },
                whole: { foodSales: 500 },
            },
        });
        expect(breakdown.foodSales).toBe(300);
        expect(breakdown.ccTips).toBe(10);
        expect(breakdown.tipsPaidOut).toBe(5);
    });

    test("reads fields directly from single shifts", () => {
        expect(getFinancialBreakdown({ liquorSales: 12.5 }).liquorSales).toBe(12.5);
    });
});

describe("sales totals", () => {
    test("adds all sales categories", () => {
        expect(getSalesTotal({
            foodSales: 100.1,
            bawSales: 25.25,
            liquorSales: 50,
            naBevSales: 10,
            additionalSales: 4.5,
        })).toBe(189.85);
    });

    test("treats missing sales amounts as zero and rounds to cents", () => {
        expect(getSalesTotal({ foodSales: 10.105 })).toBe(10.11);
        expect(getSalesTotal({})).toBe(0);
    });

    test("adds both individual double reports when available", () => {
        expect(getSalesTotal({
            reports: {
                lunch: { foodSales: 100 },
                dinner: { foodSales: 200 },
                whole: { foodSales: 500 },
            },
        })).toBe(300);
    });
});

describe("net tips", () => {
    test("adds tips received and subtracts tip outs paid", () => {
        expect(getNetTips({
            ccTips: 30,
            cashTips: 10,
            tipOutReceived: 5,
            tipsPaidOut: 12.5,
        })).toBe(32.5);
    });

    test("adds auto-gratuity to net tips", () => {
        const shift = {
            ccTips: 30,
            cashTips: 10,
            autoGratuity: 4,
            tipOutReceived: 5,
            tipsPaidOut: 12.5,
        };

        expect(getAutoGratuity(shift)).toBe(4);
        expect(getNetTips(shift)).toBe(36.5);
    });

    test("uses the same report precedence for separate double auto-gratuity totals", () => {
        expect(getAutoGratuity({
            reports: {
                lunch: { autoGratuity: 5 },
                dinner: { autoGratuity: 8 },
                whole: { autoGratuity: 99 },
            },
        })).toBe(13);
        expect(getAutoGratuity({
            reports: {
                lunch: { autoGratuity: 5 },
                dinner: null,
                whole: { autoGratuity: 99 },
            },
        })).toBe(99);
        expect(getAutoGratuity({})).toBe(0);
    });

    test("defaults missing tip amounts to zero", () => {
        expect(getNetTips({})).toBe(0);
    });

    test("uses a whole-double report when an individual report is missing", () => {
        expect(getNetTips({
            reports: {
                lunch: { ccTips: 20 },
                dinner: null,
                whole: { ccTips: 60, autoGratuity: 10, tipsPaidOut: 5 },
            },
        })).toBe(65);
    });

    test("returns zero for an explicit double with no reports", () => {
        expect(getNetTips({ ccTips: 50, reports: { lunch: null, dinner: null, whole: null } })).toBe(0);
        expect(getSalesTotal({ foodSales: 100, reports: { lunch: null, dinner: null, whole: null } })).toBe(0);
    });
});

describe("shift duration", () => {
    test("converts a 24-hour clock time to minutes", () => {
        expect(toMinutes("16:30")).toBe(990);
        expect(toMinutes("00:00")).toBe(0);
    });

    test("subtracts a recorded break from shift time", () => {
        expect(getDurationMinutes({
            clockIn: "16:00",
            clockOut: "22:00",
            breakStart: "19:00",
            breakEnd: "19:30",
        })).toBe(330);
    });

    test("returns the full shift duration when there is no break", () => {
        expect(getDurationMinutes({
            clockIn: "09:15",
            clockOut: "17:45",
        })).toBe(510);
    });

    test("returns zero when a clock time is missing", () => {
        expect(getDurationMinutes({ clockIn: "09:00" })).toBe(0);
    });

    test("counts a clock-out on the next day as an overnight shift", () => {
        expect(getDurationMinutes({ clockIn: "22:00", clockOut: "06:00" })).toBe(480);
    });

    test("subtracts an overnight break from an overnight shift", () => {
        expect(getDurationMinutes({
            clockIn: "22:00",
            clockOut: "06:00",
            breakStart: "01:00",
            breakEnd: "01:30",
        })).toBe(450);
    });

    test("counts a break that crosses midnight", () => {
        expect(getDurationMinutes({
            clockIn: "20:00",
            clockOut: "04:00",
            breakStart: "23:30",
            breakEnd: "00:30",
        })).toBe(420);
    });
});

describe("report inference", () => {
    test("infers dinner from lunch and whole reports", () => {
        const reports = {
            lunch: { foodSales: 100, ccTips: 20, bawSales: 25, cashTips: 15, autoGratuity: 5 },
            dinner: null,
            whole: { foodSales: 300, ccTips: 50, bawSales: 75, cashTips: 40, autoGratuity: 12 },
        };
        const result = inferMissingReport(reports);
        expect(result.period).toBe("dinner");
        expect(result.report.foodSales).toBe(200);
        expect(result.report.ccTips).toBe(30);
        expect(result.report.bawSales).toBe(50);
        expect(result.report.cashTips).toBe(25);
        expect(result.report.autoGratuity).toBe(7);
    });

    test("infers lunch from dinner and whole reports", () => {
        const reports = {
            lunch: null,
            dinner: { foodSales: 150, liquorSales: 50, ccTips: 25 },
            whole: { foodSales: 350, liquorSales: 100, ccTips: 55 },
        };
        const result = inferMissingReport(reports);
        expect(result.period).toBe("lunch");
        expect(result.report.foodSales).toBe(200);
        expect(result.report.liquorSales).toBe(50);
        expect(result.report.ccTips).toBe(30);
    });

    test("returns null when reports object is invalid or missing", () => {
        expect(inferMissingReport(null)).toBe(null);
        expect(inferMissingReport(undefined)).toBe(null);
        expect(inferMissingReport({})).toBe(null);
    });

    test("returns null when fewer than two reports are present", () => {
        expect(inferMissingReport({ lunch: { foodSales: 100 }, dinner: null, whole: null })).toBe(null);
        expect(inferMissingReport({ lunch: null, dinner: null, whole: null })).toBe(null);
    });

    test("returns null when all three reports are present", () => {
        const reports = {
            lunch: { foodSales: 100 },
            dinner: { foodSales: 200 },
            whole: { foodSales: 300 },
        };
        expect(inferMissingReport(reports)).toBe(null);
    });

    test("infers report with zero values when amounts result in zero", () => {
        const reports = {
            lunch: { foodSales: 100, ccTips: 20 },
            dinner: null,
            whole: { foodSales: 100, ccTips: 20 },
        };
        const result = inferMissingReport(reports);
        expect(result.period).toBe("dinner");
        expect(result.report.foodSales).toBe(0);
        expect(result.report.ccTips).toBe(0);
    });

    test("handles tipsPaidOut subtraction correctly (subtracts in reverse)", () => {
        const reports = {
            lunch: { tipsPaidOut: 3 },
            dinner: null,
            whole: { tipsPaidOut: 10 },
        };
        const result = inferMissingReport(reports);
        expect(result.report.tipsPaidOut).toBe(7);
    });

    test("preserves noSales and noTips flags from either report", () => {
        const reports = {
            lunch: { foodSales: 100, noTips: true },
            dinner: null,
            whole: { foodSales: 300, noTips: true },
        };
        const result = inferMissingReport(reports);
        expect(result.report.noTips).toBe(true);
        expect(result.report.noSales).toBeUndefined();
    });

    test("includes all report fields in the inferred report", () => {
        const reports = {
            lunch: { foodSales: 50, bawSales: 10, liquorSales: 5, naBevSales: 2, additionalSales: 3, ccTips: 10, cashTips: 5, autoGratuity: 2, tipsPaidOut: 1, tipOutReceived: 1 },
            dinner: null,
            whole: { foodSales: 150, bawSales: 30, liquorSales: 20, naBevSales: 5, additionalSales: 10, ccTips: 30, cashTips: 15, autoGratuity: 5, tipsPaidOut: 3, tipOutReceived: 3 },
        };
        const result = inferMissingReport(reports);
        expect(result.report.foodSales).toBe(100);
        expect(result.report.bawSales).toBe(20);
        expect(result.report.liquorSales).toBe(15);
        expect(result.report.naBevSales).toBe(3);
        expect(result.report.additionalSales).toBe(7);
        expect(result.report.ccTips).toBe(20);
        expect(result.report.cashTips).toBe(10);
        expect(result.report.autoGratuity).toBe(3);
        expect(result.report.tipsPaidOut).toBe(2);
        expect(result.report.tipOutReceived).toBe(2);
    });
});
