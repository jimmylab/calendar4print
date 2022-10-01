import {
    makeDraggable,
    StyleTag,
    whenLoaded,
    whenReady,
} from './lib/utils-frontend.js';
import {
    randomHex,
    checkYearRange,
} from './lib/utils.js';

// Toolbar
whenReady(() => {
    customElements.define('x-toolbar', class extends HTMLElement {
        constructor() {
            super();
            const template = document.createElement('template');
            template.innerHTML = /*html*/`
                <style>
                    * { margin: 0; padding: 0; }
                    div {
                        font-size: 24px;
                        padding: 0.25em 1em;
                        cursor: move;
                        user-select: none;
                        white-space: nowrap;
                    }
                    input[type='number'] {
                        font-size: 1em;
                        width: 5em;
                        margin: 0 0.5em;
                        user-select: all;
                    }
                    .button {
                        font-size: 0.75em;
                        padding: 0.5em 1em;
                        background-color: hsl(211, 92%, 32%);
                        color: #fff;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                    }
                    .button:hover { background-color: hsl(211, 92%, 40%) }
                    .button:active { background-color: hsl(211, 92%, 28%) }
                    .button:focus { outline: 0!important }
                </style>
                <div>
                    <form>
                        年份
                        <input
                            type="number"
                            value="${new Date().getFullYear()}"
                            onmousedown="event.stopPropagation()"
                        />
                        <input class="button" type="submit" value="确认" />
                        <button class="button" onclick="print()">打印</button>
                    </form>
                </div>
            `;
            const nodes = template.content.cloneNode(true);
            const shadowRoot = this.attachShadow({mode: 'open'}).appendChild(nodes);
        }
        connectedCallback() {
            const yearInput = this.shadowRoot.querySelector('input');
            const form = this.shadowRoot.querySelector('form');
            form.addEventListener('submit', (ev) => {
                location.hash = yearInput.value;
                ev.preventDefault();
            })
            window.addEventListener('yearchange', ev => {
                yearInput.value = ev.detail;
            })
        }
    })
    new StyleTag().add(
        /*css*/`x-toolbar { display: none; }`,
        /*css*/`
        @media screen {
            x-toolbar {
                display: block !important;
                margin: 0; padding: 0;
                position: fixed;
                z-index: 100;
                top: 0; left: 0;
                background-color: rgba(255, 255, 255, 0.8);
            }
        }`,
    )
    const toolBar = document.body.appendChild(document.createElement('x-toolbar'))
    makeDraggable(toolBar, {sticky: 50})
});
const showPrompt = (function() {
    const css = new StyleTag();
    const id = 'dialog-' + randomHex(6);
    css.add(/*css*/`
        @media screen {
            dialog.${id}::backdrop {
                background: rgba(0, 0, 0, 0.4);
            }
            dialog.${id} {
                font-size: 16px;
                min-width: 280px;
                max-width: 550px;
                margin: auto;
                border: #fff 1px solid;
                text-align: center;
            }
            dialog.${id} > h3 {
                font-size: 18px;
                font-weight: normal;
                background-color: #74a0d2;
                color: #FFF;
                text-align: left;
                padding: 4px 12px;
            }
            dialog.${id} > p {
                padding: 2em;
            }
            dialog.${id} > button {
                background-color: hsl(211, 92%, 32%);
                color: #FFF;
                padding: 5px 10px;
                border: 0;
                margin: 1em;
                cursor: pointer;
            }
            dialog.${id} > button:hover { background-color: hsl(211, 92%, 40%) }
            dialog.${id} > button:active { background-color: hsl(211, 92%, 28%) }
        }`,
    )
    const dialog = document.createElement('dialog');
    dialog.className = id;
    const titleEl = document.createElement('h3');
    const contentEl = document.createElement('p');
    dialog.appendChild(titleEl), dialog.appendChild(contentEl);
    dialog.insertAdjacentHTML('beforeend', /*html*/`
        <button onclick="this.closest('dialog').close()">确定</button>
    `);
    document.body.appendChild(dialog)
    /**
     * @param {string} message
     * @param {string} title
     */
    return function(message, title = '提示') {
        titleEl.innerText = title;
        contentEl.innerHTML = message;
        dialog.showModal();
    }
})()

// 'hashchange'/'load -> 'yearchange' -> 'calendarload'

// Auto apply year from hash
function applyHash() {
    let {hash} = location;
    let match = hash.match(/^#(\d+)$/);
    if (match == null) return;
    let year = parseInt(match[1]);
    if (Number.isNaN(year)) return;
    window.dispatchEvent(new CustomEvent('yearchange', {detail: year}))
}
window.addEventListener('hashchange', function(ev) {
    ev.preventDefault();
    applyHash();
})
if (location.hash.length > 1) whenLoaded( applyHash );
else whenLoaded(() =>
    window.dispatchEvent(
        new CustomEvent('yearchange', {detail: new Date().getFullYear()})
    )
);

/**
 * @param {number} year
 */
 async function applyYearData(year) {
    checkYearRange(year);
    let req = await fetch('/getdata/' + year);
    /** @type {YearData} */
    let data = await req.json();
    window.dispatchEvent(new CustomEvent('calendarload', {detail: data}))
    if (!data.hasHolidayData) {
        console.warn(`暂无${data.Y}年休假数据`)
        showPrompt(`暂无${data.Y}年休假数据`)
    }
}
window.addEventListener('yearchange', ev => applyYearData(ev.detail));

