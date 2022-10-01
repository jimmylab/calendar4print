/// <reference path="mini-server.d.ts" />
import http from 'http';
import https from 'https';
import path from 'path';
import fs from 'fs';
const { promises: fsPromises } = fs;
import Log from './log.js';


const {O_RDONLY, O_NOATIME} = fs.constants;
const ILLEGAL_FPATH = /[<>:"|?*]/;


/** @type import('./mini-server').Request */
const RequestProto = {
    parseRequest() {
        if (typeof this?.parsedReq !== 'undefined') return;
        this.parsedReq = {};
        const url = String(this?.url);
        const pos = url.indexOf('?');
        this.parsedReq = {
            pathname: path.posix.join('/', pos < 0 ? url : url.slice(0, pos)),
            search: (pos < 0) ? '' : url.slice(pos),
        }
        this.params = {};
    },
    get pathname() {
        this.parseRequest();
        return this.parsedReq.pathname;
    },
    get search() {
        this.parseRequest();
        return this.parsedReq.search;
    },
    get query() {
        if (typeof this?.parsedReq?.query !== 'undefined') {
            let {search} = this;
            this.parsedReq.query = new URLSearchParams(search);
        }
        return this?.parsedReq?.query;
    },
    get protocol() {
        return (this.socket.encrypted ? 'https' : 'http');
    },
    header(name) {
        if (typeof name !== 'string') throw TypeError('header name must be string');
        return this.headers(name.toLowerCase());
    },
    resetParse() {
        delete this.parsedReq;
    }
}

/** @type import('./mini-server').Response */
const ResponseProto = {
    header(field, value) {
        this.setHeader(field, value);
        return this;
    },
    status(code) {
        this.statusCode = code;
        return this;
    },
    json(o) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(o));
        return this;
    },
    html(s, charset) {
        this.setHeader(
            'Content-Type', 'text/html' +
            ((typeof charset === 'string') ? `; charset=${charset}` : '')
        );
        this.end(s);
        return this;
    },
    send(body) {
        if (typeof body === 'string' || body instanceof Buffer) {
            this.write(body);
            return this;
        } else if (typeof body === 'object') {
            return this.json(body);
        }
        throw TypeError('Body should be either json, string, or Buffer');
    },
    redirect(url, code = 302) {
        this
            .status(code)
            .header('Location', url)
            .end()
        return this;
    },
}

/** @type import('./mini-server').Request */
const Request = Object.create(http.IncomingMessage.prototype, Object.getOwnPropertyDescriptors(RequestProto));
/** @type import('./mini-server').Response */
const Response = Object.create(http.ServerResponse.prototype, Object.getOwnPropertyDescriptors(ResponseProto));
export { Request, Response };


/**
 * Convert path expression like '/user/:id/:post' to RegExp with named groups
 * @param {string} pathExpr
 */
function pathToExpr(pathExpr) {
    const quickTest = /\/\:\w+(?=\/|$)/;
    if (quickTest.test(pathExpr) == null) {
        return null;
    }
    let expr = pathExpr.replace(/(?<=\/)\:(\w+)(?=\/|$)/g, function(segment, key) {
        return `(?<${key}>[^\/]+)`
    });
    return new RegExp(expr);
}
// var expr = pathToExpr('/test/:id/:post');
// var {groups} = '/test/123/456'.match(expr);


/**
 * @param {string} base
 * @param {fs.Dirent[]} list
 */
const dirTemplate = (base, list) => {
    list.sort((a, b) => (b.isDirectory() - a.isDirectory()));
    base = base.replace(/(?<!^)\/$/, '')
    return /*html*/`
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Index of ${base}</title>
<style>
li { line-height: 225% }
body { font-size: 18px; width: 800px; margin:auto; padding-top: 20px; }
a, a:active, a:visited { color: #444; } a:hover { color: #888; }
</style>
</head>
<body>
<h1>Index of ${base}</h1>
<hr />
<ul>` + list.map(file => /*html*/`
    <li> ${file.isDirectory() ? '&#x1F4C1' : '&#x1F4C4'}&nbsp;
        <a href="${encodeURIComponent(file.name)}${file.isDirectory() ? '/' : ''}">
            ${file.name}${file.isDirectory() ? '/' : ''}
        </a>
    </li>`).join('\n') + //html
`</ul>
</body>
</html>`
};

