import path from 'path';
import Log from './lib/log.js'
import { readJSON } from './lib/jsonfile.js'

/** @type {FestivalDefinations} */
const HOLIDAYS = {
	// 阳历节日或纪念日
	'元旦':   [1, 1],
	'情人节': [2, 14],
	'妇女节': [3, 8],
	'植树节': [3, 12],
	'劳动节': [5, 1],
	'青年节': [5, 4],
	'母亲节': [5, month => 15 - month.startWeekday],  // 第二个星期日
	'儿童节': [6, 1],
	'父亲节': [6, month => 22 - month.startWeekday],  // 第三个星期日
	'建党节': [7, 1],
	'建军节': [8, 1],
	'教师节': [9, 10],
	'国庆':   [10, 1],
	'感恩节': [11, month => 26 - month.startWeekday],  // 第四个星期四
	'圣诞': [12, 25],

	// 阴历节日或纪念日
	'除夕':   ['十二月', m => m.has('三十') ? m.get('三十') : m.get('廿九') ],
	'春节':   ['正月', '初一'],
	'元宵':   ['正月', '十五'],
	'龙抬头': ['二月', '初二'],
	'端午':   ['五月', '初五'],
	'七夕':   ['七月', '初七'],
	'中元节': ['七月', '十五'],
	'中秋':   ['八月', '十五'],
	'重阳':   ['九月', '初九'],
};

const loadHolidayData = (() => {
    /** @type {Map<year, Object>} */
    const cache = new Map();
    /**
     * @param {number} year
     */
    return async function (year) {
        let json = await readJSON(path.join('dataset/holiday/', `${year}.json`));
		if (json.code !== 0) throw Error(`Holiday json of ${year} is invalid`)
		/** @type {Record<string, Holiday>} */
		let holidays = json.holiday;
		return holidays;
    }
}) ()


/**
 * @this {YearData}
 * @param {FestivalDefinations} holidayDefs
 */
export async function applyHoliday(holidayDefs = HOLIDAYS) {
	// Map lunar dates with its DateInfo
	/** @type {Map<LunarMonthName, Map<LunarDate, DateInfo>>} */
	const lunarDateMap = new Map();
	this.months.forEach(month => {
		month.days.forEach(day => {
			let {lunarMonth} = day;
			if (!lunarDateMap.has(lunarMonth))
				lunarDateMap.set(lunarMonth, new Map());
			const map = lunarDateMap.get(lunarMonth);
			map.set(day.lunarDate, day);
		})
	});
	for (const name of Object.keys(holidayDefs)) {
		/** @type {DateInfo} */
		let day;
		let def = holidayDefs[name];
		let [M, D] = def;
		if (typeof M === 'string') {
			let month = lunarDateMap.get(M);
			if (typeof D === 'string') {
				day = month.get(D);
			} else if (typeof D === 'function') {
				day = D(month);
			} else throw TypeError(`Date defination of ${name} is neither LunarDate or callback`)
		} else if (typeof M === 'number') {
			let month = this.months[M - 1];
			if (typeof D === 'function') {
				let d = D(month);
				day = month.days[d - 1];
			} else if (typeof D === 'number') {
				day = month.days[D - 1];
			}
		}
		if (typeof day === 'undefined') {
			Log.error(`Holiday ${name} has not found`);
			return;
		}
		if (typeof day.holidayName === 'undefined') {
			day.holidayName = name;
		} else if (Array.isArray(day.holidayName)) {
			day.holidayName.push(name);
		} else if (typeof day.holidayName === 'string') {
			day.holidayName = [day.holidayName, name];
		}
	}
	this.hasHolidayData = true;
	try {
		const holidays = await loadHolidayData(this.Y);
		// date: "MM-DD"
		for (const date of Object.keys(holidays)) {
			let [M, D] = date.split('-').map(x => parseInt(x));
			let holiday = holidays[date];
			this.months[M - 1].days[D - 1].holiday = holiday;
		}
	} catch (error) {
		this.hasHolidayData = false;
		Log.warn(`${this.Y} has no holiday data!`);
	}
}

