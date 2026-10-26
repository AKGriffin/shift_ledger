import { describe, expect, test } from "./assert.js";
import { withApp } from "./app-harness.js";

describe("PWA updates", () => {
    test("offers a manual reload when a new app worker takes control", () => withApp((harness) => {
        expect("serviceWorker" in harness.win.navigator).toBe(true);

        const serviceWorker = harness.win.navigator.serviceWorker;
        const controllerChange = () => serviceWorker.dispatchEvent(
            new harness.win.Event("controllerchange"),
        );
        controllerChange();
        controllerChange();

        const notice = harness.element("#app-update-notice");
        expect(notice.hidden).toBe(false);
        expect(harness.element("#app-update-title").textContent).toBe("Update ready");

        const foodSales = harness.element("#shift-food-sales");
        foodSales.value = "25";
        harness.fire(foodSales, "input");
        harness.win.confirm = () => false;
        harness.element("#reload-app").click();
        expect(foodSales.value).toBe("25");
        expect(notice.hidden).toBe(false);

        harness.element("#dismiss-app-update").click();
        expect(notice.hidden).toBe(true);
    }));

    test("preserves saved shifts after an app refresh", () => withApp(async (harness) => {
        harness.saveShift({ foodSales: 125 });

        const refreshedFrame = harness.doc.createElement("iframe");
        refreshedFrame.title = "Refreshed Shift Ledger app test";
        const loaded = new Promise((resolve, reject) => {
            const timeout = harness.win.setTimeout(
                () => reject(new Error("The refreshed app did not load.")),
                10000,
            );
            refreshedFrame.addEventListener("load", () => {
                harness.win.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        refreshedFrame.src = "./index.html";
        harness.doc.body.appendChild(refreshedFrame);
        await loaded;
        expect(refreshedFrame.contentDocument.querySelector("#summary-total-shifts").textContent).toBe("1");
        expect(refreshedFrame.contentDocument.querySelector("#summary-total-sales").textContent).toBe("$125.00");
    }));

    test("warns before leaving a shift form with unsaved changes", () => withApp((harness) => {
        const foodSales = harness.element("#shift-food-sales");
        foodSales.value = "25";
        harness.fire(foodSales, "input");

        const event = new harness.win.Event("beforeunload", { cancelable: true });
        harness.win.dispatchEvent(event);

        expect(event.defaultPrevented).toBe(true);
    }));
});
