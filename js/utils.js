import { app } from "../../scripts/app.js";

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
            const targetWidget = targetNode.getWidgetFromSlot(slot);

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
