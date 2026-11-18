import { app } from "../../scripts/app.js";

function snapValue(value, { min, max, step }) {
    if (!Number.isFinite(value)) return value;

    // Find the nearest permitted step, anchored at min.
    const steps = Math.round((value - min) / step);
    const lastStep = Math.floor((max - min) / step);

    return min + Math.max(0, Math.min(steps, lastStep)) * step;
}

function applyProperties(node) {
    const widget = node.widgets?.find((widget) => widget.name === "value");
    if (!widget) return;

    const { min, max, step } = node.properties;
    Object.assign(widget.options, {
        min,
        max,
        // Legacy LiteGraph divides its step option by 10.
        step: step * 10,
        step2: step,
    });
    widget.value = snapValue(widget.value, node.properties);
    node.setDirtyCanvas?.(true);
}

app.registerExtension({
    name: "Vizzie.ConfigurableInt",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "ConfigurableInt") return;

        const [, defaults] = nodeData.input.required.value;
        const propertyNames = ["min", "max", "step"];
        const { onNodeCreated, onPropertyChanged, onConfigure } = nodeType.prototype;

        function propertyValue(name, value) {
            if (value == null || (typeof value === "string" && value.trim() === "")) {
                return defaults[name];
            }
            return typeof value === "string" ? Number(value) : value;
        }

	function isValid({ min, max, step }) {
            return Number.isSafeInteger(min)
                && Number.isSafeInteger(max)
                && Number.isSafeInteger(step)
                && min >= defaults.min
                && max <= defaults.max
                && min <= max
                && step > 0;
        }

        nodeType.prototype.onNodeCreated = function (...args) {
            const result = onNodeCreated?.apply(this, args);
            for (const name of propertyNames) {
                // The numeric editor converts blank input to zero before calling the hook.
                this.addProperty(name, defaults[name], "string");
            }
            const widget = this.widgets?.find((widget) => widget.name === "value");
            if (widget) {
                const { callback } = widget;
                const node = this;
                widget.callback = function (value, ...args) {
                    const snapped = snapValue(value, node.properties);
                    if (widget.value !== snapped) widget.value = snapped;
                    return callback?.call(this, snapped, ...args);
                };
            }
            applyProperties(this);
            return result;
        };

        nodeType.prototype.onPropertyChanged = function (name, value, previous) {
            const result = onPropertyChanged?.call(this, name, value, previous);
            // Workflow loading restores properties individually before onConfigure.
            if (result === false || previous === undefined || !propertyNames.includes(name)) {
                return result;
            }
            const nextValue = propertyValue(name, value);
            if (!isValid({ ...this.properties, [name]: nextValue })) return false;
            this.properties[name] = nextValue;
            applyProperties(this);
            return result;
        };

        nodeType.prototype.onConfigure = function (...args) {
            const result = onConfigure?.apply(this, args);
            for (const name of propertyNames) {
                this.properties[name] = propertyValue(name, this.properties[name]);
            }
            if (!isValid(this.properties)) {
                for (const name of propertyNames) {
                    this.properties[name] = defaults[name];
                }
            }
            applyProperties(this);
            return result;
        };
    },
});
