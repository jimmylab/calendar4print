import { randomInt } from './utils.js';

/**
 * @template {HTMLElement} K
 * @param {K} elem Target element
 * @param {(this: K, now: number, duration: number) => number} step Step function
 * @param {number} duration
 * @returns {Promise<K>} Promise that resolves the target element
 */
function animateSimple(elem, step, duration) {
	return new Promise((resolve, reject) => {
		let start;
		window.requestAnimationFrame(function nextFrame(timestamp) {
			if (start === undefined)
				start = timestamp;
			const now = timestamp - start;
			if (now < duration) {
                if ( step.call(elem, now, duration) === true ){
                    resolve(elem);
                    return;
                }
                window.requestAnimationFrame(nextFrame);
			} else {
                step.call(elem, duration, duration);
				resolve(elem);
			}
		})
	})
}

/**
 * @template {HTMLElement} K
 * @param {K} elem Target element
 * @param {number} to target scrollTop
 * @param {number} duration
 * @returns {Promise<K>}
 */
animateSimple.scrollBy = (elem, to, duration) => {
    const from = elem.scrollTop;
    if (from <= 0 && to <= 0)
        return Promise.resolve(elem);
    return animateSimple(
        elem,
        function(now, duration) {
            let t = now / duration;
            this.scrollTop = from + t * to;
        },
        duration
    )
}

export { animateSimple }

/**
 * Returns a promise resolve after t milliseconds
 * Example: await untilTimeout(1000)
 * @param {number} t
 * @returns {Promise}
 */
export const untilTimeout = t => () => new Promise( resolve => setTimeout(resolve, t) )

export class StyleTag {
	constructor() {
		const elem = document.createElement('style');
		elem.appendChild(document.createTextNode(''));
		document.head.appendChild(elem);
		/** @type {HTMLStyleElement} */
		this.elem = elem;
		/** @type {CSSStyleSheet} */
		this.sheet = elem.sheet;
	}
	/**
	 * @param  {...string} rules
	 */
	add(...rules) {
		rules.map(rule => this.sheet.insertRule(rule));
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} selector
 * @param {ParentNode} context
 * @returns {NodeListOf<HTMLElementTagNameMap[K]>}
 */
export function $(selector, context = document) {
    return context.querySelectorAll(selector);
}
globalThis.$ = $;

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} selector
 * @param {ParentNode} context
 * @returns {HTMLElementTagNameMap[K]}
 */
 export function $$(selector, context = document) {
    const el = context.querySelector(selector);
    if (el == null)
        throw new Error(`Selector "${selector}" has no match`);
    return el;
}
globalThis.$$ = $$;

// Random color for testing
export const randomHSL = () => `hsl(` +
    `${randomInt(0, 360)}deg,` +
    `${randomInt(40, 60)}%,`   +
    `${randomInt(70, 90)}%`    +
`)`;

export class Component {
    /** @type {Set<InsertPosition>} */
    static InsertPositions = new Set(["beforebegin", "afterbegin", "beforeend", "afterend"]);
    /**
     * @param {string} tagName
     */
    constructor() {
        this.root = document.createElement('template');
        this.doc = this.root.content;
    }
    /**
     * Mount component into target node, replace or append
     * @param {Element} targetNode
     * @param {boolean} after
     */
    mount(targetNode, after = false) {
        if (!after) targetNode.innerHTML = '';
        targetNode.appendChild(
            document.importNode(this.doc, true)
        )
    }
    /**
     * @param {(string|string[]|Component|Component[])[]} html
     */
    html(...html) {
        this.root.innerHTML = html.map(
            s => (s instanceof Array) ? s.map(t => String(t)).join('') : String(s)
        ).join('');
    }
    /**
     * @param { Component | HTMLElement | string } content
     * @param { 'start' | 'end' | InsertPosition } where
     * @param { HTMLElement } refElem
     */
    insert(content, where = 'end', refElem = this.doc) {
        // TODO
    }
    /**
     * @param { Component | HTMLElement | string } content
     */
    append(content) {
        if (content instanceof Component) {
            content.mount(this.doc, true);
        } else if (content instanceof HTMLElement) {
            this.doc.appendChild(content.cloneNode(true));
        } else if (typeof content === 'string') {
            this.doc.appendChild(document.createTextNode(content));
        }
    }
    /**
     * @param {string} selector
     * @returns {HTMLElement}
     */
    query(selector) {
        const el = this.doc.querySelector(selector);
        if (el == null) throw new Error(`${selector} not found!`)
        return el;
    }
    /**
     * @param {string} selector
     */
    queryAll(selector) {
        return this.doc.querySelectorAll(selector);
    }
    toHTML() {
        return this.root.innerHTML;
    }
    toString() {
        return this.toHTML();
    }
}

/**
 * @param {HTMLElement} el
 */
export function makeDraggable(el, {sticky = 32} = {}) {
    const {body, documentElement: doc} = document;
    el.addEventListener('mousedown', function(ev) {
        let offsetX = el.offsetLeft, offsetY = el.offsetTop;
        let startX = ev.clientX, startY = ev.clientY;
        el.style.cursor = 'move';
        /** @param {MouseEvent} ev */
        function mouseMove(ev) {
            let X = ev.clientX - startX + offsetX,
                Y = ev.clientY - startY + offsetY;
            el.style.left = `${X}px`, el.style.top = `${Y}px`;
            el.style.cursor = null;
        }
        /** @param {MouseEvent} ev */
        function mouseUp(ev) {
            body.removeEventListener('mousemove', mouseMove)
            body.removeEventListener('mouseleave', mouseUp)
            body.removeEventListener('mouseup', mouseUp)
            let {width: W, height: H} = doc.getBoundingClientRect();
            let {top, left, right, bottom, width: w, height: h} = el.getBoundingClientRect();
            if (left < sticky)              { el.style.left = 0 }
            else if ((W - right) < sticky)  { el.style.left = `${W-w}px` }
            if (top < sticky)               { el.style.top = 0 }
            else if ((H - bottom) < sticky) { el.style.top = `${H-h}px` }
        }
        body.addEventListener('mousemove', mouseMove);
        body.addEventListener('mouseleave', mouseUp, {once: true});
        body.addEventListener('mouseup', mouseUp, {once: true});
    });
}

/**
 * @param {HTMLElement} el
 * @param {keyof HTMLElementEventMap} [evName]
 */
export function removeAllListeners(el, evName) {
    if (!(el instanceof Element)) throw Error('RemoveAllListeners: not element!')
    if (typeof getEventListeners === 'function') {
        let listenersByEvent = window.getEventListeners(el);
        if (typeof evName === 'string') {
            if (!listenersByEvent.hasOwnProperty(evName)) return;
            let listeners = listenersByEvent[evName];
            listeners.forEach(f => el.removeEventListener(evName, f));
        } else {
            Object.keys(listenersByEvent).forEach(evName => {
                let listeners = listenersByEvent[evName];
                listeners.forEach(f => el.removeEventListener(evName, f))
            })
        }
        return;
    }
    let clone = el.cloneNode(false);
    el.replaceWith(clone);
}

/**
 * @param {() => void} fn actions after dom is ready
 */
export function whenReady(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

/**
 * @param {() => void} fn actions after page is completly loaded
 */
export function whenLoaded(fn) {
    if (document.readyState === 'complete') {
        fn();
    } else {
        window.addEventListener('load', fn);
    }
}
