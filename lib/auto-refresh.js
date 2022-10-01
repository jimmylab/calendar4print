function autoRefresh() {
    const REFRESH_MSG_PATTERN = /REFRESH\d+/
    let { protocol, host, hostname, port } = location;
    // port = '9000';
    // const addr = `${protocol === 'https:' ? 'wss://' : 'ws://'}${hostname}${port && ':' + port}`;
    const addr = `${protocol === 'https:' ? 'wss://' : 'ws://'}${host}`;
    const ws = new WebSocket(addr);
    // Connection opened
    ws.addEventListener('open', (ev) => {
        ws.send(`Handshake by ${location.pathname}`);
    });
    // Listen for messages
    ws.addEventListener('message', (ev) => {
        /**@type {string}*/
        const msg = ev.data;
        if (REFRESH_MSG_PATTERN.test(msg)) {
            console.log('Refreshing page...');
            location.reload();
            return;
        }
        console.log(msg);
    });
    ws.addEventListener('error', (ev) => {
        console.error('Websocket error')
        console.error(ev);
    })
    window.ws = ws;
}

autoRefresh();
