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
    const pages = pageElems.length;
	if (pages <= 1) return;
	const firstPage = pageElems[0];
    const lastPage = pageElems[pages - 1];
    let current = 0;
    let mutex = false;
    if (typeof scrollListener === 'function') {
        removeEventListener('wheel', scrollListener);
    }

    root.addEventListener('wheel', function F(ev) {
        scrollListener = F;
        const direction = Math.sign(ev.deltaY);
        if (!mutex) {
            const fromPage = current;
            const turnToPage = fromPage + direction;
            if (turnToPage < 0 ||
                turnToPage >= pages ||
                (direction > 0 && lastPage.offsetTop - lastPage.offsetHeight <= 1)
            ) return;
            current = turnToPage;
            mutex = true;

			animateSimple(firstPage,
			function(now, duration) {
				let t = now / duration;
				// this.style.marginTop = `calc(-${(1-t)*fromPage + t*turnToPage} * var(--section-height))`;
                this.style.setProperty('--scroll-ratio', (1-t)*fromPage + t*turnToPage)
			}, speed)
            .then(untilTimeout(gapTime))
            .then(() => { mutex = false })
        }
    }, {passive: true});
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
                // 初一显示阴历月份，若有节气显示节气
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
                    <span class="month-num">${M}</span>月
                </h1>
                <ul class="weekday-header" >
                    <li>一</li><li>二</li><li>三</li><li>四</li>
                    <li>五</li><li>六</li><li>日</li>
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
                <h1 class="year"><span class="year-num">${Y}</span>年</h1>
                <h1 class="year-chinese">
                    农历<span class="year-chinese-name">${ganzhi}</span>
                    <span class="year-shengxiao">${shengxiao}</span>年
                </h1>
                <div class="punch-holes"></div>
            </section>`,
            months.map(data => new Month(data)),
            /*html*/`
            <section class="back">
                <h1 class="year">封底</h1>
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
        // 上半年来六廿一，下半年八廿三。
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
        holidayName: "元旦",
        holiday: {"holiday": true,  "name": "元旦"},
    });
    Object.assign(monthData[0].days[1], {
        holiday: {"holiday": true,  "name": "元旦"},
    });
    Object.assign(monthData[0].days[2], {
        holiday: {"holiday": true,  "name": "元旦"},
    });
    Object.assign(monthData[0].days[3], {
        holiday: {"holiday": false, "name": "元旦后补班", "after": true, "target": "元旦"},
    });

    return {
        Y,
        shengxiao: yearToShengxiao(Y),
        ganzhi: yearToGanzhi(Y),
        months: monthData
    };
}) ();
// new CalendarPages(mockCalendar).mount(root);
