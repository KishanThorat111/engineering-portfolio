/**
 * Pins the rate limits low, for the one suite that needs to watch the limiter
 * engage.
 *
 * WHY THIS IS A MODULE AND NOT TWO LINES IN THE TEST FILE
 * ESM evaluates every `import` in a module before any statement in that
 * module's body. So `process.env.X = '3'` written above the imports runs AFTER
 * the config module has already read process.env and frozen its values — the
 * assignment looks first in the source and happens last. The only way to set an
 * environment variable before another module reads it is to do it in a module
 * that is itself imported earlier.
 *
 * Import this FIRST, above the harness.
 */
process.env.RATE_LIMIT_PROVISION_PER_HOUR = '3';
process.env.RATE_LIMIT_GLOBAL_PER_MINUTE = '10000';
