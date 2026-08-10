/**
 * Pins the rate-limit station's bucket low so the suite can watch it engage.
 *
 * Must be imported before the harness — ESM evaluates imports before any
 * statement in the importing module's body, so setting these in the test file
 * itself would run after the config module has already read process.env.
 */
process.env.RATE_LIMIT_STATION_PER_MINUTE = '5';
process.env.RATE_LIMIT_PROVISION_PER_HOUR = '10000';
process.env.RATE_LIMIT_GLOBAL_PER_MINUTE = '10000';
