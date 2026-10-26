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

    function getSalesTotal(shift) {
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
        const reports = getFinancialReports(shift);
        if (reports) {
            return round(reports.reduce((sum, report) => sum
                + (Number(report.ccTips) || 0)
                + (Number(report.cashTips) || 0)
                + (Number(report.tipOutReceived) || 0)
                - (Number(report.tipsPaidOut) || 0), 0));
        }

        return round(
            (Number(shift.ccTips) || 0)
            + (Number(shift.cashTips) || 0)
            + (Number(shift.tipOutReceived) || 0)
            - (Number(shift.tipsPaidOut) || 0)
        );
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
        getDurationMinutes,
        getNetTips,
        getSalesTotal,
        toMinutes,
    };
})(window);
