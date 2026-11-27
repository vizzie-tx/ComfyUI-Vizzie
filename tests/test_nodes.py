import importlib.util
import sys
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]


class NodeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Load the root entry point as a package, as ComfyUI does for custom nodes.
        spec = importlib.util.spec_from_file_location("vizzie_test_extension", ROOT / "__init__.py")
        cls.extension = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {spec.name: cls.extension}):
            spec.loader.exec_module(cls.extension)

    def test_node_contracts(self):
        cases = [
            ("Int", "Configurable Int", "INT", 0, 1, 2**53 - 1, False, -57),
            ("IntSlider", "Configurable Int Slider", "INT", 0, 1, 2**53 - 1, True, 57),
            ("Float", "Configurable Float", "FLOAT", 0.0, 0.1, sys.maxsize, False, -0.375),
            ("FloatSlider", "Configurable Float Slider", "FLOAT", 0.0, 0.1, sys.maxsize, True, 0.375),
        ]
        for suffix, title, kind, default, step, bound, slider, value in cases:
            with self.subTest(node=suffix):
                node_id = f"Vizzie_Configurable{suffix}"
                node = self.extension.NODE_CLASS_MAPPINGS[node_id]
                self.assertEqual(self.extension.NODE_DISPLAY_NAME_MAPPINGS[node_id], title)
                self.assertEqual(node.CATEGORY, "utilities/primitive")
                self.assertEqual(node.RETURN_TYPES, (kind,))

                options = {"default": default, "min": -bound, "max": bound, "step": step}
                if slider:
                    options["display"] = "slider"
                self.assertEqual(node.INPUT_TYPES(), {"required": {"value": (kind, options)}})
                self.assertEqual(getattr(node(), node.FUNCTION)(value=value), (value,))

    def test_frontend_entry_points_exist(self):
        web = ROOT / self.extension.WEB_DIRECTORY
        for filename in ("configurable_int.js", "configurable_float.js"):
            with self.subTest(filename=filename):
                self.assertTrue((web / filename).is_file())