/**
 * @param {Record<string, any>} defaults
 * @param {Record<string, any>} defined
 */
 function copyConfig(defaults, defined) {
    const filtered = {}
    Object.getOwnPropertyNames(defaults).forEach(k => {
        filtered[k] = typeof defined?.[k] === 'undefined' ? defaults[k] : defined[k];
    });
    return filtered;
}

const defaultStaticOptions = {
    charset: 'utf-8',
    index: ['index.html'],
    dirIndex: false,
    /** @type {string[]} */
    exclude: [],
    fallthrough: false
};

const MIME = {
	'.html': 'text/html',
	'.htm':  'text/html',
	'.css':  'text/css',
	'.js':   'text/javascript',
	'.json': 'application/json',
    '.ts':   'application/typescript',
    '.ico':  'image/x-icon',
	'.txt':  'text/plain',
	'.log':  'text/plain',
	'.md':   'text/markdown',
	'.xml':  'application/xml',
	'.jpg':  'image/jpeg',
	'.jpeg':  'image/jpeg',
	'.png':  'image/png',
	'.svg':  'image/svg+xml',
    '.sh':   'application/x-sh',
	'.gif':  'image/gif',
	'.bmp':  'image/bmp',
	'.zip':  'application/x-compressed-zip',
	'.tar':  'application/x-tar',
	'.gz':   'application/x-gzip',
	'.bz2':  'application/x-bzip2',
	'.7z':   'application/x-7z-compressed',
	'.pdf':  'application/pdf',
	'.doc':  'application/msword',
	'.xls':  'application/vnd.ms-excel',
	'.ppt':  'application/vnd.ms-powerpoint',
}

// TODO: Separate route handling & enable mount
// TODO: Async handler catch error
/**
 * @typedef {import('./mini-server').ErrorHandler} ErrorHandler
 * @typedef {import('./mini-server').NormalHandler} NormalHandler
 */
