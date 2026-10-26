import { describe, expect, test } from "./assert.js";

const { getDurationMinutes, getNetTips, getSalesTotal, toMinutes } = window.ShiftMath;

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

    test("defaults missing tip amounts to zero", () => {
        expect(getNetTips({})).toBe(0);
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
