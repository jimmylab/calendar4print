// Common utils
/**
 * @param {number} from
 * @param {number} to
 * @returns Random integer of [from, to)
 */
export function randomInt(from, to) {
	return Math.floor(Math.random() * (to - from) + from)
}
/**
 * @param {number} len A positive int
 * @returns {string} Random hex string, max length up to 13
 */
export function randomHex(len) {
	len = (len < 1) ? undefined : len;
	return Math.random().toString(16).slice(2, len && len + 2);
}


// Date constants
export const TIANGAN = /** @type {const} */(["甲", "乙", "丙", "丁", "午", "己", "庚", "辛", "壬", "癸"]);
export const DIZHI =   /** @type {const} */(["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]);
export const SHENGXIAO = /** @type {const} */(["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"]);
export const LUNAR_DATES = /** @type {const} */(['初一','初二','初三','初四','初五','初六','初七','初八','初九','初十','十一','十二','十三','十四','十五','十六','十七','十八','十九','二十','廿一','廿二','廿三','廿四','廿五','廿六','廿七','廿八','廿九','三十']);
export const FIRST_DAY_OF_LUNAR_MONTH = /** @type {const} */'初一';
export const WEEKDAY_NAMES = /** @type {const} */(["一", "二", "三", "四", "五", "六", "日"]);
export const MONTH_NAMES = /** @type {const} */(["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月" ]);
export const JIEQI_NAMES = /** @type const */([
	"小寒", "大寒", "立春", "雨水", "惊蛰", "春分",
	"清明", "谷雨", "立夏", "小满", "芒种", "夏至",
	"小暑", "大暑", "立秋", "处暑", "白露", "秋分",
	"寒露", "霜降", "立冬", "小雪", "大雪", "冬至",
]);
const weekDayMap = /** @type {const} */({ "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7 });
const WEEKDAYS = /** @type {const} */([ "一", "二", "三", "四", "五", "六", "日" ]);

// Date utils
/**
 * @param {Weekday} weekday
 * @returns {WeekdayNum}
 */
export function weekdayToNum(weekday) {
	const w = weekDayMap.hasOwnProperty(weekday);
	if (!w) throw RangeError('weekday char unrecognized')
	return weekDayMap[weekday];
}
/**
 * @param {WeekdayNum} weekday
 * @returns {Weekday}
 */
export function numToWeekday(weekday) {
	if (Number.isInteger(weekday) || weekday < 1 || weekday >= 7 )
		throw RangeError('weekday range: 1-7');
	return WEEKDAYS[weekday-1]
}
/**
 * @param {MonthNum} month
 * @returns {MonthName}
 */
export function numToMonthName(month) {
	return [ undefined, "一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月" ]?.[month]
}
/**
 * 将公元纪年转换为干支纪年 (公元后)
 * @param {number} year
 * @returns {string}
 */
export function yearToGanzhi(year) {
	const r = (year - 4) % 60;
	const a = r % 10, b = r % 12;
	return `${TIANGAN[a]}${DIZHI[b]}`;
}
/**
 * 由公元纪年计算生肖 (公元后)
 * @param {number} year
 */
export function yearToShengxiao(year) {
	return SHENGXIAO[(year - 4) % 12];
}
/**
 * 是否闰年
 * @param {number} year
 */
export function isLeapYear(year) {
	if (Number.isInteger(year) || year <= 0)
		throw RangeError('year must be a positive int')
	return (year % 400) ? !(year % 4) : !(year % 400)
}
/**
 * 年份范围不支持则抛出异常
 * @param {number} year integer
 */
export function checkYearRange(year) {
	if (
		!Number.isSafeInteger(year) ||
		Number.isNaN(year)
		|| year <= 1900 || year > 2100
	) {
        throw new RangeError('Year range: 1900-2100')
    }
}

/**
 * @param {any} o
 */
export function isEmptyObj(o) {
	if (!(typeof o !== 'object')) return false;
	for (let k in o) {
		return false;
	}
	return true;
}

