import { describe, expect, test } from "./assert.js";
import { withApp } from "./app-harness.js";

describe("Branding", () => {
    test("uses the app icon in the sidebar and mobile menu", () => withApp({ width: 390, height: 667 }, ({ doc }) => {
        expect(doc.querySelector(".brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
        expect(doc.querySelector(".mobile-brand img").getAttribute("src")).toBe("assets/icons/icon.svg");
    }));
});

describe("Mobile menu", () => {
    test("opens on phone-sized screens", () => withApp({ width: 390, height: 667 }, ({ element }) => {
        expect(element("#mobile-home").classList.contains("is-visible")).toBe(true);
    }));

    test("fits a standard phone without scrolling the page", () => withApp({ width: 390, height: 667 }, ({ doc, win }) => {
        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
    }));

    test("fits a compact phone without scrolling the page", () => withApp({ width: 320, height: 568 }, ({ doc, win }) => {
        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
    }));

    test("scrolls inside the app shell only when the screen is too short", () => withApp({ width: 320, height: 400 }, ({ doc, win, element }) => {
        const shell = element(".app-shell");

        expect(doc.documentElement.scrollHeight).toBeLessThanOrEqual(win.innerHeight);
        expect(shell.scrollHeight).toBeGreaterThan(shell.clientHeight);
    }));

    test("opens the dashboard without horizontal overflow", () => withApp({ width: 390, height: 667 }, ({ doc, win, element, elements }) => {
        element('.mobile-menu-button[data-view="dashboard"]').click();

        expect(elements(".period-metric")).toHaveLength(8);
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(win.innerWidth);
    }));
});
