import Popper from '../popper/index.js';

const DEFAULT_OPTIONS = {
    container: false,
    delay: 0,
    html: false,
    placement: 'top',
    title: '',
    template: '<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>',
    trigger: 'hover focus',
    offset: 0,
};

export default class Tooltip {
    /**
     * Create a new Tooltip.js instance
     * @class Tooltip
     * @param {HTMLElement} reference - The reference element used to position the tooltip
     * @param {Object} options
     * @param {String} options.placement=bottom
     *      Placement of the popper accepted values: `top(-start, -end), right(-start, -end), bottom(-start, -right),
     *      left(-start, -end)`
     *
     * @param {HTMLElement} reference - The DOM node used as reference of the tooltip (it can be a jQuery element).
     * @param {Object} options - Configuration of the tooltip
     * @param {HTMLElement|String|false} options.container=false - Append the tooltip to a specific element.
     * @param {Number|Object} options.delay=0
     *      Delay showing and hiding the tooltip (ms) - does not apply to manual trigger type.
     *      If a number is supplied, delay is applied to both hide/show.
     *      Object structure is: `{ show: 500, hide: 100 }`
     * @param {Boolean} options.html=false - Insert HTML into the tooltip. If false, the content will inserted with `innerText`.
     * @param {String|PlacementFunction} options.placement='top' - One of the allowed placements, or a function returning one of them.
     * @param {String} options.template='<div class="tooltip" role="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'
     *      Base HTML to used when creating the tooltip.
     *      The tooltip's `title` will be injected into the `.tooltip-inner` or `.tooltip__inner`.
     *      `.tooltip-arrow` or `.tooltip__arrow` will become the tooltip's arrow.
     *      The outermost wrapper element should have the `.tooltip` class.
     * @param {String|HTMLElement|TitleFunction} options.title='' - Default title value if `title` attribute isn't present.
     * @param {String} options.trigger='hover focus'
     *      How tooltip is triggered - click | hover | focus | manual.
     *      You may pass multiple triggers; separate them with a space. `manual` cannot be combined with any other trigger.
     * @param {HTMLElement} options.boundariesElement
     *      The element used as boundaries for the tooltip. For more information refer to Popper.js'
     *      [boundariesElement docs](https://popper.js.org/popper-documentation.html)
     * @param {Number|String} options.offset=0 - Offset of the tooltip relative to its reference. For more information refer to Popper.js'
     *      [offset docs](https://popper.js.org/popper-documentation.html)
     * @return {Object} instance - The generated tooltip instance
     */
    constructor(reference, options) {
        // apply user options over default ones
        options = Object.assign({}, DEFAULT_OPTIONS, options);

        reference.jquery && (reference = reference[0]);

        // cache reference and options
        this.reference = reference;
        this.options = options;

        // get events list
        const events = typeof options.trigger === 'string' ? options.trigger.split(' ').filter((trigger) => {
            return ['click', 'hover', 'focus'].indexOf(trigger) !== -1;
        }) : [];

        // set initial state
        this._isOpen = false;

        // set event listeners
        this._setEventListeners(reference, events, options);
    }

    //
    // Public methods
    //

    /**
     * Reveals an element's tooltip. This is considered a "manual" triggering of the tooltip.
     * Tooltips with zero-length titles are never displayed.
     * @memberof Tooltip
     */
    show = () => this._show(this.reference, this.options);

    /**
     * Hides an element’s tooltip. This is considered a “manual” triggering of the tooltip.
     * @memberof Tooltip
     */
    hide = () => this._hide();

    /**
     * Hides and destroys an element’s tooltip.
     * @memberof Tooltip
     */
    dispose = () => this._dispose();

    /**
     * Toggles an element’s tooltip. This is considered a “manual” triggering of the tooltip.
     * @memberof Tooltip
     */
    toggle = () => {
        if (this._isOpen) {
            return this.hide();
        } else {
            return this.show();
        }
    }

    //
    // Defaults
    //
    arrowSelector = '.tooltip-arrow, .tooltip__arrow';
    innerSelector = '.tooltip-inner, .tooltip__inner';

    //
    // Private methods
    //

    _events = [];

    /**
     * Creates a new tooltip node
     * @memberof Tooltip
     * @private
     * @param {HTMLElement} reference
     * @param {String} template
     * @param {String|HTMLElement|TitleFunction} title
     * @param {Boolean} allowHtml
     * @return {HTMLelement} tooltipNode
     */
    _create(reference, template, title, allowHtml) {
        // create tooltip element
        const tooltipGenerator = window.document.createElement('div');
        tooltipGenerator.innerHTML = template;
        const tooltipNode = tooltipGenerator.childNodes[0];

        // add title to tooltip
        const titleNode = tooltipGenerator.querySelector(this.innerSelector);
        if (title.nodeType === 1) {
            // if title is a node, append it only if allowHtml is true
            allowHtml && titleNode.appendChild(title);
        }
        else if (Popper.Utils.isFunction(title)) {
            // if title is a function, call it and set innerText or innerHtml depending by `allowHtml` value
            const titleText = title.call(reference);
            allowHtml ? (titleNode.innerHTML = titleText) : (titleNode.innerText = titleText);
        }
        else {
            // if it's just a simple text, set innerText or innerHtml depending by `allowHtml` value
            allowHtml ? (titleNode.innerHTML = title) : (titleNode.innerText = title);
        }

        // return the generated tooltip node
        return tooltipNode;
    }

