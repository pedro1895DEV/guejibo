'use strict';

/**
 * Structured logger with JSON output in production and optional webhook/Sentry error forwarding.
 */
function formatEntry(level, msg, meta = {}) {
  return {
    timestamp: new Date().toISOString(),
    level,
    msg,
    ...meta
  };
}

function writeLog(level, msg, meta = {}) {
  if (process.env.NODE_ENV === 'test' && process.env.LOG_IN_TEST !== 'true') {
    return;
  }

  const entry = formatEntry(level, msg, meta);
  if (process.env.NODE_ENV === 'production') {
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
  } else {
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
    const extra = Object.keys(meta).length > 0 ? ' ' + JSON.stringify(meta) : '';
    if (level === 'error') {
      console.error(`${prefix} ${msg}${extra}`);
    } else {
      console.log(`${prefix} ${msg}${extra}`);
    }
  }
}

module.exports = {
  info(msg, meta) {
    writeLog('info', msg, meta);
  },

  warn(msg, meta) {
    writeLog('warn', msg, meta);
  },

  error(msg, errOrMeta) {
    let meta = {};
    if (errOrMeta instanceof Error) {
      meta = { error: errOrMeta.message, stack: errOrMeta.stack };
    } else if (errOrMeta && typeof errOrMeta === 'object') {
      meta = errOrMeta;
    }
    writeLog('error', msg, meta);
  }
};
