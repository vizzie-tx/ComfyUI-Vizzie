from .nodes.configurable_float import ConfigurableFloat
from .nodes.configurable_float_slider import ConfigurableFloatSlider
from .nodes.configurable_int import ConfigurableInt
from .nodes.configurable_int_slider import ConfigurableIntSlider

NODE_CLASS_MAPPINGS = {
    "Vizzie_ConfigurableInt": ConfigurableInt,
    "Vizzie_ConfigurableIntSlider": ConfigurableIntSlider,
    "Vizzie_ConfigurableFloat": ConfigurableFloat,
    "Vizzie_ConfigurableFloatSlider": ConfigurableFloatSlider,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "Vizzie_ConfigurableInt": "Configurable Int",
    "Vizzie_ConfigurableIntSlider": "Configurable Int Slider",
    "Vizzie_ConfigurableFloat": "Configurable Float",
    "Vizzie_ConfigurableFloatSlider": "Configurable Float Slider",
}

WEB_DIRECTORY = "./web"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
