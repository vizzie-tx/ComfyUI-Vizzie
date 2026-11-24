from .configurable_float import ConfigurableFloat
from .configurable_float_slider import ConfigurableFloatSlider
from .configurable_int import ConfigurableInt
from .configurable_int_slider import ConfigurableIntSlider

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

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
