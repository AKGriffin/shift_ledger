(function exposeWorkplaces(global) {
    const STORAGE_KEY = "shift-ledger-workplaces-v1";
    const RECOVERY_KEY = "shift-ledger-workplaces-v1-recovery";
    const MAX_NAME_LENGTH = 60;
    const MEAL_PERIODS = ["Lunch", "Dinner", "Double"];
    const PAY_PERIOD_TYPES = ["weekly", "biweekly", "semimonthly", "monthly"];
    const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

    function readTemplate(raw) {
        if (raw === undefined || raw === null) {
            return null;
        }
        if (typeof raw !== "object" || Array.isArray(raw)) {
            throw new Error("Role template is not valid.");
        }
        const template = {};
        if (raw.mealPeriod) {
            if (!MEAL_PERIODS.includes(raw.mealPeriod)) {
                throw new Error("Choose a valid meal period.");
            }
            template.mealPeriod = raw.mealPeriod;
        }
        for (const field of ["clockIn", "clockOut", "breakStart", "breakEnd"]) {
            if (raw[field]) {
                if (typeof raw[field] !== "string" || !TIME_PATTERN.test(raw[field])) {
                    throw new Error("Use valid times for the template.");
                }
                template[field] = raw[field];
            }
        }
        if (Boolean(template.breakStart) !== Boolean(template.breakEnd)) {
            throw new Error("Set both break times, or leave both empty.");
        }
        return Object.keys(template).length > 0 ? template : null;
    }

    function readPayPeriod(raw) {
        if (raw === undefined || raw === null) {
            return null;
        }
        if (typeof raw !== "object" || Array.isArray(raw) || !PAY_PERIOD_TYPES.includes(raw.type)) {
            throw new Error("Choose a valid pay period.");
        }
        if (raw.type === "semimonthly" || raw.type === "monthly") {
            return { type: raw.type };
        }
        const match = typeof raw.anchorDate === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw.anchorDate);
        const date = match && new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
        if (!date || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) {
            throw new Error("Enter the date a pay period starts.");
        }
        return { type: raw.type, anchorDate: raw.anchorDate };
    }

    function createId(prefix) {
        return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    }

    function emptyData() {
        return { version: 1, setupDismissed: false, workplaces: [] };
    }

    function cleanName(value) {
        return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
    }

    function normalizeData(raw) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw) || !Array.isArray(raw.workplaces)) {
            throw new Error("Workplace data is not valid.");
        }

        const ids = new Set();
        const claimId = (id) => {
            if (typeof id !== "string" || !id || ids.has(id)) {
                throw new Error("Workplace data has a missing or duplicate id.");
            }
            ids.add(id);
        };
        const readName = (value) => {
            const name = cleanName(value);
            if (!name || name.length > MAX_NAME_LENGTH) {
                throw new Error("Workplace data has an invalid name.");
            }
            return name;
        };

        const workplaces = raw.workplaces.map((workplace) => {
            if (!workplace || typeof workplace !== "object" || !Array.isArray(workplace.roles)) {
                throw new Error("Workplace data is not valid.");
            }
            claimId(workplace.id);
            const roles = workplace.roles.map((role) => {
                if (!role || typeof role !== "object") {
                    throw new Error("Workplace data is not valid.");
                }
                claimId(role.id);
                const normalizedRole = { id: role.id, name: readName(role.name), archived: role.archived === true };
                const template = readTemplate(role.template);
                if (template) {
                    normalizedRole.template = template;
                }
                if (role.tracksReports === false) {
                    normalizedRole.tracksReports = false;
                }
                return normalizedRole;
            });
            const normalizedWorkplace = {
                id: workplace.id,
                name: readName(workplace.name),
                archived: workplace.archived === true,
                roles,
            };
            const payPeriod = readPayPeriod(workplace.payPeriod);
            if (payPeriod) {
                normalizedWorkplace.payPeriod = payPeriod;
            }
            return normalizedWorkplace;
        });

        return { version: 1, setupDismissed: raw.setupDismissed === true, workplaces };
    }

    function load(storage) {
        let raw = null;
        try {
            raw = storage.getItem(STORAGE_KEY);
            if (raw === null) {
                return { data: emptyData(), exists: false, notice: "" };
            }
            return { data: normalizeData(JSON.parse(raw)), exists: true, notice: "" };
        } catch (error) {
            console.error("Unable to read stored workplaces:", error);
            let kept = false;
            if (raw) {
                try {
                    storage.setItem(RECOVERY_KEY, raw);
                    kept = true;
                } catch (recoveryError) {
                    console.error("Unable to preserve unreadable workplace data:", recoveryError);
                }
            }
            return {
                data: { ...emptyData(), setupDismissed: true },
                exists: true,
                notice: `Saved workplaces could not be read.${kept ? " A copy of the original data was kept in this browser." : ""}`,
            };
        }
    }

    function save(storage, data) {
        storage.setItem(STORAGE_KEY, JSON.stringify(data));
    }

    function validateName(name, siblings, noun, exceptId = null) {
        const cleaned = cleanName(name);
        if (!cleaned) {
            return "Enter a name.";
        }
        if (cleaned.length > MAX_NAME_LENGTH) {
            return `Use ${MAX_NAME_LENGTH} characters or fewer.`;
        }
        const taken = siblings.some((sibling) => !sibling.archived
            && sibling.id !== exceptId
            && sibling.name.toLowerCase() === cleaned.toLowerCase());
        return taken ? `You already have an active ${noun} with that name.` : "";
    }

    function locate(data, kind, id) {
        if (kind === "workplace") {
            const item = data.workplaces.find((workplace) => workplace.id === id);
            return item ? { item, siblings: data.workplaces, parent: null } : null;
        }
        for (const workplace of data.workplaces) {
            const item = workplace.roles.find((role) => role.id === id);
            if (item) {
                return { item, siblings: workplace.roles, parent: workplace };
            }
        }
        return null;
    }

    function addWorkplace(data, name) {
        const error = validateName(name, data.workplaces, "workplace");
        if (error) {
            return { error };
        }
        const item = { id: createId("wp"), name: cleanName(name), archived: false, roles: [] };
        data.workplaces.push(item);
        return { item };
    }

    function addRole(data, workplaceId, name) {
        const found = locate(data, "workplace", workplaceId);
        if (!found) {
            return { error: "That workplace no longer exists." };
        }
        const error = validateName(name, found.item.roles, "role");
        if (error) {
            return { error };
        }
        const item = { id: createId("role"), name: cleanName(name), archived: false };
        found.item.roles.push(item);
        return { item };
    }

    function rename(data, kind, id, name) {
        const found = locate(data, kind, id);
        if (!found) {
            return { error: "That item no longer exists." };
        }
        const error = validateName(name, found.siblings, kind, id);
        if (error) {
            return { error };
        }
        found.item.name = cleanName(name);
        return { item: found.item };
    }

    function setArchived(data, kind, id, archived) {
        const found = locate(data, kind, id);
        if (!found) {
            return { error: "That item no longer exists." };
        }
        if (!archived) {
            const error = validateName(found.item.name, found.siblings, kind, id);
            if (error) {
                return { error: `Rename this ${kind} first: ${error.charAt(0).toLowerCase()}${error.slice(1)}` };
            }
        }
        found.item.archived = archived;
        return { item: found.item };
    }

    function setTemplate(data, roleId, template) {
        const found = locate(data, "role", roleId);
        if (!found) {
            return { error: "That role no longer exists." };
        }
        try {
            const clean = readTemplate(template);
            if (clean) {
                found.item.template = clean;
            } else {
                delete found.item.template;
            }
        } catch (error) {
            return { error: error.message };
        }
        return { item: found.item };
    }

    function setTracksReports(data, roleId, tracksReports) {
        const found = locate(data, "role", roleId);
        if (!found) {
            return { error: "That role no longer exists." };
        }
        if (tracksReports === false) {
            found.item.tracksReports = false;
        } else {
            delete found.item.tracksReports;
        }
        return { item: found.item };
    }

    function setPayPeriod(data, workplaceId, payPeriod) {
        const found = locate(data, "workplace", workplaceId);
        if (!found) {
            return { error: "That workplace no longer exists." };
        }
        try {
            const clean = readPayPeriod(payPeriod);
            if (clean) {
                found.item.payPeriod = clean;
            } else {
                delete found.item.payPeriod;
            }
        } catch (error) {
            return { error: error.message };
        }
        return { item: found.item };
    }

    function isInUse(shifts, kind, id) {
        const field = kind === "workplace" ? "workplaceId" : "roleId";
        return shifts.some((shift) => shift[field] === id);
    }

    function remove(data, kind, id, shifts) {
        const found = locate(data, kind, id);
        if (!found) {
            return { error: "That item no longer exists." };
        }
        if (isInUse(shifts, kind, id)) {
            return { error: `This ${kind} has saved shifts, so it can only be archived.` };
        }
        found.siblings.splice(found.siblings.indexOf(found.item), 1);
        return { item: found.item };
    }

    function distinctJobs(shifts) {
        const seen = new Map();
        shifts.forEach((shift) => {
            const name = cleanName(shift.job);
            if (name && !seen.has(name.toLowerCase())) {
                seen.set(name.toLowerCase(), name);
            }
        });
        return [...seen.values()];
    }

    function parseRoleNames(text) {
        const seen = new Set();
        const names = [];
        for (const part of String(text || "").split(/[,\n]/)) {
            const name = cleanName(part);
            if (!name || seen.has(name.toLowerCase())) {
                continue;
            }
            if (name.length > MAX_NAME_LENGTH) {
                return { names: [], error: `Each role must be ${MAX_NAME_LENGTH} characters or fewer.` };
            }
            seen.add(name.toLowerCase());
            names.push(name);
        }
        return { names, error: "" };
    }

    function linkShifts(shifts, workplace) {
        const byName = new Map(workplace.roles.map((role) => [role.name.toLowerCase(), role]));
        let changed = 0;
        const linked = shifts.map((shift) => {
            if (shift.roleId) {
                return shift;
            }
            const role = byName.get(cleanName(shift.job).toLowerCase());
            if (!role) {
                return shift;
            }
            changed += 1;
            return { ...shift, workplaceId: workplace.id, roleId: role.id };
        });
        return { shifts: linked, changed };
    }

    global.Workplaces = {
        STORAGE_KEY,
        RECOVERY_KEY,
        MAX_NAME_LENGTH,
        addRole,
        addWorkplace,
        cleanName,
        distinctJobs,
        emptyData,
        isInUse,
        setTemplate,
        setTracksReports,
        setPayPeriod,
        linkShifts,
        load,
        locate,
        normalizeData,
        parseRoleNames,
        remove,
        rename,
        save,
        setArchived,
        validateName,
    };
})(window);
