// Custom, repeatable network test conditions; not carrier guarantees.
const NETWORK_PROFILES = Object.freeze({
  'slow-3g': Object.freeze({ requestLatencyMs: 400, downloadThroughputKbps: 400, uploadThroughputKbps: 200 }),
  'fast-3g': Object.freeze({ requestLatencyMs: 150, downloadThroughputKbps: 1600, uploadThroughputKbps: 750 }),
  '4g': Object.freeze({ requestLatencyMs: 85, downloadThroughputKbps: 9000, uploadThroughputKbps: 1500 }),
  'wifi': Object.freeze({ requestLatencyMs: 20, downloadThroughputKbps: 30000, uploadThroughputKbps: 10000 }),
});
module.exports = { NETWORK_PROFILES };
