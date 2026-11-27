import { registerNumericNodes } from "./numeric_properties.js";

function hasValidGrid({ min, max, step }) {
    return Number.isSafeInteger(min) && Number.isSafeInteger(max) && min <= max
        && Number.isSafeInteger(step) && step > 0;
}

function snapValue(value, { min, max, step }) {
    if (!Number.isFinite(value)) return value;

    // Connection hooks can run before saved properties are normalized.
    if (!hasValidGrid({ min, max, step })) return value;

    const lower = BigInt(min);
    const upper = BigInt(max);
    const increment = BigInt(step);
    const clamped = Math.min(max, Math.max(min, value));
    const whole = Math.floor(clamped);

    // Rounding thresholds are integers or half-integers. Keep the half bit
    // separate so doubling a large offset never loses precision.
    const half = clamped - whole >= 0.5 ? 1n : 0n;
    const doubledOffset = 2n * (BigInt(whole) - lower) + half;
    const nearestStep = (doubledOffset + increment) / (2n * increment);
    const lastStep = (upper - lower) / increment;
    const snapped = lower + (nearestStep > lastStep ? lastStep : nearestStep) * increment;
    return Number(snapped);
}

registerNumericNodes(["ConfigurableInt", "ConfigurableIntSlider"], snapValue, hasValidGrid);
