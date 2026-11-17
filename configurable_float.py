import sys


class ConfigurableFloat:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("FLOAT", {"default": 0.0, "min": -sys.maxsize, "max": sys.maxsize, "step": 0.1}),
            },
        }

    RETURN_TYPES = ("FLOAT",)
    FUNCTION = "execute"
    CATEGORY = "utilities/primitive"

    def execute(self, value):
        return (value,)


NODE_CLASS_MAPPINGS = {"ConfigurableFloat": ConfigurableFloat}
