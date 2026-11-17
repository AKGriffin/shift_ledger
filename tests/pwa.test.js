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

        const dialog = harness.element("#app-update-dialog");
        expect(dialog.open).toBe(true);
        expect(harness.element("#app-update-title").textContent).toBe("Update ready");

        const foodSales = harness.element("#shift-food-sales");
        foodSales.value = "25";
        harness.fire(foodSales, "input");
        harness.win.confirm = () => false;
        harness.element("#reload-app").click();
        expect(foodSales.value).toBe("25");
        expect(dialog.open).toBe(true);

        harness.element("#dismiss-app-update").click();
        expect(dialog.open).toBe(false);
    }));

    test("explains manual update checks when no app worker is registered", () => withApp(async (harness) => {
        harness.element("#check-for-updates").click();
        await Promise.resolve();
        expect(harness.element("#update-check-status").textContent).toContain("only available");
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
