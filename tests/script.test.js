import { expect, test } from "./assert.js";

const SHIFT_STORAGE_KEY = "shift-ledger-shifts-v1";
const SETTINGS_STORAGE_KEY = "shift-ledger-settings-v1";

test("app workflow validates, saves, edits, filters, and deletes shifts", async () => {
    const previousShifts = localStorage.getItem(SHIFT_STORAGE_KEY);
    const previousSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const frame = document.createElement("iframe");
    frame.title = "Shift Ledger app test";
    frame.style.cssText = "position:fixed;left:-1300px;top:0;width:1200px;height:1000px;";

    localStorage.removeItem(SHIFT_STORAGE_KEY);
    localStorage.removeItem(SETTINGS_STORAGE_KEY);

    try {
        const loaded = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("The app test frame did not load.")), 10000);
            frame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        frame.src = "../index.html";
        document.body.appendChild(frame);
        await loaded;

        const app = frame.contentDocument;
        const element = (selector) => {
            const found = app.querySelector(selector);
            if (!found) {
                throw new Error(`App test element not found: ${selector}`);
            }
            return found;
        };
        const enterShift = ({ date, job, sales, ccTips, cashTips, tipsPaidOut, tipOutReceived, notes }) => {
            element('.main-nav [data-view="new-shift"]').click();
            const values = {
                "shift-date": date,
                "shift-meal-period": "Dinner",
                "shift-job": job,
                "shift-clock-in": "16:00",
                "shift-clock-out": "22:00",
                "shift-food-sales": String(sales),
                "shift-cc-tips": String(ccTips),
                "shift-cash-tips": String(cashTips),
                "shift-tip-out-paid": String(tipsPaidOut),
                "shift-tip-out-received": String(tipOutReceived),
                "shift-notes": notes,
            };
            Object.entries(values).forEach(([id, value]) => {
                const field = app.getElementById(id);
                if (!field) {
                    throw new Error(`App test field not found: ${id}`);
                }
                field.value = value;
            });
            element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
                bubbles: true,
                cancelable: true,
            }));
        };
        const savedShifts = () => JSON.parse(localStorage.getItem(SHIFT_STORAGE_KEY) || "[]");

        expect(element("#summary-total-shifts").textContent).toBe("0");

        element('.main-nav [data-view="new-shift"]').click();
        element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
            bubbles: true,
            cancelable: true,
        }));
        expect(element("#form-status").textContent).toContain("Date is required.");
        expect(savedShifts()).toHaveLength(0);

        const notesWithMarkup = '<img src=x onerror="alert(1)">';
        enterShift({
            date: "2026-10-20",
            job: "Server",
            sales: 100,
            ccTips: 20,
            cashTips: 5,
            tipsPaidOut: 3,
            tipOutReceived: 2,
            notes: notesWithMarkup,
        });
        expect(element("#form-status").textContent).toBe("Shift saved.");
        expect(savedShifts()).toHaveLength(1);

        enterShift({
            date: "2026-10-21",
            job: "Expo",
            sales: 200,
            ccTips: 50,
            cashTips: 10,
            tipsPaidOut: 0,
            tipOutReceived: 0,
            notes: "Second shift",
        });
        expect(element("#summary-total-shifts").textContent).toBe("2");
        expect(element("#summary-total-sales").textContent).toBe("$300.00");
        expect(element("#summary-total-tips").textContent).toBe("$84.00");
        expect(savedShifts()).toHaveLength(2);

        element('.main-nav [data-view="previous-shifts"]').click();
        expect(app.querySelectorAll(".shift-card")).toHaveLength(2);
        const serverCard = [...app.querySelectorAll(".shift-card")]
            .find((card) => card.querySelector(".card-job").textContent === "Server");
        expect(serverCard).toBeDefined();
        expect(serverCard.querySelector(".card-notes").textContent).toBe(notesWithMarkup);
        expect(serverCard.querySelector(".card-notes img")).toBeNull();
        serverCard.querySelector(".edit-shift").click();
        expect(element("#form-title").textContent).toBe("Edit Shift");
        app.getElementById("shift-food-sales").value = "125.50";
        element("#shift-form").dispatchEvent(new frame.contentWindow.Event("submit", {
            bubbles: true,
            cancelable: true,
        }));
        expect(element("#summary-total-sales").textContent).toBe("$325.50");
        expect(savedShifts().find((shift) => shift.job === "Server").foodSales).toBe(125.5);

        element("#filter-job").value = "Expo";
        element("#filter-job").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.querySelectorAll(".shift-card")).toHaveLength(1);
        expect(element(".card-job").textContent).toBe("Expo");

        element('.main-nav [data-view="settings"]').click();
        element("#setting-mode").value = "light";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        element("#setting-style").value = "material";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("material");
        expect(app.documentElement.dataset.theme).toBe("light");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#e9e2d6");
        expect(frame.contentWindow.getComputedStyle(element(".panel")).borderRadius).toBe("5px");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#6750a4");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).visualStyle).toBe("material");

        element("#setting-mode").value = "dark";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.theme).toBe("dark");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#24211e");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#d0bcff");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).colorMode).toBe("dark");

        element("#setting-style").value = "neo-brutalist";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("neo-brutalist");
        expect(frame.contentWindow.getComputedStyle(element(".panel")).borderRadius).toBe("4px");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#171717");

        element("#setting-mode").value = "light";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.theme).toBe("light");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#fff4c2");
        expect(app.querySelector('meta[name="theme-color"]').content).toBe("#efbd26");

        element("#setting-style").value = "minimalist";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        element("#setting-mode").value = "dark";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.dataset.style).toBe("minimalist");
        expect(app.documentElement.dataset.theme).toBe("dark");
        expect(frame.contentWindow.getComputedStyle(app.documentElement).getPropertyValue("--bg").trim())
            .toBe("#111827");

        element("#setting-mode").value = "system";
        element("#setting-mode").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(app.documentElement.hasAttribute("data-theme")).toBe(false);
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).colorMode).toBe("system");

        element("#setting-style").value = "material";
        element("#setting-style").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));

        element("#setting-currency").value = "GBP";
        element("#setting-currency").dispatchEvent(new frame.contentWindow.Event("change", { bubbles: true }));
        expect(element("#summary-total-sales").textContent).toBe("£325.50");
        expect(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY)).currency).toBe("GBP");

        element('.main-nav [data-view="previous-shifts"]').click();
        element(".shift-card .delete-shift").click();
        expect(element("#summary-total-shifts").textContent).toBe("1");
        expect(element("#summary-total-sales").textContent).toBe("£125.50");
        expect(savedShifts()).toHaveLength(1);

        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({
            theme: "neo-brutalist",
            weekStartsOn: "sunday",
            currency: "CAD",
        }));
        const migrationFrame = app.createElement("iframe");
        const migrated = new Promise((resolve, reject) => {
            const timeout = window.setTimeout(() => reject(new Error("Legacy settings test frame did not load.")), 10000);
            migrationFrame.addEventListener("load", () => {
                window.clearTimeout(timeout);
                resolve();
            }, { once: true });
        });
        migrationFrame.src = "../index.html";
        document.body.appendChild(migrationFrame);
        await migrated;
        expect(migrationFrame.contentDocument.documentElement.dataset.style).toBe("neo-brutalist");
        expect(migrationFrame.contentDocument.documentElement.dataset.theme).toBe("light");
        expect(migrationFrame.contentDocument.getElementById("setting-week-start").value).toBe("sunday");
        expect(migrationFrame.contentDocument.getElementById("setting-currency").value).toBe("CAD");
        migrationFrame.remove();
    } finally {
        frame.remove();
        if (previousShifts === null) {
            localStorage.removeItem(SHIFT_STORAGE_KEY);
        } else {
            localStorage.setItem(SHIFT_STORAGE_KEY, previousShifts);
        }
        if (previousSettings === null) {
            localStorage.removeItem(SETTINGS_STORAGE_KEY);
        } else {
            localStorage.setItem(SETTINGS_STORAGE_KEY, previousSettings);
        }
    }
});
