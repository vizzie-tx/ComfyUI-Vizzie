import { app } from "../../scripts/app.js";
import * as utils from "./utils.js";

function hasValidGrid({ min, max, step }) {
    return Number.isFinite(min) && Number.isFinite(max) && min <= max
        && Number.isFinite(step) && step > 0 && Number.isFinite(step * 10);
}

function snapValue(value, { min, max, step }) {
    // Connection hooks can run before saved properties are normalized.
    if (!hasValidGrid({ min, max, step })) return value;
    value = Math.min(max, Math.max(min, value));
    if (!Number.isFinite(value)) return value;

    // Use decimal integers so a large minimum or a fractional step doesn't lose precision.
    const decimals = [value, min, max, step].map((number) => {
        const [mantissa, exponent = "0"] = String(number).split("e");
        const [whole, fraction = ""] = mantissa.split(".");
        return { digits: BigInt(whole + fraction), power: Number(exponent) - fraction.length };
    });
    const power = Math.min(...decimals.map((decimal) => decimal.power));
    const [input, lower, upper, increment] = decimals.map(
        (decimal) => decimal.digits * 10n ** BigInt(decimal.power - power),
    );
    const offset = input - lower;
    const nearestStep = (2n * offset + increment) / (2n * increment);
    const lastStep = (upper - lower) / increment;
    const snapped = lower + (nearestStep > lastStep ? lastStep : nearestStep) * increment;
    return Number(`${snapped}e${power}`);
}

function unhookPromotedWidget(widget) {
    const promotedWidget = widget?._cfPromotedWidget;
    if (!promotedWidget) return;

    if (promotedWidget._internalHooked) {
        if (promotedWidget._cfSetValue) {
            promotedWidget.setValue = promotedWidget._cfSetValue;
        } else {
            delete promotedWidget.setValue;
        }
        delete promotedWidget._cfSetValue;
        delete promotedWidget._internalHooked;
    }
    delete widget._cfPromotedWidget;
}

function hookPromotedWidget(node, widget) {
    if (!widget) return;
    const promotedWidget = utils.subgraphWidgetForWidget(node, widget);

    if (promotedWidget && promotedWidget === widget._cfPromotedWidget) {
        synchronizeWidget(promotedWidget, node.properties);
        return;
    }
    unhookPromotedWidget(widget);
    if (!promotedWidget || promotedWidget._internalHooked) return;
    promotedWidget._internalHooked = true;

    const origSetValue = promotedWidget.setValue;

    promotedWidget._cfSetValue = origSetValue;
    promotedWidget.setValue = function (value, ...args) {
        const snapped = snapValue(value, node.properties);
        if (snapped !== promotedWidget.value) promotedWidget.value = snapped;
        return promotedWidget._cfSetValue?.call(promotedWidget, snapped, ...args);
    };
    widget._cfPromotedWidget = promotedWidget;
    synchronizeWidget(promotedWidget, node.properties);
}

function synchronizeWidget(widget, { min, max, step }) {
    Object.assign(widget.options, {
        min,
        max,
        // Legacy LiteGraph divides its step option by 10.
        step: step * 10,
        step2: step,
    });
    const value = widget.value;
    const snapped = snapValue(value, { min, max, step });
    if (Number.isFinite(snapped) && snapped !== value) widget.value = snapped;
}

function applyProperties(node) {
    const widget = node.widgets?.find((widget) => widget.name === "value");
    if (!widget) return;

    synchronizeWidget(widget, node.properties);
    if (widget._cfPromotedWidget) {
        synchronizeWidget(widget._cfPromotedWidget, node.properties);
    }
    node.setDirtyCanvas?.(true);
}

app.registerExtension({
    name: "Vizzie.ConfigurableFloat",
    beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "ConfigurableFloat") return;

        const [, defaults] = nodeData.input.required.value;
        const propertyNames = ["min", "max", "step"];
        const { onNodeCreated, onPropertyChanged, onConfigure, onConnectionsChange } = nodeType.prototype;
        const { LiteGraph } = window;

        function propertyValue(name, value) {
            if (value == null || (typeof value === "string" && value.trim() === "")) {
                return defaults[name];
            }
            return typeof value === "string" ? Number(value) : value;
        }

        function isValid(properties) {
            return hasValidGrid(properties) && properties.min >= defaults.min && properties.max <= defaults.max;
        }

        nodeType.prototype.onConnectionsChange = function(side, slot, connect, link_info, output) {
            const result = onConnectionsChange?.apply(this, arguments);
            if (!link_info) return;

            if (side == LiteGraph.INPUT && link_info.origin_id == "-10") {
                // Reconcile connection
                const widget = this.widgets?.find((widget) => widget.name === "value");
                if (connect) {
                    hookPromotedWidget(this, widget);
                } else {
                    unhookPromotedWidget(widget);
                }
            }

            return result;
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
    async afterConfigureGraph() {
        utils.walkGraph(app.graph, (node) => {
            if (node.comfyClass === "ConfigurableFloat") {
                const widget = node.widgets?.find((widget) => widget.name === "value");
                if (widget) {
                    hookPromotedWidget(node, widget);
                }
            }
        });
    },
});
