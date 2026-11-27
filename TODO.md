# ComfyUI-Vizzie roadmap

## 1. Configurable Combo

- [ ] Prototype a native Combo connection using a checkpoint or sampler dropdown as the source of available options. Pass the exact selected value to the connected input.
- [ ] Add persistent **Include** and **Exclude** properties. Split each field on `|`, trim whitespace, and discard empty terms. Match literal substrings case-insensitively.
- [ ] When the include set is non-empty, keep options matching any include term. Otherwise start with all options. Then remove options matching any exclude term. Preserve the source order and exact values.
- [ ] Keep the selected value when it still appears in the filtered list. If the selection becomes unavailable or no options match, show why and require a valid selection before queueing.
- [ ] Verify save/reload, copy/paste, and promotion to a parent subgraph. Confirm that the promoted dropdown shows the filtered options and that the queued prompt carries the exact selected value.
- [ ] Consider a configurable separator if real option names contain literal pipes. Friendly labels for underlying values and rules for multiple connected targets can follow once the single-target picker works.

For example, include `sdxl/ | flux/` and exclude `experimental | backup` to show production checkpoints from either family. The filter defines the manual picker's menu each time the workflow opens.

## 2. JSON Presets

- [ ] Prototype workflow-defined output slots and verify that ComfyUI accepts the linked types when queueing and preserves the links across save/reload. Use actual width, height, steps, and CFG inputs.
- [ ] Accept a JSON object with an ordered `outputs` array of names and a `presets` object mapping names to value arrays. Validate that every preset has one value per output and that output names are unique. Report row length and value errors with the preset and output names where applicable.
- [ ] Infer each output's type across all presets. Whole numbers infer `INT`, and a fractional value widens a numeric column to `FLOAT`. Uniform string and Boolean columns infer `STRING` and `BOOLEAN`. Reject mixed kinds, including Booleans mixed with numbers, as well as nulls, objects, and nested arrays.
- [ ] Show preset names in a dropdown and emit the values from the selected row in output order. Preserve the selection by name when the JSON changes. Require a fresh selection if that preset is removed.
- [ ] Detect edits that would change the type or position of a wired output. Surface the affected connections before applying a change that could break a link or route a different value to it.
- [ ] Consider named derived outputs using a small set of static operations such as multiply, divide, clamp, and round to a multiple. For example, derive aligned dimensions from a stored base size and scale.

```json
{
  "outputs": ["width", "height", "steps", "cfg"],
  "presets": {
    "Draft": [768, 512, 12, 4],
    "Portrait": [832, 1216, 24, 5.5],
    "Square": [1024, 1024, 28, 6]
  }
}
```

The first three outputs infer `INT`, and `cfg` infers `FLOAT`. This covers named resolution presets and can also bundle related sampling settings.

## 3. Configurable Boolean

- [ ] Evaluate the benefit in the example control panel. The main use case is exposing an existing toggle while turning a workflow into a reusable subgraph.
- [ ] On the first compatible widget connection, copy the widget name and current value, including `false`. Use that name for the node title and connected subgraph input and output ports, preserving existing custom port labels.
- [ ] Preserve the saved value and naming on reload. Reuse connection and subgraph naming hooks from the numeric controls or Combo where practical.
- [ ] Keep a single `BOOLEAN` output. Authors can use a NOT node when they need the complementary value.

## Supporting work

- [ ] Build a sample subgraph control panel using numeric sliders, a filtered Combo, and a JSON Presets selector. Try the Boolean prototype in the same example and check promotion, naming, and reload behavior in ComfyUI.
- [ ] Verify CI on GitHub and record the ComfyUI and frontend versions used for browser smoke tests. Keep Registry publication disabled until release preparation.
- [ ] Revisit other control ideas after the three candidates. A prompt template could combine a promoted multiline field with an author-set prefix and suffix. An image input could expose a native upload picker and return image, mask, width, and height. A seed control needs a concrete repeat/new-seed workflow that benefits over ComfyUI's generation controls.
