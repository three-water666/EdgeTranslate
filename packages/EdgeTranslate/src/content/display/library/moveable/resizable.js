/**
 * module: content
 * part: display.moveable
 * function: add resizable function to a specific element
 */

import style from "./resizable.css"; // read plain content from css file
import {
    createResizableDivCss,
    createSizeLimit,
    parseDirection,
    parseThreshold,
    cssPreProcess,
} from "./resizable_helpers.js";

export default class resizable {
    constructor(targetElement, options, handlers) {
        this.targetElement = targetElement;
        this.options = options;
        this.handlers = handlers;

        /* resizable part */
        // store some resize status value
        this.store = {};
        // flag if the element is resizing
        this.resizing = false;
        // store the threshold value for resizable function
        this.resizeThreshold = {};
        // store the activated resizable direction of the target element
        // all valid directions: [s, se, e, ne, n, nw, w, sw]
        this.directions = {};
        this.resizeInitiate();
    }

    /**
     * do some initial thing for resizable function:
     * 1. generate resize start and resize event handlers by wrapping this.resizeStart and this.resize
     * 2. add resizable div elements to the target element
     * 3. add mouse down event listener to the resizable div element
     */
    resizeInitiate() {
        this.resizeEnd();
        // wrap a resize start event handler
        this.resizeStartHandler = (e) => {
            this.resizeStart(e);
        };
        // wrap a resize(resizing) event handler
        this.resizeHandler = (e) => {
            this.resize(e);
        };

        // parse the direction parameter given by users
        this.directions = resizable.parseDirection(this.options.directions);

        // parse the resize threshold parameter given by users
        this.resizeThreshold = resizable.parseThreshold(this.options.threshold);

        // create resizable div elements
        this.createResizableDivElements();

        // initialize the size limit
        this.sizeLimit = createSizeLimit(this.options);
    }

    /**
     * create resizable div elements and their div container according to direction settings
     */
    createResizableDivElements() {
        let cssObject = cssPreProcess(style);
        this.ensureDivContainer(cssObject);

        /* create resizable div elements according to direction settings */
        for (let direction in this.directions) {
            let divCss = cssObject[`#resizable-${direction}`];
            createResizableDivCss(
                divCss,
                direction,
                this.resizeThreshold,
                this.options.thresholdPosition
            );
            this.directions[direction] = this.createResizableDiv(direction, divCss, cssObject);
        }
    }

    ensureDivContainer(cssObject) {
        if (!this.store.divContainer) {
            let divContainer = document.createElement("div");
            let divContainerID = "resizable-container";
            divContainer.id = divContainerID;
            divContainer.style.cssText = cssObject.stringifyItems(cssObject[`#${divContainerID}`]);
            this.targetElement.appendChild(divContainer);
            this.store.divContainer = divContainer;
            this.store.divContainer.addEventListener("mousedown", this.resizeStartHandler);
            return;
        }

        this.store.divContainer.innerHTML = "";
    }

    createResizableDiv(direction, divCss, cssObject) {
        let div = document.createElement("div");
        div.id = `resizable-${direction}`;
        div.setAttribute("class", "resizable-div");
        div.style.cssText = cssObject.stringifyItems(divCss);
        this.store.divContainer.appendChild(div);
        return div;
    }

    /**
     * set new directions for the target resizable elements
     * and recreate div resizable elements
     * @param {Array|string|Object|undefined} directionsOption new direction options
     */
    setDirections(directionsOption) {
        this.directions = resizable.parseDirection(directionsOption);
        this.createResizableDivElements();
    }

    /**
     * parse the direction option in this.options to an object(e.g.: {s:null,se:null})
     * all valid directions: [s, se, e, ne, n, nw, w, sw]
     * support array(e.g.: [s,se]), string(e.g.: "s,se") and object(e.g.: {s:null,se:null}) these types of parameter
     * @param {Array|string|Object|undefined} option new direction option
     * @returns {Object} a parsed direction option object(e.g.: {s:null,se:null})
     */
    static parseDirection(option) {
        return parseDirection(option);
    }

    /**
     * parse new resize threshold value for the target resizable elements
     * and recreate div resizable elements
     * @param {number|Object|undefined} thresholdOption new threshold options
     */
    setThreshold(thresholdOption) {
        this.resizeThreshold = resizable.parseThreshold(thresholdOption);
        this.createResizableDivElements();
    }

    /**
     * parse the threshold option in this.options to an object(e.g.: {s:10,se:10})
     * all valid directions: [s, se, e, ne, n, nw, w, sw]
     * support number(e.g.: 10), object(e.g.: {s:5, se:3, edge: 5, corner: 2}) and undefined these types of parameter
     * Hint: "corner" in object means value of directions:[s,e,n,w]."edge" in object means value of directions:[se,ne,nw,sw]
     * @param {number|Object|undefined} option the threshold option
     * @returns {Object} the parsed result object(e.g.: {s:10,se:10})
     */
    static parseThreshold(option) {
        return parseThreshold(option);
    }