    _show(reference, options) {
        // don't show if it's already visible
        if (this._isOpen) { return this; }
        this._isOpen = true;

        // if the tooltipNode already exists, just show it
        if (this._tooltipNode) {
            this._tooltipNode.style.display = '';
            this.popperInstance.update();
            return this;
        }

        // get title
        const title = reference.getAttribute('title') || options.title;

        // don't show tooltip if no title is defined
        if (!title) { return this; }

        // create tooltip node
        const tooltipNode = this._create(reference, options.template, title, options.html);

        // append tooltip to container: container = false we pick the parent node of the reference
        var container = options.container === false ? reference.parentNode : options.container;

        this._append(tooltipNode, container);

        const popperOptions = {
            placement: options.placement,
            arrowElement: this.arrowSelector,
        };

        if (options.boundariesElement) {
            popperOptions.boundariesElement = options.boundariesElement;
        }

        this.popperInstance = new Popper(reference, tooltipNode, popperOptions);

        this._tooltipNode = tooltipNode;

        return this;
    }


    _hide(/*reference, options*/) {
        // don't hide if it's already hidden
        if (!this._isOpen) { return this; }

        this._isOpen = false;

        // hide tooltipNode
        this._tooltipNode.style.display = 'none';

        return this;
    }

    _dispose() {
        if (this._tooltipNode) {
            this._hide();

            // destroy instance
            this.popperInstance.destroy();

            // remove event listeners
            this._events.forEach(({func, event }) => {
                this._tooltipNode.removeEventListener(event, func);
            });
            this._events = [];

            // destroy tooltipNode
            this._tooltipNode.parentNode.removeChild(this._tooltipNode);
            this._tooltipNode = null;
        }
        return this;
    }

    _findContainer(container) {
        // if container is a query, get the relative element
        if (typeof container === 'string') {
            container = window.document.querySelector(container);
        }
        // if container is `false`, set it to body
        else if (container === false) {
            container = window.document.body;
        }
        return container;
    }

    /**
     * Append tooltip to container
     * @memberof Tooltip
     * @private
     * @param {HTMLElement} tooltip
     * @param {HTMLElement|String|false} container
     */
    _append(tooltipNode, container) {
        container.appendChild(tooltipNode);
    }

    _setEventListeners(reference, events, options) {
        const directEvents = events.map((event) => {
            switch(event) {
                case 'hover':
                    return 'mouseenter';
                case 'focus':
                    return 'focus';
                case 'click':
                    return 'click';
                default:
                    return;
            }
        });

        const oppositeEvents = events.map((event) => {
            switch(event) {
                case 'hover':
                    return 'mouseleave';
                case 'focus':
                    return 'blur';
                case 'click':
                    return 'click';
                default:
                    return;
            }
        }).filter(event => !!event);

        // schedule show tooltip
        directEvents.forEach((event) => {
            const func = (evt)  => {
                if (this._isOpen === true) { return; }
                evt.usedByTooltip = true;
                this._scheduleShow(reference, options.delay, options, evt);
            };
            this._events.push({ event, func });
            reference.addEventListener(event, func);
        });

        // schedule hide tooltip
        oppositeEvents.forEach((event) => {
            const func = (evt) => {
                if (evt.usedByTooltip === true) { return; }
                this._scheduleHide(reference, options.delay, options, evt);
            };
            this._events.push({ event, func });
            reference.addEventListener(event, func);
        });
    }

    _scheduleShow(reference, delay, options/*, evt */) {
        // defaults to 0
        const computedDelay = (delay && delay.show) || delay || 0;
        window.setTimeout(() => this._show(reference, options), computedDelay);
    }

    _scheduleHide(reference, delay, options, evt) {
        // defaults to 0
        const computedDelay = (delay && delay.hide) || delay || 0;
        window.setTimeout(() => {
            if (this._isOpen === false) { return; }
            if (!document.body.contains(this._tooltipNode)) { return; }

            // if we are hiding because of a mouseleave, we must check that the new
            // reference isn't the tooltip, because in this case we don't want to hide it
            if (evt.type === 'mouseleave') {
                const isSet = this._setTooltipNodeEvent(evt, reference, delay, options);

                // if we set the new event, don't hide the tooltip yet
                // the new event will take care to hide it if necessary
                if (isSet) { return; }
            }

            this._hide(reference, options);
        }, computedDelay);
    }

    _setTooltipNodeEvent = (evt, reference, delay, options) => {
        const relatedreference = evt.relatedreference || evt.toElement;

        const callback = (evt2) => {
            const relatedreference2 = evt2.relatedreference || evt2.toElement;

            // Remove event listener after call
            this._tooltipNode.removeEventListener(evt.type, callback);

            // If the new reference is not the reference element
            if (!this._isElOrChildOfEl(relatedreference2, reference)) {

                // Schedule to hide tooltip
                this._scheduleHide(reference, options.delay, options, evt2);
            }
        };

        if (this._isElOrChildOfEl(relatedreference, this._tooltipNode)) {
            // listen to mouseleave on the tooltip element to be able to hide the tooltip
            this._tooltipNode.addEventListener(evt.type, callback);
            return true;
        }

        return false;
    }

    _isElOrChildOfEl(a, b) {
        return a === b || b.contains(a);
    }
}


/**
 * Placement function, its context is the Tooltip instance.
 * @memberof Tooltip
 * @callback PlacementFunction
 * @param {HTMLElement} tooltip - tooltip DOM node.
 * @param {HTMLElement} reference - reference DOM node.
 * @return {String} placement - One of the allowed placement options.
 */

/**
 * Title function, its context is the Tooltip instance.
 * @memberof Tooltip
 * @callback TitleFunction
 * @return {String} placement - The desired title.
 */
