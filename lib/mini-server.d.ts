/// <reference types="node" />

import http from 'http';
import https from 'https';

type ReplaceReturnType<T extends (...a: any) => any, TNewReturn> = (...a: Parameters<T>) => TNewReturn;
type Anything = number | string | object | boolean | bigint | symbol | null;
/**
 * Create:  req = Object.create(Request, req);
 * Initialize: req.parseRequest(req);
 */
export interface Request extends http.IncomingMessage {
	parseRequest(req: http.IncomingMessage): void;
	private parsedReq: {
		query?: URLSearchParams;
		pathname?: string;
		search?: string;
	};
	get query(): URLSearchParams;
	get pathname(): string;
	/** Full url query */
	get search(): string;
	/** Parsed after route is defined */
	params: Record<string, string>;
	get protocol(): 'http' | 'https';
	header(name: string): string | undefined;
}

/**
 * Initialize: Object.create(Request, res)
 */
export interface Response extends http.ServerResponse {
	status(code: number): this;
	json(o: Object): this;
	html(s: string, charset?: string): this;
	send(body: Buffer | string | object): this;
	header(field: string, value: string): this;
	redirect(url: string, code : number = 302): this;
}

export interface NextFunction {
	/** Pass anything but undefined raises an error. */
	(err: Anything): void;
	/** Pass anything but undefined raises an error. */
	(): void;
}
export type NormalHandler = (
	req: Request,
	res: Response,
	/** Pass anything but undefined raises an error. */
	next: NextFunction
) => (void | Promise<void>);
export type ErrorHandler = (
	err: Anything,
	req: Request,
	res: Response,
	/** Pass anything but undefined raises an error. */
	next: NextFunction,
) => (void | Promise<void>);


type RoutePath = string | RegExp;

export declare class MyServer {
	constructor(protocol: typeof http, options: http.ServerOptions) : MyServer;
	public use(handler: NormalHandler): this;
	public usePath(route: RoutePath, handler: NormalHandler): this;
	public catch(handler: ErrorHandler): this;
	public listen(port: number, cb?: (this: http.Server) => void): this;
	private server: http.Server;
	get rawServer(): http.Server;
	/** Expose raw http events */
	on: ReplaceReturnType<typeof http.Server.prototype.on, this>;
	public get(route: RoutePath, handler: NormalHandler): this;
	public post(route: RoutePath, handler: NormalHandler): this;
	/** Static files handler */
	static static(base: string, options?: {
		charset?: string;
		index?: string[];
		dirIndex?: boolean;
		exclude?: string[];
		fallthrough?: boolean;
	}) : NormalHandler
}