    /**
     * the resize start event handler(mouse down event handler)
     * store some status value of resize start event
     * @param {event} e the mouse down event
     */
    resizeStart(e) {
        this.resizing = true;
        // store the start css translate value. [x,y]
        this.store.startTranslate = [0, 0];
        // store the current css translate value. [x,y]
        this.store.currentTranslate;
        // store the start mouse absolute position. [x,y]
        this.store.startMouse = [e.pageX, e.pageY];
        // store the start element absolute position. [x,y]
        this.store.startElement = [
            this.targetElement.getBoundingClientRect().left + this.options.container.scrollLeft,
            this.targetElement.getBoundingClientRect().top + this.options.container.scrollTop,
        ];
        // store the start size(width and height) of the element
        this.store.startSize = [this.targetElement.offsetWidth, this.targetElement.offsetHeight];
        // store the current width and height of the element
        this.store.currentSize = this.store.startSize;
        // store the activated resizable div elements
        this.store.target = e.target;

        /* call the drag start handler written by the user */
        this.handlers.resizeStart &&
            this.handlers.resizeStart({
                // set the start position
                set: (position) => {
                    this.store.startTranslate = [position[0], position[1]]; // deep copy
                    this.targetElement.style.transform = `translate(${position[0]}px,${position[1]}px)`;
                },
                // stop the following drag and dragEnd events
                stop: () => {
                    this.resizing = false;
                },
                clientX: e.clientX,
                clientY: e.clientY,
                pageX: e.pageX,
                pageY: e.pageY,
            });

        // store the current translate value. used in resize end handler
        this.store.currentTranslate = this.store.startTranslate;

        if (this.resizing) {
            e.preventDefault();
            this.options.container.addEventListener("mousemove", this.resizeHandler);
        }
    }

    /**
     * the resize(resizing) event handler(mouse move event handler)
     * calculate the current translate value and the size of target element
     * call the resize event handler given by users
     * @param {event} e the mouse move event
     */
    resize(e) {
        e.preventDefault();
        let delta = [e.pageX - this.store.startMouse[0], e.pageY - this.store.startMouse[1]];
        let resizeState = this.getResizeState(delta);
        resizeState = this.applySizeLimits(resizeState);
        this.store.currentTranslate = resizeState.translate;
        this.store.currentSize = [resizeState.width, resizeState.height];
        /* call the resize event handler given by users */
        this.handlers.resize &&
            this.handlers.resize({
                inputEvent: e,
                target: this.targetElement,
                width: resizeState.width,
                height: resizeState.height,
                translate: [resizeState.translate[0], resizeState.translate[1]], // the target translate(deep copied) value the element should move
            });
    }

    getResizeState(delta) {
        let width = this.store.startSize[0];
        let height = this.store.startSize[1];
        let translate = [this.store.startTranslate[0], this.store.startTranslate[1]];

        switch (this.store.target) {
            case this.directions["s"]:
                height += delta[1];
                break;
            case this.directions["se"]:
                width += delta[0];
                height += delta[1];
                break;
            case this.directions["e"]:
                width += delta[0];
                break;
            case this.directions["ne"]:
                width += delta[0];
                height -= delta[1];
                translate[1] += delta[1];
                break;
            case this.directions["n"]:
                height -= delta[1];
                translate[1] += delta[1];
                break;
            case this.directions["nw"]:
                width -= delta[0];
                height -= delta[1];
                translate[0] += delta[0];
                translate[1] += delta[1];
                break;
            case this.directions["w"]:
                width -= delta[0];
                translate[0] += delta[0];
                break;
            case this.directions["sw"]:
                width -= delta[0];
                height += delta[1];
                translate[0] += delta[0];
                break;
            default:
                break;
        }

        return { width, height, translate };
    }

    applySizeLimits(resizeState) {
        const nextState = {
            width: resizeState.width,
            height: resizeState.height,
            translate: [resizeState.translate[0], resizeState.translate[1]],
        };

        if (nextState.width < this.sizeLimit.minWidth) {
            nextState.width = this.sizeLimit.minWidth;
            nextState.translate[0] = this.store.currentTranslate[0];
        } else if (nextState.width > this.sizeLimit.maxWidth) {
            nextState.width = this.sizeLimit.maxWidth;
            nextState.translate[0] = this.store.currentTranslate[0];
        }

        if (nextState.height < this.sizeLimit.minHeight) {
            nextState.height = this.sizeLimit.minHeight;
            nextState.translate[1] = this.store.currentTranslate[1];
        } else if (nextState.height > this.sizeLimit.maxHeight) {
            nextState.height = this.sizeLimit.maxHeight;
            nextState.translate[1] = this.store.currentTranslate[1];
        }

        return nextState;
    }

    /**
     * add mouse up event listener
     * remove the resizing event listener
     */
    resizeEnd() {
        this.options.container.addEventListener("mouseup", (e) => {
            if (this.resizing) {
                this.resizing = false;
                this.options.container.removeEventListener("mousemove", this.resizeHandler);
                if (this.handlers.resizeEnd)
                    this.handlers.resizeEnd({
                        target: this.targetElement,
                        inputEvent: e,
                        translate: [this.store.currentTranslate[0], this.store.currentTranslate[1]], // deep copy
                        width: this.store.currentSize[0],
                        height: this.store.currentSize[1],
                    });
            }
        });
    }

    /**
     * resize the target resizable element to the request size
     * @param {Object} resizeParameter {width: resize to the ${width} value, height: resize to the ${height} value}
     * @returns {boolean} if the resize request has been executed successfully
     */
    request(resizeParameter) {
        /* judge resizable condition */
        if (resizeParameter.width === undefined || resizeParameter.height === undefined)
            return false;
        /* start resize */
        // store the start css translate value. [x,y]
        this.store.startTranslate = [];
        this.handlers.resizeStart &&
            this.handlers.resizeStart({
                set: (position) => {
                    this.store.startTranslate = position;
                    this.targetElement.style.transform = `translate(${position[0]}px,${position[1]}px)`;
                },
            });

        /* resize the element */
        this.handlers.resize &&
            this.handlers.resize({
                target: this.targetElement,
                width: resizeParameter.width,
                height: resizeParameter.height,
                translate: this.store.startTranslate,
            });
        /* resize end */
        this.handlers.resizeEnd &&
            this.handlers.resizeEnd({
                translate: this.store.startTranslate,
                target: this.targetElement,
            });
        return true;
    }
}
