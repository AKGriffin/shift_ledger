import { finishTests } from "./assert.js";
import "./shift-math.test.js";
import "./script.test.js";

finishTests().catch((error) => {
    const report = document.getElementById("test-results");
    if (report) {
        report.textContent = error.message;
    }
});
