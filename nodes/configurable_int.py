

class ConfigurableInt:
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("INT", { "default": 0,
                                   "min": -9007199254740991,
                                   "max": 9007199254740991,
                                   "step": 1,
                                 }),
            }
        }
    RETURN_TYPES = ("INT",)
    FUNCTION = "execute"
    CATEGORY = "utilities/primitive"

    def execute(self, value):
        return (value,)

