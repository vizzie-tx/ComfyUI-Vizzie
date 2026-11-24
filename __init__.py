from .configurable_float import ConfigurableFloat
from .configurable_int import ConfigurableInt

NODE_CLASS_MAPPINGS = {
    "Vizzie_ConfigurableInt": ConfigurableInt,
    "Vizzie_ConfigurableFloat": ConfigurableFloat
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Vizzie_ConfigurableInt": "Configurable Int",
    "Vizzie_ConfigurableFloat": "Configurable Float"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
