import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { pathToFileURL } from "node:url";

// Reproduce the extension URLs used by ComfyUI and stub only its app module.
const root = await mkdtemp(join(tmpdir(), "vizzie-tests-"));
after(() => rm(root, { recursive: true, force: true }));
const extension = join(root, "extensions", "vizzie");
await mkdir(join(root, "scripts"), { recursive: true });
await writeFile(join(root, "package.json"), '{"type":"module"}');
await writeFile(join(root, "scripts", "app.js"), `
    export const app = {
        extensions: new Map(),
        registerExtension(extension) { this.extensions.set(extension.name, extension); },
    };
`);
await cp(new URL("../web/", import.meta.url), extension, { recursive: true });
const { app } = await import(pathToFileURL(join(root, "scripts", "app.js")));
await import(pathToFileURL(join(extension, "configurable_int.js")));
await import(pathToFileURL(join(extension, "configurable_float.js")));
globalThis.window = { LiteGraph: { INPUT: 1, OUTPUT: 2 } };

function createNode(suffix, type, defaults) {
    class NumericNode {
        properties = {};
        widgets = [{ name: "value", options: {}, value: 0 }];

        addProperty(name, value) {
            this.properties[name] = value;
        }
    }
    const name = "Configurable" + suffix;
    app.extensions.get("Vizzie." + name).beforeRegisterNodeDef(NumericNode, {
        name: "Vizzie_" + name,
        input: { required: { value: [type, defaults] } },
    });
    const node = new NumericNode();
    node.onNodeCreated();
    return node;
}

const intDefaults = { min: -Number.MAX_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER, step: 1 };
const floatDefaults = { min: -1e18, max: 1e18, step: 0.1 };

for (const suffix of ["Int", "IntSlider"]) {
    test(suffix + " snaps on a grid relative to its minimum", () => {
        const node = createNode(suffix, "INT", intDefaults);
        Object.assign(node.properties, { min: "5", max: "123", step: "17" });
        node.onConfigure();
        assert.deepEqual(node.properties, { min: 5, max: 123, step: 17 });

        const [widget] = node.widgets;
        for (const [input, expected] of [[0, 5], [13.49, 5], [13.5, 22], [24, 22], [200, 107]]) {
            widget.callback(input);
            assert.equal(widget.value, expected);
        }
    });
}

for (const suffix of ["Float", "FloatSlider"]) {
    test(suffix + " rounds decimal ties and honors an off-grid maximum", () => {
        const node = createNode(suffix, "FLOAT", floatDefaults);
        Object.assign(node.properties, { min: 0.05, max: 1, step: 0.2 });
        node.onConfigure();

        const [widget] = node.widgets;
        for (const [input, expected] of [[-1, 0.05], [0.15, 0.25], [0.38, 0.45], [2, 0.85]]) {
            widget.callback(input);
            assert.equal(widget.value, expected);
        }
    });
}

test("invalid property edits are rejected and invalid saved grids restore defaults", () => {
    const node = createNode("Int", "INT", intDefaults);
    assert.equal(node.onPropertyChanged("step", "0", 1), false);
    assert.deepEqual(node.properties, intDefaults);
    Object.assign(node.properties, { min: 20, max: 10, step: 2 });
    node.onConfigure();
    assert.deepEqual(node.properties, intDefaults);
});
