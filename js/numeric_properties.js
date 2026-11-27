import { app } from "../../scripts/app.js";
import { applyProperties, hookPromotedWidget, unhookPromotedWidget, walkGraph, widgetForInput } from "./utils.js";

const propertyNames = ["min", "max", "step"];

function installNumericProperties(nodeType, defaults, snapValue, hasValidGrid) {
    const { onNodeCreated, onPropertyChanged, onConfigure } = nodeType.prototype;

    function propertyValue(name, value) {
        if (value == null || (typeof value === "string" && value.trim() === "")) {
            return defaults[name];
        }
        return typeof value === "string" ? Number(value) : value;
    }

    function isValid(properties) {
        return hasValidGrid(properties) && properties.min >= defaults.min && properties.max <= defaults.max;
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
        applyProperties(this, snapValue);
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
        applyProperties(this, snapValue);
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
        applyProperties(this, snapValue);
        return result;
    };

    return isValid;
}

function installNumericConnections(nodeType, type, snapValue, isValid) {
    const { configure, onConnectionsChange } = nodeType.prototype;
    const { LiteGraph } = window;
    const configuring = new WeakSet();

    function targetConstraints(graph, link) {
        if (String(link.target_id) === "-20") return;

        const target = graph.getNodeById(link.target_id);
        const input = target?.inputs?.[link.target_slot];
        if (input?.type !== type) return;

        const options = widgetForInput(target, input)?.options;
        if (!options) return;

        const { min, max, step, step2 } = options;
        const constraints = { min, max, step: step2 ?? step / 10 };
        if (isValid(constraints)) return constraints;
    }

    nodeType.prototype.configure = function (...args) {
        configuring.add(this);
        try {
            return configure?.apply(this, args);
        } finally {
            configuring.delete(this);
        }
    };

    nodeType.prototype.onConnectionsChange = function (side, slot, connect, link) {
        const result = onConnectionsChange?.apply(this, arguments);
        if (!link) return result;

        if (side === LiteGraph.INPUT && String(link.origin_id) === "-10") {
            const widget = this.widgets?.find((widget) => widget.name === "value");
            if (connect) {
                hookPromotedWidget(this, widget, snapValue);
            } else {
                unhookPromotedWidget(widget);
            }
        }

        const graph = this.graph;
        if (side !== LiteGraph.OUTPUT || !connect || !graph || configuring.has(this)) return result;

        const constraints = targetConstraints(graph, link);
        if (!constraints) return result;

        const { links } = graph;
        const graphLinks = links instanceof Map ? links.values() : Object.values(links ?? {});
        // Keep the current settings while another compatible target is connected.
        for (const other of graphLinks) {
            if (other.id === link.id || other.origin_id !== link.origin_id) continue;
            if (targetConstraints(graph, other)) return result;
        }
        Object.assign(this.properties, constraints);
        applyProperties(this, snapValue);
        return result;
    };
}

export function registerNumericNodes(extensionNames, snapValue, hasValidGrid) {
    for (const name of extensionNames) {
        const nodeName = "Vizzie_" + name;
        app.registerExtension({
            name: "Vizzie." + name,
            beforeRegisterNodeDef(nodeType, nodeData) {
                if (nodeData.name !== nodeName) return;

                const [type, defaults] = nodeData.input.required.value;
                const isValid = installNumericProperties(nodeType, defaults, snapValue, hasValidGrid);
                installNumericConnections(nodeType, type, snapValue, isValid);
            },
            async afterConfigureGraph() {
                walkGraph(app.graph, (node) => {
                    if (node.comfyClass !== nodeName) return;

                    const widget = node.widgets?.find((widget) => widget.name === "value");
                    hookPromotedWidget(node, widget, snapValue);
                });
            },
        });
    }
}
