import css from "css";

export const DEFAULT_THRESHOLD = 10;

export function createSizeLimit(options) {
    return {
        minWidth: options.minWidth !== undefined ? options.minWidth : 0,
        maxWidth: options.maxWidth !== undefined ? options.maxWidth : Number.POSITIVE_INFINITY,
        minHeight: options.minHeight !== undefined ? options.minHeight : 0,
        maxHeight: options.maxHeight !== undefined ? options.maxHeight : Number.POSITIVE_INFINITY,
    };
}

export function createResizableDivCss(divCss, direction, resizeThreshold, thresholdPosition) {
    const sizeThresholdCSSValue = `${resizeThreshold[direction]}px`;
    const positionThresholdCSSValue = getPositionThresholdValue(
        thresholdPosition,
        resizeThreshold[direction]
    );

    switch (direction) {
        case "s":
            divCss.bottom = positionThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        case "se":
            divCss.right = positionThresholdCSSValue;
            divCss.bottom = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        case "e":
            divCss.right = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            break;
        case "ne":
            divCss.right = positionThresholdCSSValue;
            divCss.top = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        case "n":
            divCss.top = positionThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        case "nw":
            divCss.left = positionThresholdCSSValue;
            divCss.top = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        case "w":
            divCss.left = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            break;
        case "sw":
            divCss.left = positionThresholdCSSValue;
            divCss.bottom = positionThresholdCSSValue;
            divCss.width = sizeThresholdCSSValue;
            divCss.height = sizeThresholdCSSValue;
            break;
        default:
            break;
    }
}

function getPositionThresholdValue(thresholdPosition, resizeThresholdValue) {
    switch (thresholdPosition) {
        case undefined:
        case "in":
            return "0";
        case "center":
            return `-${0.5 * resizeThresholdValue}px`;
        case "out":
            return `-${resizeThresholdValue}px`;
        default:
            if (getVarType(thresholdPosition) === "number") {
                return `-${thresholdPosition * resizeThresholdValue}px`;
            }
            return "0";
    }
}

export function parseDirection(option) {
    let directions = {};
    switch (getVarType(option)) {
        case "Array":
            for (let d of option) directions[d] = null;
            break;
        case "string": {
            let arr = option.match(/([swne]+)/g);
            for (let i in arr) directions[arr[i]] = null;
            break;
        }
        case "Object":
            directions = option;
            break;
        case "undefined":
            directions = {
                s: null,
                se: null,
                e: null,
                ne: null,
                n: null,
                nw: null,
                w: null,
                sw: null,
            };
            break;
        default:
            break;
    }
    return directions;
}

export function parseThreshold(option) {
    let resizeThreshold = createDefaultResizeThreshold();
    switch (getVarType(option)) {
        case "number":
            Object.keys(resizeThreshold).forEach((key) => {
                resizeThreshold[key] = option;
            });
            break;
        case "Object":
            Object.keys(option).forEach((key) => {
                applyThresholdValue(resizeThreshold, key, option[key]);
            });
            break;
        case "undefined":
        default:
            break;
    }
    return resizeThreshold;
}

function createDefaultResizeThreshold() {
    return {
        s: DEFAULT_THRESHOLD,
        se: DEFAULT_THRESHOLD,
        e: DEFAULT_THRESHOLD,
        ne: DEFAULT_THRESHOLD,
        n: DEFAULT_THRESHOLD,
        nw: DEFAULT_THRESHOLD,
        w: DEFAULT_THRESHOLD,
        sw: DEFAULT_THRESHOLD,
    };
}

function applyThresholdValue(resizeThreshold, key, value) {
    if (key === "corner") {
        ["se", "ne", "nw", "sw"].forEach((direction) => {
            resizeThreshold[direction] = value;
        });
        return;
    }

    if (key === "edge") {
        ["e", "n", "s", "w"].forEach((direction) => {
            resizeThreshold[direction] = value;
        });
        return;
    }

    resizeThreshold[key] = value;
}

/**
 * pre precess a css string to an object
 * @param {String} style css style string
 * @returns {Object} {selectorName:{property:value},...,stringifyItems:function,toString:function}
 */
export function cssPreProcess(style) {
    let ast = css.parse(style);
    let result = {};
    for (let rule of ast.stylesheet.rules) {
        let item = {};
        let selector = rule.selectors[0];
        for (let declaration of rule.declarations) {
            item[declaration.property] = declaration.value;
        }
        result[selector] = item;
    }
    result.stringifyItems = function (items) {
        let text = "";
        for (let key in items) {
            text += `${key}: ${items[key]};\n`;
        }
        return text;
    };
    result.toString = function () {
        let text = "";
        for (let selector in this) {
            if (typeof this[selector] !== "function")
                text += `${selector}{\n${this.stringifyItems(this[selector])}}\n`;
        }
        return text;
    };
    return result;
}

/**
 * detect the type of the given variable
 * @param {Object} val any type of variable
 */
function getVarType(val) {
    let type = typeof val;
    if (type === "object") {
        let typeStr = Object.prototype.toString.call(val);
        typeStr = typeStr.split(" ")[1];
        type = typeStr.substring(0, typeStr.length - 1);
    }
    return type;
}
