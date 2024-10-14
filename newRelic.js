"use strict";
const { getEnv } = require("./src/utils/api");

/**
 * New Relic agent configuration.
 *
 * See lib/config/default.js in the agent distribution for a more complete
 * description of configuration variables and their potential values.
 */
exports.config = {
  /**
   * Array of application names.
   */
  app_name: [`${getEnv("NEW_RELIC_APP_NAME")}`],
  /**
   * Your New Relic license key.
   */
  license_key: getEnv("NEW_RELIC_API_KEY"),
  logging: {
    /**
     * Level at which to log. 'trace' is most useful to New Relic when diagnosing
     * issues with the agent, 'info' and higher will impose the least overhead on
     * production applications.
     */
    level: "info"
  },
  /**
   * This setting controls distributed tracing.
   * Distributed tracing lets you see the path that a request takes through your
   * distributed system. Enabling distributed tracing changes the behavior of some
   * New Relic features, so carefully consult the transition guide before you enable
   * this feature: https://docs.newrelic.com/docs/transition-guide-distributed-tracing
   * Default is true.
   */
  distributed_tracing: {
    enabled: true
  },
  instrumentation: {
    express: false // Disable Express instrumentation if the issue persists
  }
};
