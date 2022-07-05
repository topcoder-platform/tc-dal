const errors = require('../utils/errors')
const _ = require('lodash')
const dynamoose = require('dynamoose')
const config = require('config')
const Schema = dynamoose.Schema

// This should be updates when the logger is fully tested
const logger = require('tc-framework/src/lib/logger')({})

/**
 * This module exports a function to use for creating the DynamoDbService with the given configuration.
 * The configuration of the service should have the following format
 * {
   "awsConfig": {
      "accessKeyId":"awsAccessKeyId",
      "secretAccessKey":"awsSecretAccessKey",
      "region":"awsRegion",
      ...
      See supported aws config at: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property
   },
   "isLocalDB":true,
   "localDatabaseURL":"http://localhost:8000",
   "dynamooseDefaults":{
      "create":false,
      "update":false,
      "waitForActive":false
   },
   "entities":{
      "tableName1":{
         // entity definition object 2
      },
      "tableName2":{
         // entity definition object 2
      }
    }
  }
 * @param {Object} databaseServiceConfig The configuration object to use for initializing the DynampDB Service
 * @returns The initialized DynamoDB service
 */
module.exports = (databaseServiceConfig) => {
  // The dynamoDB service instance
  const dynamoDbService = {}

  // The models object to be managed by the DynamoDB service
  const models = {}

  // Update the dynamoose AWS global configuration
  dynamoose.AWS.config.update(databaseServiceConfig.awsConfig)

  if (databaseServiceConfig.isLocalDB) {
    dynamoose.local(databaseServiceConfig.localDatabaseURL)
  }

  dynamoose.setDefaults(databaseServiceConfig.dynamooseDefaults)

  _.forEach(_.keys(databaseServiceConfig.entities), async (key) => {
    models[key] = await getDynamooseModel(key, databaseServiceConfig.entities[key])
  })

  /**
   * Performs a search in the specified table by the provided search options
   *
   * @param {String} tableName The name of the table on which to search
   * @param {Object} searchOptions The search parameters object, it should have a json format with key/values
   *                               The key is the field name and the value is the parameter value to search by
   * @returns Promise([]) of an array containing the records that match the search parameters
   */
  dynamoDbService.search = (tableName, searchOptions) => {
    return new Promise((resolve, reject) => {
      models[tableName].scan(searchOptions).exec((err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result.count === 0 ? [] : result)
        }
      })
    })
  }

  // enable apm instrumentation for the search function
  dynamoDbService.search.apm = true

  /**
   * Gets a document by id
   *
   * @param {String} tableName The table name in which to perform the search
   * @param {String} id The id value to search by
   * @throws NotFoundError if the record with the given id does not exist in the database
   * @returns Promise of the found record
   */
  dynamoDbService.getById = (tableName, id) => {
    return new Promise((resolve, reject) => {
      models[tableName]
        .query('id')
        .eq(id)
        .exec((err, result) => {
          if (err) {
            reject(err)
          } else if (result.length > 0) {
            resolve(result[0])
          } else {
            reject(
              new errors.NotFoundError(
                `${tableName} with id: ${id} doesn't exist`
              )
            )
          }
        })
    })
  }

  // enable apm instrumentation for getById function
  dynamoDbService.getById.apm = true

  /**
   * Check if the records matched by the given parameters already exist
   * @param {Object} tableName The table name in which to check for duplicate records
   * @param {String} keys The attributes names of table to check
   * @param {String} values The attributes values to be validated
   */
  dynamoDbService.validateDuplicate = async (tableName, keys, values) => {
    const options = {}
    if (Array.isArray(keys)) {
      if (keys.length !== values.length) {
        throw new errors.BadRequestError(
          `size of ${keys} and ${values} do not match.`
        )
      }

      keys.forEach(function (key, index) {
        options[key] = { eq: values[index] }
      })
    } else {
      options[keys] = { eq: values }
    }

    const records = await dynamoDbService.search(tableName, options)
    if (records.length > 0) {
      if (Array.isArray(keys)) {
        let str = `${tableName} with [ `

        for (const i in keys) {
          const key = keys[i]
          const value = values[i]

          str += `${key}: ${value}`
          if (i < keys.length - 1) {
            str += ', '
          }
        }

        throw new errors.ConflictError(`${str} ] already exists`)
      } else {
        throw new errors.ConflictError(
          `${tableName} with ${keys}: ${values} already exists`
        )
      }
    }
  }

  // enable apm instrumentation for validateDuplicate
  dynamoDbService.validateDuplicate.apm = true

  /**
   * Create item in the specified table with the given data values
   *
   * @param {Object} tableName The table name in which to create the record
   * @param {Object} data The data of the object to create
   * @returns created record
   */
  dynamoDbService.create = (tableName, data) => {
    return new Promise((resolve, reject) => {
      const dbItem = new models[tableName](data)
      dbItem.save((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(dbItem)
        }
      })
    })
  }

  // enable apm instrumentation for create function
  dynamoDbService.create.apm = true

  /**
   * Update item in database
   * @param {Object} dbItem The Dynamo database item
   * @param {Object} data The updated data object
   * @returns updated entity
   */
  dynamoDbService.update = (dbItem, data) => {
    Object.keys(data).forEach((key) => {
      dbItem[key] = data[key]
    })
    return new Promise((resolve, reject) => {
      dbItem.save((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(dbItem)
        }
      })
    })
  }

  // enable apm instrumentation for the update function
  dynamoDbService.update.apm = true

  /**
   * Delete an item in database
   * @param {Object} dbItem The Dynamo database item to remove
   */
  dynamoDbService.remove = (dbItem) => {
    return new Promise((resolve, reject) => {
      dbItem.delete((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(dbItem)
        }
      })
    })
  }

  // enable the apm instrumentation for the remove function
  dynamoDbService.remove.apm = true

  logger.buildService(dynamoDbService, config.Service_NAME, config.SERVICE_VERSION)

  return dynamoDbService
}

/**
 * This is a helper function which generates the Dynamoose model from the given model name and entity.
 * The model name is the table name
 *
 * The entity should have the following format:
 * const Entity = {
  fields: {
    field1: {
      field1Option1: field1Value1,
      field1Option2: field1Value2,
      ...

    },
    field2: {
      field2Option1: field2Value1,
      field2Option2: field2Value2,
      ...

    }
  },
  options: { // See schema options at https://v1.dynamoosejs.com/api/schema/#schema-options
    throughput: {
      read: 10,
      write: 5
    }
  }
}

For example, a Country entity can be defined like:
const Country = {
  fields: {
    id: {
      type: String,
      hashKey: true,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    countryFlag: {
      type: String,
      required: true
    },
    countryCode: {
      type: String,
      required: true
    },
    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  options: {
    throughput: {
      read: 10,
      write: 5
    }
  }
}

 * @param {String} modelName The model name
 * @param {Object} entity The entity for which to generate the Dynamoose model
 * @returns The Dynamoose model for the given entity
 */
const getDynamooseModel = (modelName, entity) => {
  const schema = new Schema(
    {
      ..._.get(entity, 'fields')
    },
    _.get(entity, 'options')
  )

  return dynamoose.model(modelName, schema)
}
