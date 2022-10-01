import fsPromises from 'fs/promises'
import util from 'util';
import { weekdayToNum } from './lib/utils.js';
import Log from './lib/log.js';
import { gzip } from 'zlib';

Log.LEVEL = 3

Object.assign(util.inspect.defaultOptions, {
	depth: 10,
	colors: true,
	breakLength: 120,
});

// 简繁体替换
const T2CReplacements = new Map([
	["驚蟄", "惊蛰"],
	["穀雨", "谷雨"],
	["小滿", "小满"],
	["芒種", "芒种"],
	["處暑", "处暑"],
	['龍', '龙'],
	['馬', '马'],
	['雞', '鸡'],
	['犬', '狗'],
	['豬', '猪'],
]);
const CHAR_LEAP_TC = '閏';
const CHAR_LEAP_SC = '闰';
/**
 * @param {string} original
 * @returns {string}
 */
function TC2SC(original) {
	return T2CReplacements.has(original) ? T2CReplacements.get(original) : original;
}

// TODO: 阴历月份大小
let monthLen = 0;

/** @type {Map<number, string>} */
const startMonthOfYear = new Map([
	[1901, '十一月'],
]);

class CalendarData {
	/**
	 * @param {number} year
	 */
	constructor(year) {
		this.year = year;
		/** @type {string[]} */
		if (!startMonthOfYear.has(year))
			throw new TypeError(`Start month of ${year} not found`)
		this.lunarMonth = startMonthOfYear.get(year);
	}
	get urlByYear() {
		// return `https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T${this.year}c.txt`
		// return `Z:/hko/T${this.year}c.txt`
		return `dataset/T${this.year}c.txt`
	}
	async fetchYearData() {
		let res = await fsPromises.readFile(this.urlByYear);
		this.yearDataText = new TextDecoder('big5-hkscs').decode(res);
	}
	coarseYearData() {
		let lines = this.yearDataText.split('\n');
		// 第一行 年信息
		let yearInfoLine = lines[0];
		// 去除最后空行
		lines.pop();
		// 从第三行开始，日信息
		lines = lines.slice(3);

		const ganzhiPattern = /\d{4}\((.{2})\s?-\s?肖(.{1})/;
		const dayPattern = /(\d{4})年(?<mm>\d{1,2})月(?<dd>\d{1,2})日\s+(?<lunar>[^\s]{2,4})\s+星期(?<w>[^\s]{1})\s+(?<jieqi>[^\s]{2})?\s*(?<rest>[^\s]{2})?\s*/;

		const yearInfo = yearInfoLine.match(ganzhiPattern);
		let [, ganzhi, shengxiao] = yearInfo;
		shengxiao = TC2SC(shengxiao);
		const Y = this.year;
		Log.verbose(`${Y} ${ganzhi}年 ${shengxiao}年, 长度=${lines.length}`);
		/**@type {YearData}*/
		this.data = {
			Y, shengxiao, ganzhi, months: []
		};

		/** @type {Array<{str: string, groups: Record<string, string>}>} */
		this.lines = (lines.reduce((all, dayline, i) => {
			const match = dayline.match(dayPattern);
			if (match === null) {
				// 空行忽略
				if (dayline.trim() === '') return all;
				// 末尾几行注释忽略
				if (i > lines.length - 2) return all;
				Log.error(`[Error] matched null! "${dayline}"`);
				return all
			}
			let {groups} = match;
			all.push({str: dayline, groups});
			return all;
		}, []));
	}
	/**
	 *
	 * @param {LunarMonthName|LunarDate} lunar
	 * @param {JieqiName} [jieqi]
	 * @returns {LunarDateInfo}
	 */
	lunarTransform(lunar, jieqi) {
		if (typeof lunar !== 'string') throw new TypeError(`Lunar month not found`);
		if (lunar.endsWith('月')) {
			Log.verbose('阴历月长度 =', monthLen,
			(monthLen === 28) ? '(小)' :
				(monthLen === 29) ? '(大)' : ''
			);
			monthLen = 0;
			lunar = lunar.replace(CHAR_LEAP_TC, CHAR_LEAP_SC);
			if (lunar.startsWith(CHAR_LEAP_SC)) {
				Log.warn(this.year, lunar);
			}// else Log.info(this.year, lunar);
			this.lunarMonth = lunar;
			return {
				lunarDate: '初一',
				lunarMonth: lunar,
				...((typeof jieqi === 'string') ? {jieqi} : {})
			}
		}
		monthLen++;
		return {
			lunarDate: lunar,
			lunarMonth: this.lunarMonth,
			...((typeof jieqi === 'string') ? {jieqi} : {})
		}
	}
	parseMonths() {
		/** @type {MonthData[]} */
		const months = [];
		const Y = this.year;
		this.lines.forEach((dayline, i) => {
			const { str, groups } = dayline;
			let { mm, dd, lunar, w, jieqi, rest } = groups;
			// 非空(undefined)，则进行简繁转换
			let M = parseInt(mm), D = parseInt(dd), W = weekdayToNum(w);
			if ( !Number.isInteger(M) || !Number.isInteger(D))
				throw TypeError(`Month or Date is not valid`);
			jieqi = jieqi && TC2SC(jieqi);
			if (rest) {Log.debug('Rest:', str, rest)}
			if (D === 1) {
				months[M - 1] = {
					Y, M,
					startWeekday: W,
					days: []
				}
			}
			let currentMonth = months[M - 1].days;
			let lunarInfo = this.lunarTransform(lunar, jieqi);
			currentMonth.push({
				Y, M, D, W, ...lunarInfo
			})
		});
		startMonthOfYear.set(Y + 1, this.lunarMonth);
		this.data.months = months;
	}
	async parseCalendarData() {
		try {
			await this.fetchYearData();
			this.coarseYearData();
			this.parseMonths();
		} catch (error) {
			Log.error(this.urlByYear)
			Log.error(error)
			throw error;
		}
	}
}

const OUTPUT_FILE = null//'./dataset/calendar_1900-2100.json.gz';
async function buildAll() {
	const allYears = {};
	for (let year = 1901; year <= 2100; year++) {
		const cal = new CalendarData(year)
		await cal.parseCalendarData();
		allYears[year] = cal.data;
		// Log.warn(`${year}年数据：`)
		// console.warn(cal.data);
	}
	if (typeof OUTPUT_FILE !== 'string') return;
	let data = Buffer.from(JSON.stringify(allYears));
	if (OUTPUT_FILE.endsWith('.gz')) {
		data = await new Promise((resolve, reject) => {
            gzip(data, (err, result) => {
                if (err) { reject(err); return }
                resolve(result);
            })
        })
	}
	await fsPromises.writeFile(OUTPUT_FILE, data)
}
buildAll();
