'use strict';
import fs from 'fs';
import child_process from 'child_process';
import os from 'os';
import { MyServer } from './lib/mini-server.js'
import { WS } from './lib/ws.js'
import Log from './lib/log.js';
import { applyHoliday } from './festival.js'
import { readJSON } from './lib/jsonfile.js'
import { checkYearRange } from './lib/utils.js'

// For doc only
import net from 'net';
import http from 'http';
import https from 'https';

Log.LEVEL = 4

const CALENDAR_DATA_FILE = './dataset/calendar_1900-2100.json.gz'
/**@type {Record<number, YearData>} */
let calendarData;
async function loadCalendarData() {
    if (typeof calendarData !== 'object') {
        calendarData = await readJSON(
            CALENDAR_DATA_FILE,
            { gzipped: CALENDAR_DATA_FILE.endsWith('.gz') }
        );
    }
}

const server = new MyServer();
server
.get('/getdata/:year', async (req, res, next) => {
    Log.debug('req.params', req.params)
    const year = parseInt(req.params?.year);
    try {
        checkYearRange(year)
    } catch (error) {
        next(error)
    }
    await loadCalendarData();
    let data = structuredClone(calendarData[year]);
    await applyHoliday.apply(data);
    res.json(data);
})
.catch((err, req, res, next) => {
    Log.warn(err);
    res
    .status(500)
    .html('<h1>Internal Server Error</h1><hr />' + (
        (err instanceof Error) ? /*html*/
        `<h3>${err.name}: ${err.message}</h3><pre>${err.stack}</pre>` : '')
    )
})
.use(MyServer.static('./', {
    charset: 'utf-8',
    // index: ['calendar.html'],
    exclude: ['/'],
    dirIndex: true,
}))
.listen(19000, function() {
    try {
        const addrs = getAddrs(this);
        welcome(addrs);
        open(addrs[0] + 'calendar.html')
    } catch (err) {
        Log.error(err)
    }
})



const ws = new WS(server.rawServer);
fs.watch('./', {recursive: true}, (eventType, filename) => {
    Log.warn(`File change discovered, eventType = ${eventType}`);
    if (!filename) { Log.debug('Filename not provided'); return; }
    Log.info(`File "${filename}" has changed`);
    ws.broadcast(`File "${filename}" has changed`);
    ws.broadcast(`REFRESH${new Date().valueOf()}`);
});
ws.on('data', (msg, socket) => {
    Log.info('Message from client:', msg);
})


/**
 * Must call this function using .call(server)
 * @param {http.Server | https.Server} server
 * @returns
 */
function getAddrs(server) {
    if(!server.listening) throw Error('Cannot get server address before listening')
    /** @type {net.AddressInfo}*/
    const address = server.address();
    const { port } = address;
    const protocol = server.hasOwnProperty('requestCert') ? 'https' : 'http';
    return (
        Object.values(os.networkInterfaces()).flat()
            .filter(adapter => adapter.family === 'IPv4' && (adapter.internal || adapter.mac !== '00:00:00:00:00:00'))
            .sort((a, b) => b.internal - a.internal )
            .map(adapter => adapter.address)
            .map(addr => `${protocol}://${addr}:${port}/`)
    )
}

/**
 * @param {string[]} addrs  Server strings
 */
function welcome(addrs) {
	Log.info('Server is running at:')
	addrs.forEach(addr => Log.info('  \u001b[33m', addr) )
	console.log('\n');
}

/**
 * Open url using default browser
 * @param {string} url
 */
function open(url) {
    if (typeof url !== 'string') throw Error('Open url should be a string')
    const start = (process.platform == 'darwin'? 'open': process.platform == 'win32'? 'start': 'xdg-open');
    child_process.exec(start + ' ' + url);
}
