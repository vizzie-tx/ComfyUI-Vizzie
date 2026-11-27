import { app } from "../../scripts/app.js";

const promotedWidgetHooks = new WeakMap();
const hookedPromotedWidgets = new WeakSet();

export function isSubgraphIO(slot) {
  return slot != null && Array.isArray(slot.linkIds) && 'parent' in slot
}

export function walkGraph(graph, callback) {
  for (const node of graph.nodes ?? []) {
    callback(node, graph)
    if (node.subgraph) walkGraph(node.subgraph, callback)
  }
}

export function getSubgraphNode(targetSubgraph, rootGraph = app.graph) {
    if (!targetSubgraph || targetSubgraph === rootGraph) return null;

    for (const node of rootGraph.nodes ?? []) {
        if (node.subgraph === targetSubgraph) {
            return node;
        }
        if (node.subgraph) {
            const found = getSubgraphNode(targetSubgraph, node.subgraph);
            if (found) return found;
        }
    }
    return null;
}

export function widgetForInput(node, input) {
    if (!input) return;

    const name = input.widget?.name ?? input.name;
    return node.getWidgetFromSlot?.(input)
        ?? node.widgets?.find((widget) => widget.name === name);
}

export function subgraphWidgetForWidget(node, w) {
    const subgraph = node.graph;
    const subgraphNode = getSubgraphNode(subgraph)
    
    if (!subgraphNode) return null;
    
    for (const input of subgraph.inputs) {
        for (const linkId of input.linkIds ?? []) {
            const link = subgraph.getLink(linkId);
            if (!link) continue;

            const targetNode = subgraph.getNodeById(link.target_id);
            if (targetNode !== node) continue;

            const slot = targetNode.inputs?.[link.target_slot];
            const targetWidget = widgetForInput(targetNode, slot);

            if (targetWidget !== w) continue;

            const hostInput = subgraphNode.inputs.find(
                i => i._subgraphSlot === input
            );

            return subgraphNode.widgets?.find(
                widget => widget.widgetId === hostInput?.widgetId
            ) ?? null;
        }
    }

    return null;
}

export function synchronizeWidget(widget, { min, max, step }, snapValue) {
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

export function unhookPromotedWidget(widget) {
    const hook = promotedWidgetHooks.get(widget);
    if (!hook) return;

    const { promotedWidget, originalSetter, hadOwnSetter } = hook;
    if (hadOwnSetter) {
        promotedWidget.setValue = originalSetter;
    } else {
        delete promotedWidget.setValue;
    }
    hookedPromotedWidgets.delete(promotedWidget);
    promotedWidgetHooks.delete(widget);
}

export function hookPromotedWidget(node, widget, snapValue) {
    if (!widget) return;
    const promotedWidget = subgraphWidgetForWidget(node, widget);

    if (promotedWidget && promotedWidget === promotedWidgetHooks.get(widget)?.promotedWidget) {
        synchronizeWidget(promotedWidget, node.properties, snapValue);
        return;
    }
    unhookPromotedWidget(widget);
    if (!promotedWidget || hookedPromotedWidgets.has(promotedWidget)) return;

    const originalSetter = promotedWidget.setValue;
    const hadOwnSetter = Object.hasOwn(promotedWidget, "setValue");
    promotedWidget.setValue = function (value, ...args) {
        const snapped = snapValue(value, node.properties);
        if (snapped !== promotedWidget.value) promotedWidget.value = snapped;
        return originalSetter?.call(promotedWidget, snapped, ...args);
    };
    promotedWidgetHooks.set(widget, { promotedWidget, originalSetter, hadOwnSetter });
    hookedPromotedWidgets.add(promotedWidget);
    synchronizeWidget(promotedWidget, node.properties, snapValue);
}

export function applyProperties(node, snapValue) {
    const widget = node.widgets?.find((widget) => widget.name === "value");
    if (!widget) return;

    synchronizeWidget(widget, node.properties, snapValue);
    const promotedWidget = promotedWidgetHooks.get(widget)?.promotedWidget;
    if (promotedWidget) synchronizeWidget(promotedWidget, node.properties, snapValue);
    node.setDirtyCanvas?.(true);
}
