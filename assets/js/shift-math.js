(function exposeShiftMath(global) {
    function toMinutes(timeValue) {
        if (!timeValue) {
            return 0;
        }

        const [hours, minutes] = timeValue.split(":").map(Number);
        return (hours || 0) * 60 + (minutes || 0);
    }

    function round(value) {
        return Number(value.toFixed(2));
    }

    function getFinancialReports(shift) {
        if (shift.noReport === true && shift.mealPeriod !== "Double") {
            return [];
        }
        if (!shift.reports || typeof shift.reports !== "object") {
            return null;
        }

        const { lunch, dinner, whole } = shift.reports;
        if (lunch && dinner) {
            return [lunch, dinner];
        }
        if (whole) {
            return [whole];
        }
        return [lunch, dinner].filter(Boolean);
    }

    // Single shifts can lack the sales report, the tip report, or both; doubles track coverage per report.
    function isSingleShift(shift) {
        return shift.mealPeriod !== "Double";
    }

    function hasSalesReport(shift) {
        return !(isSingleShift(shift) && shift.noSales === true) && hasReport(shift);
    }

    function hasTipReport(shift) {
        return !(isSingleShift(shift) && shift.noTips === true) && hasReport(shift);
    }

    function hasReport(shift) {
        const reports = getFinancialReports(shift);
        return reports === null || reports.length > 0;
    }

    function getSalesTotal(shift) {
        if (!hasSalesReport(shift)) {
            return 0;
        }

        const reports = getFinancialReports(shift);
        if (reports) {
            return round(reports.reduce((sum, report) => sum
                + (Number(report.foodSales) || 0)
                + (Number(report.bawSales) || 0)
                + (Number(report.liquorSales) || 0)
                + (Number(report.naBevSales) || 0)
                + (Number(report.additionalSales) || 0), 0));
        }

        return round(
            (Number(shift.foodSales) || 0)
            + (Number(shift.bawSales) || 0)
            + (Number(shift.liquorSales) || 0)
            + (Number(shift.naBevSales) || 0)
            + (Number(shift.additionalSales) || 0)
        );
    }

    function getNetTips(shift) {
        if (!hasTipReport(shift)) {
            return 0;
        }

        const reports = getFinancialReports(shift);
        if (reports) {
            return round(reports.reduce((sum, report) => sum
                + (Number(report.ccTips) || 0)
                + (Number(report.cashTips) || 0)
                + (Number(report.autoGratuity) || 0)
                + (Number(report.tipOutReceived) || 0)
                - (Number(report.tipsPaidOut) || 0), 0));
        }

        return round(
            (Number(shift.ccTips) || 0)
            + (Number(shift.cashTips) || 0)
            + (Number(shift.autoGratuity) || 0)
            + (Number(shift.tipOutReceived) || 0)
            - (Number(shift.tipsPaidOut) || 0)
        );
    }

    function getAutoGratuity(shift) {
        if (!hasTipReport(shift)) {
            return 0;
        }

        const reports = getFinancialReports(shift);
        if (reports) {
            return round(reports.reduce((sum, report) => sum + (Number(report.autoGratuity) || 0), 0));
        }
        return round(Number(shift.autoGratuity) || 0);
    }

    const SALES_FIELDS = ["foodSales", "bawSales", "liquorSales", "naBevSales", "additionalSales"];
    const TIP_FIELDS = ["ccTips", "cashTips", "autoGratuity", "tipsPaidOut", "tipOutReceived"];
    const BREAKDOWN_FIELDS = [...SALES_FIELDS, ...TIP_FIELDS];

    function getFinancialBreakdown(shift) {
        const sources = getFinancialReports(shift) || [shift];
        const breakdown = {};
        BREAKDOWN_FIELDS.forEach((field) => {
            const covered = SALES_FIELDS.includes(field) ? hasSalesReport(shift) : hasTipReport(shift);
            breakdown[field] = covered
                ? round(sources.reduce((sum, source) => sum + (Number(source[field]) || 0), 0))
                : 0;
        });
        return breakdown;
    }

    function getDurationMinutes(shift) {
        if (!shift.clockIn || !shift.clockOut) {
            return 0;
        }

        const startMinutes = toMinutes(shift.clockIn);
        let endMinutes = toMinutes(shift.clockOut);
        if (endMinutes < startMinutes) {
            endMinutes += 24 * 60;
        }

        let breakMinutes = 0;

        if (shift.breakStart && shift.breakEnd) {
            let breakStartMinutes = toMinutes(shift.breakStart);
            let breakEndMinutes = toMinutes(shift.breakEnd);
            if (breakStartMinutes < startMinutes) {
                breakStartMinutes += 24 * 60;
            }
            if (breakEndMinutes < startMinutes) {
                breakEndMinutes += 24 * 60;
            }
            if (breakEndMinutes < breakStartMinutes) {
                breakEndMinutes += 24 * 60;
            }
            breakMinutes = Math.max(0, breakEndMinutes - breakStartMinutes);
        }

        return Math.max(0, endMinutes - startMinutes - breakMinutes);
    }

    global.ShiftMath = {
        getAutoGratuity,
        getDurationMinutes,
        getFinancialBreakdown,
        getNetTips,
        getSalesTotal,
        hasReport,
        hasSalesReport,
        hasTipReport,
        toMinutes,
    };
})(window);
