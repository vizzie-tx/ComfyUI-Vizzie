import sys

class ConfigurableFloatSlider:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("FLOAT", {
                    "default": 0.0,
                    "min": -sys.maxsize,
                    "max": sys.maxsize,
                    "step": 0.1,
                    "display": "slider",
                }),
            },
        }

    RETURN_TYPES = ("FLOAT",)
    FUNCTION = "execute"
    CATEGORY = "utilities/primitive"

    def execute(self, value):
        return (value,)