export class MyServer {
    /*
     * @param {typeof http} protocol
     * @param {http.ServerOptions} options
     */
    /** @type {ConstructorType<typeof import('./mini-server').MyServer>} */
    constructor(protocol = http, options = {}) {
        /** @type {Set<NormalHandler>} */
        const handlers = new Set();
        /** @type {Set<ErrorHandler>} */
        const errHandlers = new Set();
        const server = protocol.createServer(options, (req, res) => {
            Log.info(`${req.method} ${req.url}`)
            req = Object.setPrototypeOf(req, Request);
            res = Object.setPrototypeOf(res, Response);
            let it = handlers.values();
            let itErr = errHandlers.values();
            (function next(err) {
                if (typeof err !== 'undefined') {
                    const { value: errorHandler, done } = itErr.next();
                    if (!done) {
                        try { errorHandler(err, req, res, next); }
                        catch (error) { next(error); }
                    }
                    return;
                }
                const { value: handler, done } = it.next();
                if (!done) {
                    try { handler(req, res, next); }
                    catch (error) {
                        Log.verbose('Error implicitly catched.')
                        Log.verbose(error)
                        next(error);
                    }
                }
            }) ();
        });
        /** @type {http.Server} */
        this.server = server;
        this.handlers = handlers;
        this.errHandlers = errHandlers;
    }
    /*
     * @param {NormalHandler} handler
     */
    /** @type {import('./mini-server').MyServer['use']} */
    use(handler) {
        // Log.verbose(handler.length, handler.toString())
        this.handlers.add(handler);
        return this;
    }
    /*
     * @param {ErrorHandler} handler
     */
    catch(handler) {
        this.errHandlers.add(handler);
        return this;
    }
    /**
     * @param {number} port
     * @param {(this: http.Server) => void} [cb]
     */
    listen(port, cb) {
        this.server.listen(port);
        (typeof cb === 'function') && cb.call(this.server);
        return this;
    }
    /**
     * @param {string} evtName
     * @param {(server: http.Server, ...args) => void} cb
     */
    on(evtName, cb) {
        this.server.on(evtName, (...args) => cb(this.server, ...args))
        return this;
    }
    /**
     * @param {string | RegExp} route
     * @param {NormalHandler} handler
     */
    usePath(route, handler) {
        // Try convert route expression to RegExp
        if (typeof route === 'string') {
            route = pathToExpr(route) ?? route;
        }
        if (typeof route === 'string') {
            return this.use((req, res, next) => {
                if (req.pathname === route)
                    handler(req, res, next);
                else next();
            })
        }
        if (route instanceof RegExp) {
            return this.use((req, res, next) => {
                Log.debug(`pathname="${req.pathname}"`)
                const match = req.pathname.match(route);
                if (match != null) {
                    Log.debug('match', match);
                    const params = match?.groups || {};
                    Object.getOwnPropertyNames(params).forEach(k => {
                        params[k] = decodeURIComponent(params[k]);
                    })
                    req.params = params;
                    handler(req, res, next);
                } else next();
            })
        }
        return this;
    }
    /**
     * @param {string | RegExp} Path
     * @param {NormalHandler} handler
     */
    get(route, handler) {
        return this.usePath(route, (req, res, next) => {
            if (req.method === 'GET') {
                handler(req, res, next);
            } else next();
        })
    }
    get rawServer() {
        return this.server;
    }
    /** @type {typeof import('./mini-server').MyServer['static']} */
    static static(base, options = {}) {
        const READ_MODE = O_RDONLY | O_NOATIME;
        options = copyConfig(defaultStaticOptions, options);
        let { charset, index, dirIndex, exclude, fallthrough: fallthrough } = options;
        /** @type {NormalHandler} */
        return (function(req, res, next) {
            /**
             * @param {string} fPath File path
             * @param {fs.promises.FileHandle} fd    File descriptor (fileHandler)
             * @param {number | bigint} length
             */
            function sendFile(fPath, fd, length) {
                let ext = path.extname(fPath);
                let mime = MIME?.[ext] ?? 'application/octet-stream';
                res.header('Content-Length', String(length));
                res.header('Content-Type', mime);
                const reader = fd.createReadStream({autoClose: true})
                reader.pipe(res);
                const cleaning = () => { reader.destroy(); fd.close(); }
                res.on('close', cleaning);
            }
            // TODO: close fd when error
            // TODO: handles HEAD method
            // TODO: handles http Range request
            async function staticHandler() {
                let { pathname } = req;
                pathname = path.posix.join('/', decodeURIComponent(pathname));
                const fPath = path.join(base, pathname);
                const requestAsDir = pathname.endsWith('/');
                const fd = await fsPromises.open(fPath, READ_MODE);
                const stat = await fd.stat({bigint: true});
                const isDir = stat.isDirectory();
                Log.debug(`requestAsDir=${requestAsDir}, isDir=${isDir}, requestAsDir ^ isDir=${requestAsDir ^ isDir}`)
                Log.debug(`safe pathname="${pathname}"`)
                Log.debug(`fPath="${fPath}"`)
                if (requestAsDir ^ isDir) {  // when mismatch
                    if (pathname === '/') throw Error('Base dir is not a directory!')
                    res.redirect(
                        requestAsDir ? pathname.slice(0, -1) : pathname + '/',
                    301);
                    fd.close(); return;
                }
                if (isDir) {
                    const files = await fsPromises.readdir(fPath, {withFileTypes: true});
                    fd.close();
                    // Try index pages first
                    if (index instanceof Array && index.length > 0) {
                        const candidates = new Set(
                             files.filter(f => f.isFile()
                            ).map(f => f.name)
                        );
                        let fName = index.find(fName => candidates.has(fName));
                        if (typeof fName === 'string') {
                            Log.debug(`Index fName: "${fName}"`)
                            let fIndex = await fsPromises.open(path.join(fPath, fName), READ_MODE);
                            let {size} = (await fIndex.stat({bigint: true}));
                            sendFile(fName, fIndex, size);
                            return
                        }
                    }
                    fs.open('dir', (err, fd) => {

                    })
                    if (dirIndex) {  // Try autoindex
                        res.html(dirTemplate(pathname, files), 'utf-8');
                        return
                    }
                    throw new Error('Directory listing disabled!');
                }
                sendFile(fPath, fd, stat.size);
            };
            staticHandler().catch(err => {
                if (err?.code === 'ENOENT') {
                    if (fallthrough) { next(); return }
                    res.status(404).end('404 Not Found');
                    Log.warn(`${req.pathname} 404 not found.`)
                }
                if (fallthrough) {
                    Log.error(err)
                    next(err); return;
                }
            })
        })
    }
}

