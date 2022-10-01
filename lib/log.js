const Log = {
    debug  (...values) { if (Log.LEVEL > 4) console.debug( '\u001b[2m[DEBUG]  ', ...values, '\u001b[0m'); },
    verbose(...values) { if (Log.LEVEL > 3) console.log  ('\u001b[35m[VERBOSE]', ...values, '\u001b[0m'); },
    info   (...values) { if (Log.LEVEL > 2) console.info ('\u001b[36m[INFO]   ', ...values, '\u001b[0m'); },
    warn   (...values) { if (Log.LEVEL > 1) console.warn ('\u001b[33m[WARN]   ', ...values, '\u001b[0m'); },
    error  (...values) { if (Log.LEVEL > 0) console.error('\u001b[31m[ERROR]  ', ...values, '\u001b[0m'); },
    /** Log level, 0: none, 1: error 2: warn, 3: info, 4: verbose, 5: debug; */
    LEVEL: 3,
}
export default Log;
