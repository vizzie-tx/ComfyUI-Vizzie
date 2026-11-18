from .configurable_float import ConfigurableFloat
from .configurable_int import ConfigurableInt

NODE_CLASS_MAPPINGS = {
    "ConfigurableInt": ConfigurableInt,
    "ConfigurableFloat": ConfigurableFloat
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "ConfigurableInt": "Configurable Int",
    "ConfigurableFloat": "Configurable Float"
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
