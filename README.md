# ComfyUI-Vizzie

ComfyUI-Vizzie adds two numeric controls with per-node settings for minimum, maximum, and step. Use them for workflow parameters such as image dimensions, frame counts, and decimal values.

| Node | Output | Default step |
| --- | --- | --- |
| **Configurable Int** | `INT` | `1` |
| **Configurable Float** | `FLOAT` | `0.1` |

## Installation

Clone the repository into your ComfyUI installation's `custom_nodes` directory.

```sh
cd /path/to/ComfyUI/custom_nodes
git clone https://github.com/vizzie-tx/ComfyUI-Vizzie.git
```

Restart ComfyUI and refresh the browser. The nodes require only ComfyUI and its frontend. See the [ComfyUI custom node installation guide](https://docs.comfy.org/installation/install_custom_node) for help finding your installation directory.

## Usage

1. Search for **Configurable Int** or **Configurable Float**, or find both under **utilities → primitive**.
2. Open the node's properties and set `min`, `max`, and `step`. Use whole numbers for Configurable Int and finite numbers for Configurable Float. The step must be positive, and the minimum must be less than or equal to the maximum.
3. Set the node's `value` widget and connect its output to an input of the matching type. If the destination parameter is displayed as a widget, expose it as an input first.

The widget snaps to the nearest value on the grid `min + n × step`, where `n` is a nonnegative integer. Halfway values round to the higher step. When `max` falls between steps, the highest selectable value is the last step below `max`. Clear a property to restore its default, provided the resulting settings are valid.

| Example | Node | `min` | `max` | `step` | Result |
| --- | --- | --- | --- | --- | --- |
| Image width in multiples of 32 | Configurable Int | `32` | `2048` | `32` | `1000` snaps to `992`. |
| Frame counts on a grid starting at 5 | Configurable Int | `5` | `124` | `17` | `24` snaps to `22`. The grid begins at `5`, `22`, `39`. |
| Decimal strength | Configurable Float | `0.05` | `1.0` | `0.2` | `0.38` snaps to `0.45`. The highest selectable value is `0.85`. |

Choose bounds and a step that match the downstream node or model. Snapping happens in the ComfyUI frontend. If you wire an upstream node into `value` or supply it directly in an API prompt, the backend passes that value through unchanged.

## Subgraphs

Both nodes support promoting the `value` widget to the parent subgraph node. Configure `min`, `max`, and `step` on the inner node, then use ComfyUI's widget promotion to expose `value` on the parent. Edit the promoted value from the parent graph. The promoted control uses the inner node's grid and re-snaps its stored value when the constraints change or the workflow loads. See the [ComfyUI subgraph guide](https://docs.comfy.org/interface/features/subgraph) for help working with subgraphs.
