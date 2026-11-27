import { registerNumericNodes } from "./numeric_properties.js";

function hasValidGrid({ min, max, step }) {
    return Number.isFinite(min) && Number.isFinite(max) && min <= max
        && Number.isFinite(step) && step > 0 && Number.isFinite(step * 10);
}

function snapValue(value, { min, max, step }) {
    // Connection hooks can run before saved properties are normalized.
    if (!hasValidGrid({ min, max, step })) return value;
    value = Math.min(max, Math.max(min, value));
    if (!Number.isFinite(value)) return value;

    // Use decimal integers so a large minimum or a fractional step doesn't lose precision.
    const decimals = [value, min, max, step].map((number) => {
        const [mantissa, exponent = "0"] = String(number).split("e");
        const [whole, fraction = ""] = mantissa.split(".");
        return { digits: BigInt(whole + fraction), power: Number(exponent) - fraction.length };
    });
    const power = Math.min(...decimals.map((decimal) => decimal.power));
    const [input, lower, upper, increment] = decimals.map(
        (decimal) => decimal.digits * 10n ** BigInt(decimal.power - power),
    );
    const offset = input - lower;
    const nearestStep = (2n * offset + increment) / (2n * increment);
    const lastStep = (upper - lower) / increment;
    const snapped = lower + (nearestStep > lastStep ? lastStep : nearestStep) * increment;
    return Number(`${snapped}e${power}`);
}

registerNumericNodes(["ConfigurableFloat", "ConfigurableFloatSlider"], snapValue, hasValidGrid);
