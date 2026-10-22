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

    function getSalesTotal(shift) {
        return round(
            (Number(shift.foodSales) || 0)
            + (Number(shift.bawSales) || 0)
            + (Number(shift.liquorSales) || 0)
            + (Number(shift.naBevSales) || 0)
            + (Number(shift.additionalSales) || 0)
        );
    }

    function getNetTips(shift) {
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
        const endMinutes = toMinutes(shift.clockOut);
        let breakMinutes = 0;

        if (shift.breakStart && shift.breakEnd) {
            breakMinutes = Math.max(0, toMinutes(shift.breakEnd) - toMinutes(shift.breakStart));
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
