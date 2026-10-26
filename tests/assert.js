const results = [];
const pendingTests = [];

function recordTestResult(label, error = null) {
    if (error) {
        results.push({ label, passed: false, error });
        console.error(`✗ ${label}`, error);
    } else {
        results.push({ label, passed: true });
        console.log(`✓ ${label}`);
    }
}

function format(value) {
    if (typeof value === "string") {
        return JSON.stringify(value);
    }

    try {
        return JSON.stringify(value);
    } catch {
        return String(value);
    }
}

function deepEqual(actual, expected) {
    if (Object.is(actual, expected)) {
        return true;
    }

    if (actual === null || expected === null || typeof actual !== "object" || typeof expected !== "object") {
        return false;
    }

    if (Array.isArray(actual) || Array.isArray(expected)) {
        return Array.isArray(actual)
            && Array.isArray(expected)
            && actual.length === expected.length
            && actual.every((value, index) => deepEqual(value, expected[index]));
    }

    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);

    return actualKeys.length === expectedKeys.length
        && actualKeys.every(key => Object.hasOwn(expected, key) && deepEqual(actual[key], expected[key]));
}

function assert(condition, message, negate) {
    if (negate ? condition : !condition) {
        throw new Error(message);
    }
}

function createMatchers(actual, negate = false) {
    const matchers = {
        toBe(expected) {
            assert(Object.is(actual, expected), `Expected ${format(actual)} ${negate ? "not " : ""}to be ${format(expected)}.`, negate);
        },
        toEqual(expected) {
            assert(deepEqual(actual, expected), `Expected ${format(actual)} ${negate ? "not " : ""}to equal ${format(expected)}.`, negate);
        },
        toBeDefined() {
            assert(actual !== undefined, `Expected ${format(actual)} ${negate ? "not " : ""}to be defined.`, negate);
        },
        toBeUndefined() {
            assert(actual === undefined, `Expected ${format(actual)} ${negate ? "not " : ""}to be undefined.`, negate);
        },
        toBeNull() {
            assert(actual === null, `Expected ${format(actual)} ${negate ? "not " : ""}to be null.`, negate);
        },
        toBeTruthy() {
            assert(Boolean(actual), `Expected ${format(actual)} ${negate ? "not " : ""}to be truthy.`, negate);
        },
        toBeFalsy() {
            assert(!actual, `Expected ${format(actual)} ${negate ? "not " : ""}to be falsy.`, negate);
        },
        toContain(expected) {
            const contains = Array.isArray(actual)
                ? actual.some(value => deepEqual(value, expected))
                : typeof actual === "string" && actual.includes(expected);
            assert(contains, `Expected ${format(actual)} ${negate ? "not " : ""}to contain ${format(expected)}.`, negate);
        },
        toHaveLength(expected) {
            const hasLength = actual !== null && actual !== undefined && typeof actual.length === "number";
            assert(hasLength && actual.length === expected, `Expected ${format(actual)} ${negate ? "not " : ""}to have length ${expected}.`, negate);
        },
        toBeGreaterThan(expected) {
            assert(actual > expected, `Expected ${format(actual)} ${negate ? "not " : ""}to be greater than ${format(expected)}.`, negate);
        },
        toBeGreaterThanOrEqual(expected) {
            assert(actual >= expected, `Expected ${format(actual)} ${negate ? "not " : ""}to be greater than or equal to ${format(expected)}.`, negate);
        },
        toBeLessThanOrEqual(expected) {
            assert(actual <= expected, `Expected ${format(actual)} ${negate ? "not " : ""}to be less than or equal to ${format(expected)}.`, negate);
        },
        toBeInstanceOf(expected) {
            assert(actual instanceof expected, `Expected ${format(actual)} ${negate ? "not " : ""}to be an instance of ${expected.name}.`, negate);
        },
        toThrow(expected) {
            if (typeof actual !== "function") {
                throw new Error("The value passed to toThrow must be a function.");
            }

            let thrown = null;
            try {
                actual();
            } catch (error) {
                thrown = error;
            }

            let matches = thrown !== null;
            if (matches && expected instanceof RegExp) {
                matches = expected.test(thrown.message);
            } else if (matches && typeof expected === "string") {
                matches = thrown.message.includes(expected);
            } else if (matches && typeof expected === "function") {
                matches = thrown instanceof expected;
            }

            assert(matches, `Expected function ${negate ? "not " : ""}to throw${expected ? ` ${format(expected)}` : ""}${thrown ? `; got ${format(thrown.message)}` : ""}.`, negate);
        }
    };

    Object.defineProperty(matchers, "not", {
        get() {
            return createMatchers(actual, !negate);
        }
    });

    return matchers;
}

export function describe(label, callback) {
    console.group(`=== ${label} ===`);
    try {
        callback();
    } finally {
        console.groupEnd();
    }
}

export function test(label, callback) {
    try {
        const result = callback();
        if (result && typeof result.then === "function") {
            pendingTests.push(Promise.resolve(result).then(
                () => recordTestResult(label),
                error => recordTestResult(label, error)
            ));
            return;
        }
        recordTestResult(label);
    } catch (error) {
        recordTestResult(label, error);
    }
}

export function expect(actual) {
    return createMatchers(actual);
}

export async function finishTests() {
    await Promise.all(pendingTests);
    const failed = results.filter(result => !result.passed);
    const summary = `${results.length - failed.length}/${results.length} tests passed`;
    const report = document.createElement("pre");
    report.id = "test-results";
    report.textContent = failed.length === 0
        ? summary
        : `${summary}; ${failed.length} failed.\n${failed.map(result => `- ${result.label}`).join("\n")}`;
    document.body.appendChild(report);

    if (failed.length > 0) {
        console.error(`${summary}; ${failed.length} failed.`);
        throw new Error(`${summary}; see test failures above.`);
    }

    console.log(summary);
}
