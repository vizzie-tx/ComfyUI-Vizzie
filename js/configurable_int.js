import { app } from "../../scripts/app.js";
import * as utils from "./utils.js";

function snapValue(value, { min, max, step }) {
    if (!Number.isFinite(value)) return value;

    // Connection hooks can run before saved properties are normalized.
    if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max) || min > max
        || !Number.isSafeInteger(step) || step <= 0) return value;

    const lower = BigInt(min);
    const upper = BigInt(max);
    const increment = BigInt(step);
    const clamped = Math.min(max, Math.max(min, value));
    const whole = Math.floor(clamped);

    // Rounding thresholds are integers or half-integers. Keep the half bit
    // separate so doubling a large offset never loses precision.
    const half = clamped - whole >= 0.5 ? 1n : 0n;
    const doubledOffset = 2n * (BigInt(whole) - lower) + half;
    const nearestStep = (doubledOffset + increment) / (2n * increment);
    const lastStep = (upper - lower) / increment;
    const snapped = lower + (nearestStep > lastStep ? lastStep : nearestStep) * increment;
    return Number(snapped);
}

function unhookPromotedWidget(widget) {
    const promotedWidget = widget?._ciPromotedWidget;
    if (!promotedWidget) return;
    
    if (promotedWidget._internalHooked) {
        if (promotedWidget._ciSetValue) {
            promotedWidget.setValue = promotedWidget._ciSetValue;
        } else {
            delete promotedWidget.setValue;
        }
        delete promotedWidget._ciSetValue;
        delete promotedWidget._internalHooked;
    }
    delete widget._ciPromotedWidget;
}

function hookPromotedWidget(node, widget) {
    if (!widget) return;
    const promotedWidget = utils.subgraphWidgetForWidget(node, widget);

    if (promotedWidget && promotedWidget === widget._ciPromotedWidget) {
        synchronizeWidget(promotedWidget, node.properties);
        return;
    }
    unhookPromotedWidget(widget);
    if (!promotedWidget || promotedWidget._internalHooked) return;
    promotedWidget._internalHooked = true;

    const origSetValue = promotedWidget.setValue;

    promotedWidget._ciSetValue = origSetValue;
    promotedWidget.setValue = function (value, ...args) {
        const snapped = snapValue(value, node.properties);
        if (snapped !== promotedWidget.value) promotedWidget.value = snapped;
        return promotedWidget._ciSetValue?.call(promotedWidget, snapped, ...args);
    };
    widget._ciPromotedWidget = promotedWidget;
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
    if (widget._ciPromotedWidget) {
        synchronizeWidget(widget._ciPromotedWidget, node.properties);
    }
    node.setDirtyCanvas?.(true);
}

for (const ext of ["ConfigurableInt", "ConfigurableIntSlider"]) {
    app.registerExtension({
        name: "Vizzie." + ext,
        beforeRegisterNodeDef(nodeType, nodeData) {
            if (nodeData.name !== ("Vizzie_" + ext)) return;

            const [, defaults] = nodeData.input.required.value;
            const propertyNames = ["min", "max", "step"];
            const { onNodeCreated, onPropertyChanged, onConfigure, onConnectionsChange} = nodeType.prototype;
            const { LiteGraph } = window;

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
                if (node.comfyClass === ("Vizzie_" + ext)) {
                    const widget = node.widgets?.find((widget) => widget.name === "value");
                    if (widget) {
                        hookPromotedWidget(node, widget);
                    }
                }
            });
        },
    });
};
