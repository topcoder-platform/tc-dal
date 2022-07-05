const { DATABASE_TYPES } = require('./utils/constants')

/**
 * This function is responsible of instantiating the database service based on input parameters
 *
 * @param {String} databaseType The database type
 * @param {Object} config The configuration object.
 *                        This config object depends on the database type
 *
 * @returns The database instance corresponding to the provided type, configured with the specified configuration
 */
function getDatabaseService (databaseType, config) {
  switch (databaseType) {
    case DATABASE_TYPES.DYNAMO_DB: {
      return require('./services/DynamoDbService')(config)
    }
    case DATABASE_TYPES.POSTGESQL:
      console.log('Postgres not supported yet by the library')
      break
    case DATABASE_TYPES.MYSQL:
      console.log('MySQL not supported yet by the library')
      break
    case DATABASE_TYPES.INFORMIX:
      console.log('Informix not supported yet by the library')
      break
    default:
      break
  }
}

module.exports = {
  getDatabaseService
}
