import {
    Component,
    animateSimple,
    untilTimeout,
    randomHSL,
} from '../lib/utils-frontend.js';
import {
    randomInt,
    JIEQI_NAMES,
    FIRST_DAY_OF_LUNAR_MONTH,
    LUNAR_DATES,
    numToMonthName,
    yearToGanzhi,
    yearToShengxiao,
    checkYearRange,
} from '../lib/utils.js';

const root = $$('main.root');

let scrollListener;
/**
 *
 * @param {number} speed scroll animation duration
 * @param {number} gapTime lock time after animation finished
 * @returns
 */
function scrollSnap(speed = 500, gapTime = 50) {
	const pageElems = $('section', root);
    const docEl = document.documentElement;
    const pages = pageElems.length;
	if (pages <= 1) return;
	const firstPage = pageElems[0];
    const lastPage = pageElems[pages - 1];
    let current = 0;
    let mutex = false;
    if (typeof scrollListener === 'function') {
        removeEventListener('wheel', scrollListener);
    }
    /**
     * @param {WheelEvent} ev
     */
    function onWheel(ev) {
        const direction = Math.sign(ev.deltaY);
        if (!mutex) {
            const fromPage = current;
            const turnToPage = fromPage + direction;
            if (turnToPage < 0 || !direction) return;
            if (direction > 0) {
                const bottomOff = parseInt(
                    getComputedStyle(lastPage).getPropertyValue('--columns-per-page')
                );
                if (turnToPage > (pages - bottomOff)) return;
            }
            current = turnToPage;
            mutex = true;

			animateSimple(firstPage,
			function(now, duration) {
				let t = now / duration;
                this.style.setProperty('--scroll-ratio', (1-t)*fromPage + t*turnToPage)
			}, speed)
            .then(untilTimeout(gapTime))
            .then(() => { mutex = false })
        }
    }
    scrollListener = onWheel;
    root.addEventListener('wheel', onWheel, {passive: true});
}


class DateGrid extends Component {
    /**
     * @param {DateInfo[]} days
     */
    constructor(days) {
        super();
        this.html(
            days.map(day => {
                const { D, lunarDate, lunarMonth, jieqi, holidayName, holiday } = day;
                // ???????????????????????????????????????????????????
                let lunar = jieqi ?? (lunarDate === FIRST_DAY_OF_LUNAR_MONTH ? lunarMonth : lunarDate);
                let festival = Array.isArray(holidayName) ? holidayName.join(' / ') : holidayName;
                let caption = festival || lunar;
                return /*html*/`
                <li class="date-grid-item">
                    <span class="date-num">${D}</span>
                    <span class="lunar">${caption}</span>
                    ` + (holiday ? /*html*/`
                    <span class="holiday-mark ${holiday.holiday ? 'is-rest' : 'is-make-up'}"></span>` : '') + `
                </li>`
            })
        )
    }
}

class Month extends Component {
    /**
     * @param {MonthData} data
     */
    constructor(data) {
        super();
        const { M, startWeekday, days } = data;
        const maxRows = Math.ceil((days.length + startWeekday - 1) / 7);
        this.html(/*html*/`
            <section class="month">
                <h1 class="month-name">
                    <span class="month-num">${M}</span>???
                </h1>
                <ul class="weekday-header" >
                    <li>???</li><li>???</li><li>???</li><li>???</li>
                    <li>???</li><li>???</li><li>???</li>
                </ul>
                <ul class="date-grid" weeks="${maxRows}">
                    <li class="date-grid-item pad" span="${startWeekday - 1}"></li>`,
                    new DateGrid(days),
                /*html*/`
                    <div class="punch-holes"></div>
                </ul>
            </section>
        `)
    }
}

class CalendarPages extends Component {
    /**
     * @param {YearData} data
     */
    constructor(data) {
        super();
        const { Y, shengxiao, ganzhi, months } = data;
        this.html(
            /*html*/`
            <section class="cover">
                <h1 class="year"><span class="year-num">${Y}</span>???</h1>
                <h1 class="year-chinese">
                    ??????<span class="year-chinese-name">${ganzhi}</span>
                    <span class="year-shengxiao">${shengxiao}</span>???
                </h1>
                <div class="punch-holes"></div>
            </section>`,
            months.map(data => new Month(data)),
            /*html*/`
            <section class="back">
                <h1 class="year">??????</h1>
                <div class="punch-holes"></div>
            </section>`,
        )
        this.queryAll('section')
            .forEach(el =>
                el.style.setProperty('--section-bg', randomHSL())
            )
    }
}

window.addEventListener('calendarload', ev => {
    const {detail : data} = ev;
    new CalendarPages(data).mount(root);
    scrollSnap(400, 50);
})

// Or mock for testing
/** @type {YearData} */
const mockCalendar = (() => {
    const Y = 2099;
    const monthLength = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    /** @type {MonthData[]} */
    const monthData = [];
    for (let i = 0; i < 12; i++) {
        const startWeekday = randomInt(1, 8);
        const length = monthLength[i];
        const startLunar = randomInt(0, 30);
        /** @type {MonthName[]} */
        const lunarDays = ([]
            .concat(LUNAR_DATES.slice(0, randomInt(29, 31)), LUNAR_DATES)
            .slice(startLunar, startLunar + length)
        );
        const lunarMonths = (
            Array(60)
            .fill(numToMonthName((i + 10) % 12 + 1), 0, 30)
            .fill(numToMonthName((i + 11) % 12 + 1), 30, 60)
            .concat(LUNAR_DATES, LUNAR_DATES)
            .slice(startLunar, startLunar + length)
        );
        /** @type {DateInfo[]} */
        const days = lunarDays.map((lunarDate, j) => {
            const M = i + 1, D = j + 1;
            return {
                Y, M, D, lunarDate,
                lunarMonth: lunarMonths[j],
                weekday: (D + startWeekday) % 7 + 1
            }
        });
        // ?????????????????????????????????????????????
        if (i < 6) {
            days[5].jieqi = JIEQI_NAMES[i * 2];
            days[20].jieqi = JIEQI_NAMES[i * 2 + 1];
        } else {
            days[7].jieqi = JIEQI_NAMES[i * 2];
            days[22].jieqi = JIEQI_NAMES[i * 2 + 1];
        }

        monthData.push({
            M: i+1,
            startWeekday,
            days,
        })
    }
    Object.assign(monthData[0].days[0], {
        holidayName: "??????",
        holiday: {"holiday": true,  "name": "??????"},
    });
    Object.assign(monthData[0].days[1], {
        holiday: {"holiday": true,  "name": "??????"},
    });
    Object.assign(monthData[0].days[2], {
        holiday: {"holiday": true,  "name": "??????"},
    });
    Object.assign(monthData[0].days[3], {
        holiday: {"holiday": false, "name": "???????????????", "after": true, "target": "??????"},
    });

    return {
        Y,
        shengxiao: yearToShengxiao(Y),
        ganzhi: yearToGanzhi(Y),
        months: monthData
    };
}) ();
// new CalendarPages(mockCalendar).mount(root);
