import sys


class ConfigurableInt:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("INT", {"default": 0, "min": -sys.maxsize, "max": sys.maxsize, "step": 1}),
            },
        }

    RETURN_TYPES = ("INT",)
    FUNCTION = "execute"
    CATEGORY = "utilities/primitive"

    def execute(self, value):
        return (value,)


NODE_CLASS_MAPPINGS = {"ConfigurableInt": ConfigurableInt}
