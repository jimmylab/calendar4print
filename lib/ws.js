import { EventEmitter } from 'events';
import crypto from 'crypto';
import Log from './log.js';

// For doc only
import http from 'http';
import stream from 'stream';


const EOL = '\r\n';

const OPCODE_NAME = [
    'Continue', 'Text', 'Binary',
    'Reserved-3', 'Reserved-4', 'Reserved-5', 'Reserved-6', 'Reserved-7',
    'Close', 'Ping', 'Pong'
];

export class WS extends EventEmitter {
    /**
     * @param {http.Server} server
     * @param {Object}      options
     * @param {string}      options.mountPath
     */
    constructor(server, {mountPath = '/'} = {}) {
        super();
        Log.info(`Websocket mounted at: ${mountPath}`);
        server.on('upgrade', (req, socket, head) => {
            if (req.url !== mountPath) {
                // Only upgrade at specific path. Gracefully handle failure
                const html = `<h1>Notice</h1>WebSocket is not avaliable at "${req.url}".`
                socket.write([
                    'HTTP/1.1 404 Not Found',
                    `Date: ${new Date().toGMTString()}`,
                    `Content-Length: ${response.length}${EOL}`,
                    html
                ])
                return;
            }
            Log.info('Upgrage handshake received.');
            handshake(socket, req.headers);
            /** @type {Buffer[]} */
            let clientBuffer = [];
            socket.on('data', chunk => {
                Log.debug(chunk)
                let msg = unpackMsg(chunk, clientBuffer);
                if (msg)
                    this.emit('data', msg, socket);
            })
            const broadcast = data => {
                Log.debug('broadcast: ', data);
                socket.write(packMsg(data));
            };
            this.on('broadcast', broadcast);

            // Unregist all listeners
            const off = () => {
                this.off('broadcast', broadcast);
            }
            socket.on('close', () =>  { Log.info('Socket closed'); off(); })
            socket.on('end',   () =>  { Log.info('Socket end');    off(); })
            socket.on('error', err => {
                Log.error('Socket Error:', err);
                off();
            });
        });
        /**
         * @param {stream.Duplex} socket
         * @param {http.IncomingHttpHeaders} headers
         */
        function handshake(socket, headers) {
            Log.debug('Headers:\n', headers);
            const response = [
                'HTTP/1.1 101 Web Socket Protocol Handshake',
                'Upgrade: WebSocket',
                'Connection: Upgrade',
                'Sec-WebSocket-Version: 13',
                ...(
                    headers['sec-websocket-key'] ?
                    [`Sec-WebSocket-Accept: ${acceptValue(headers['sec-websocket-key'])}`]
                    : []
                ),
                EOL
            ].join(EOL);
            Log.debug('Response:\n', response);
            socket.write(response);
        }
        /**
         * @param {string} acceptKey
         */
        function acceptValue(acceptKey) {
            return (crypto.createHash('sha1')
                .update(acceptKey)
                .update('258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
                .digest('base64')
            )
        }
        /**
         * @param {string|Buffer} msg
         */
        function packMsg(msg) {
            const WS_TOKEN = 0b10000001;
            if (typeof msg === 'string'){
                msg = Buffer.from(msg, 'utf8');
            }
            if (!msg instanceof Buffer) throw TypeError('Websocket: invalid message');
            const { length } = msg;
            if (length < 126) {
                return Buffer.concat([
                    Buffer.from([WS_TOKEN, length]), msg
                ]);
            } else {
                const head = Buffer.allocUnsafe(4);
                head.writeUint8(WS_TOKEN);
                if (length <= 0xffff) {
                    head.writeUint8(126, 1);
                    head.writeUint16BE(length, 2);
                } else {
                    head.writeUint8(127, 1);
                    head.writeUint32BE(length, 4);
                }
                return Buffer.concat([head, msg]);
            }
        }
        /**
         * @param {Buffer}  chunk
         * @param {Buffer[]} prev
         */
         function unpackMsg(chunk, prev) {
            const isFin = !!(chunk[0] & 0x80);
            const opCode = chunk[0] & 0xF || prev.slice(0, 1).pop();
            if (!opCode) throw RangeError('opcode not defined!');
            Log.debug(`opCode = ${opCode} (${OPCODE_NAME[opCode]})`)
            const hasMask = !!(chunk[1] & 0x80);
            let len = chunk[1] & 0x7F;
            let i = 2;
            if (len === 127) {
                throw new RangeError('TODO: Big websocket frame not supported yet!');
                len = chunk.readBigUInt64BE(i);
                i += 2;
            } else if (len === 126) {
                len = chunk.readUInt16BE(i);
                i += 8;
            }
            let message;
            if (hasMask) {
                const mask = chunk.readUInt32BE(i);
                i += 4;
                const body = new Uint8Array(chunk.subarray(i));
                if (len !== body.length)
                    throw Error(`Websocket - Received frame length mismatch! Expected=${len}, actual=${body.length}`);
                const view = new DataView(body.buffer);
                let j = 0, N = (len >>> 2) << 2;
                for (; j < N; j+=4) {
                    view.setUint32(j, view.getUint32(j) ^ mask);
                }
                const m0 = (mask >>> 24) & 0xFF, m1 = (mask >>> 16) & 0xFF, m2 = (mask >>> 8) & 0xFF;
                const R = len & 3;  // len % 4
                if (R >= 1) { view.setUint8(j, view.getUint8(j) ^ m0); j++ };
                if (R >= 2) { view.setUint8(j, view.getUint8(j) ^ m1); j++ };
                if (R >= 3) { view.setUint8(j, view.getUint8(j) ^ m2); j++ };
                message = Buffer.from(body.buffer);
            } else message = chunk.subarray(i);
            if (!isFin) {
                prev.push(message);
                Log.debug(message)
                return
            }
            message = Buffer.concat([...prev, message]);
            while(prev.length) prev.pop();  // Truncate pending chunks
            Log.debug(message);
            if (opCode === 1) {
                return message.toString('utf8');
            }
            if (opCode === 8) {
                let statusCode = message.readUInt16BE(0);
                return {
                    type: 'CLOSE',
                    statusCode,
                    message: message.subarray(2)
                }
            }
            if (opCode === 9) {
                return { type: 'PING', message }
            }
            if (opCode === 10) {
                return { type: 'PONG', message }
            }
            return message;  // Otherwise return as binary
         }
    }
    /**
     * @param {string|Buffer} message
     */
    broadcast(message) {
        this.emit('broadcast', message);
    }
}
