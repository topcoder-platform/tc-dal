/**
 * This file contains the configuration parameters of the application
 */

module.exports = {
  LOG_LEVEL: process.env.LOG_LEVEL || 'debug',
  Service_NAME: process.env.Service_NAME || 'data-access-library',
  APPLICATION_NAME: process.env.APPLICATION_NAME || 'data-access-library',
  EXPORTER_URL: process.env.EXPORTER_URL || '',
  SERVICE_VERSION: process.env.SERVICE_VERSION || 'v1'
}
