import { app } from "../../scripts/app.js";

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
    widget.value = Math.min(max, Math.max(min, widget.value));
    node.setDirtyCanvas?.(true);
}

app.registerExtension({
    name: "Vizzie.ConfigurableFloat",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "ConfigurableFloat") return;

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
            return Number.isFinite(min) && Number.isFinite(max)
                && min >= defaults.min && max <= defaults.max && min <= max
                && Number.isFinite(step) && step > 0 && Number.isFinite(step * 10);
        }

        nodeType.prototype.onNodeCreated = function (...args) {
            const result = onNodeCreated?.apply(this, args);
            for (const name of propertyNames) {
                // The numeric editor converts blank input to zero before calling the hook.
                this.addProperty(name, defaults[name], "string");
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
