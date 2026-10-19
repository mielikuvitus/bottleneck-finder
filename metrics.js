// Measures how busy the server is, one sample per second, for GET /metrics.
// Each sample covers exactly the previous second, however often /metrics is
// polled.
const { monitorEventLoopDelay, performance } = require('perf_hooks');
const { getStats: getCmsStats } = require('./cms');

const SAMPLE_MS = 1000;

// Schedules a timer every 10ms and records how late each one fires: the
// longer the event loop is busy, the later the timers.
const LOOP_RESOLUTION_MS = 10;
const loopDelay = monitorEventLoopDelay({ resolution: LOOP_RESOLUTION_MS });
loopDelay.enable();

let lastTime = performance.now();
let lastCpu = process.cpuUsage();
let lastLoop = performance.eventLoopUtilization();
// Timed synchronous work for the current second, by kind ("db", "render"):
// kind -> name -> { count, totalMs, maxMs }
let timed = { db: {}, render: {} };
let latest = null;

const round = (n, digits = 1) => Number(n.toFixed(digits));
const nsToMs = (ns) => ns / 1e6;
// The histogram includes the 10ms the timer was meant to wait; keep only the lateness
const lateMs = (ns) => Math.max(0, nsToMs(ns) - LOOP_RESOLUTION_MS);

// Runs a synchronous function and records how long it took
function timeSync(kind, name, fn, op) {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const ms = performance.now() - start;
    const stats = (timed[kind][name] ??= { count: 0, totalMs: 0, maxMs: 0, op });
    stats.count++;
    stats.totalMs += ms;
    stats.maxMs = Math.max(stats.maxMs, ms);
  }
}

// op: "read" or "write", so the analyser can tell lookups from inserts
const timeQuery = (name, fn, op) => timeSync('db', name, fn, op);
const timeRender = (name, fn) => timeSync('render', name, fn);

const summarize = (entries) =>
  Object.fromEntries(
    Object.entries(entries).map(([name, s]) => [
      name,
      { count: s.count, totalMs: round(s.totalMs), avgMs: round(s.totalMs / s.count, 2), maxMs: round(s.maxMs, 2), ...(s.op ? { op: s.op } : {}) },
    ])
  );

function sample() {
  const now = performance.now();
  const windowMs = now - lastTime;
  const cpu = process.cpuUsage(lastCpu); // microseconds used since lastCpu
  const loop = performance.eventLoopUtilization(lastLoop);
  const memory = process.memoryUsage();
  const hasDelay = loopDelay.count > 0;

  latest = {
    time: Date.now(),
    windowMs: round(windowMs),
    // Can go over 100%: Node also uses helper threads (e.g. for garbage collection)
    cpuPercent: round(((cpu.user + cpu.system) / 1000 / windowMs) * 100),
    eventLoop: {
      utilization: round(loop.utilization, 3), // share of the second spent busy, 0-1
      // null when the loop was so busy that the 10ms timer never fired this second
      delayP50Ms: hasDelay ? round(lateMs(loopDelay.percentile(50))) : null,
      delayP99Ms: hasDelay ? round(lateMs(loopDelay.percentile(99))) : null,
      delayMaxMs: hasDelay ? round(lateMs(loopDelay.max)) : null,
      // How late this 1-second sample itself ran: also a measure of a blocked loop
      samplerLateMs: round(Math.max(0, windowMs - SAMPLE_MS)),
    },
    db: summarize(timed.db),
    render: summarize(timed.render),
    cms: getCmsStats(),
    memoryMb: {
      rss: round(memory.rss / 1048576),
      heapUsed: round(memory.heapUsed / 1048576),
    },
  };

  lastTime = now;
  lastCpu = process.cpuUsage();
  lastLoop = performance.eventLoopUtilization();
  timed = { db: {}, render: {} };
  loopDelay.reset();
}

setInterval(sample, SAMPLE_MS).unref();

function getMetrics() {
  return latest ?? { time: Date.now(), note: 'The first sample is ready 1 second after start.' };
}

module.exports = { timeQuery, timeRender, getMetrics };
