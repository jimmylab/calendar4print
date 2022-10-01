// Util types
type Distribute<U, V> = U extends string ? {[K in U]: V} : never;
type InsertPosOpt = Distribute<InsertPosition, HTMLElement>;
type NonUndefined<T> = T extends undefined ? never : T;
type ConstructorType<T extends abstract new (...args: any) => any> = T extends abstract new (...args: infer R) => infer S ? (...args: R) => S : any;
type SingleOrArray<T> = T | T[];
type TupleSplit<T, N extends number, O extends readonly any[] = readonly []> =
    O['length'] extends N ? [O, T] : T extends readonly [infer F, ...infer R] ?
    TupleSplit<readonly [...R], N, readonly [...O, F]> : [O, T];
type SubArr<Arr extends readonly any[], Start extends number, End extends number = Arr["length"]> =
	TupleSplit<TupleSplit<Arr, End>[0], Start>[1];
type SubArrU<Arr extends readonly any[], Start extends number, End extends number = Arr["length"]> =
	SubArr<Arr, Start, End>[number];


// Date constants
type OneToTen = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];
type OneToNine = SubArr<OneToTen, 0, 9>;

type WeekdayNum = [1, 2, 3, 4, 5, 6, 7][number];
type Weekday = ["一", "二", "三", "四", "五", "六", "日" ][number];
type MonthNum = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12][number];
type DateNum = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31][number];
type TianGan = ["甲", "乙", "丙", "丁", "午", "己", "庚", "辛", "壬", "癸"][number];
type DiZHi =   ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"][number];
type MonthName = `${OneToTen[number]}月` | '十一月' | '十二月';
type ShengXiaoName = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"][number];
type LunarMonthNameWithoutLeap = '正月' | `${SubArrU<OneToTen, 1>}月` | '十一月' | '十二月';
type LunarMonthName = LunarMonthNameWithoutLeap | `闰${LunarMonthNameWithoutLeap}`;
type LunarDate = `初${OneToTen[number]}` | `十${OneToNine[number]}` | '二十' | `廿${OneToNine[number]}` | '三十';
type JieqiName = ["小寒","大寒","立春","雨水","惊蛰","春分","清明","谷雨","立夏","小满","芒种","夏至","小暑","大暑","立秋","处暑","白露","秋分","寒露","霜降","立冬","小雪","大雪","冬至",][number];


// Structs
declare interface YearData {
	/** 年 */
	Y: number;
	/** 生肖 */
	shengxiao: ShengXiaoName;
	/** 干支纪年 */
	ganzhi: `${TianGan}${DiZHi}`;
	/** 月份数据 */
	months: MonthData[];
	/** 是否有休假数据 */
	hasHolidayData: boolean;
}
declare interface MonthData {
	/** 年 */
	Y: number;
	/** 月份 */
    M: MonthNum;
	/** 该月首日星期几 1-7 */
    startWeekday: WeekdayNum;
	/** 日期数据 */
    days: DateInfo[];
}
declare interface DateInfo {
	/** 年 */
	Y: number;
	/** 月 */
	M: MonthNum;
	/** 日 */
	D: DateNum;
	/** 星期几 */
	W: WeekdayNum;
	/** 阴历月份(汉字)，如 十二月 */
	lunarMonth: LunarMonthName;
	/** 阴历日期(汉字)，如 初一 廿二 */
	lunarDate: LunarDate;
	/** 节气 */
	jieqi?: JieqiName;
	/** 节日信息，字符串或字符串数组 */
	holidayName?: string | string[];
	/** 休假信息，若hasHolidayData为true */
	holiday?: Holiday;
}
declare interface LunarDateInfo {
	/** 阴历月份(汉字)，如 十二月 */
	lunarMonth: LunarMonthName;
	/** 阴历日期(汉字)，如 初一 廿二 */
	lunarDate: LunarDate;
	/** 节气 */
	jieqi?: JieqiName;
}
declare interface Holiday {
	/** true表示是节假日，false表示是调休 */
	holiday: boolean;
	/** 节假日的中文名。如果是调休，则是调休的中文名，例如'国庆前调休' */
	name: string;
	/** 薪资倍数，1表示是1倍工资 */
	wage: number;
	/** 只在调休下有该字段。true表示放完假后调休，false表示先调休再放假 */
	after: boolean;
	/** 只在调休下有该字段。表示调休的节假日 */
	target: string;
}
type FestivalDefinationEntry =
	| [MonthNum, DateNum]
	| [MonthNum, ((month: MonthData) => DateNum)]
	| [LunarMonthName, LunarDate]
	| [LunarMonthName, ((m: Map<LunarDate, DateInfo>) => DateInfo)]
;
type FestivalDefinations = Record<string, FestivalDefinationEntry>;


// Webkit native function
interface Window {
	getEventListeners(el: HTMLElement) : Record<keyof HTMLElementEventMap, EventListener[]>;
}

// Custom events
interface CustomEventMap {
    "yearchange": CustomEvent<number>;
	"calendarload": CustomEvent<YearData>;
}
interface Window { //adds definition to Document, but you can do the same with HTMLElement
	addEventListener<K extends keyof CustomEventMap>(type: K,
		listener: (this: Window, ev: CustomEventMap[K]) => void): void;
	dispatchEvent<K extends keyof CustomEventMap>(dict: CustomEventInit<CustomEventMap[K]>) : void;
}
