const errors = require('../utils/errors')
const _ = require('lodash')
const dynamoose = require('dynamoose')
const Schema = dynamoose.Schema

/**
 * This class provides functions to use to interact with DynamoDB database
 */
class DynamoDbService {
  /**
   * Creates a new instance of the DynamoDbService with the provided configuration
   * The models are generated on the fly from the specified entities
   *
   * @param {Object} config The configuration object of the DynamoDB service instance
   *
   * The format of the config object is the following
   {
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
  */
  constructor (config) {
    // Update the dynamoose AWS global configuration
    dynamoose.AWS.config.update(config.awsConfig)

    if (config.isLocalDB) {
      dynamoose.local(config.localDatabaseURL)
    }

    dynamoose.setDefaults(config.dynamooseDefaults)

    this.models = {}
    _.forEach(_.keys(config.entities), async (key) => {
      this.models[key] = await getDynamooseModel(key, config.entities[key])
    })
  }

  /**
   * Performs a search in the specified table by the provided search options
   *
   * @param {String} tableName The name of the table on which to search
   * @param {Object} searchOptions The search parameters object, it should have a json format with key/values
   *                               The key is the field name and the value is the parameter value to search by
   * @returns Promise([]) of an array containing the records that match the search parameters
   */
  search (tableName, searchOptions) {
    return new Promise((resolve, reject) => {
      this.models[tableName].scan(searchOptions).exec((err, result) => {
        if (err) {
          reject(err)
        } else {
          resolve(result.count === 0 ? [] : result)
        }
      })
    })
  }

  /**
   * Gets a document by id
   *
   * @param {String} tableName The table name in which to perform the search
   * @param {String} id The id value to search by
   * @throws NotFoundError if the record with the given id does not exist in the database
   * @returns Promise of the found record
   */
  getById (tableName, id) {
    return new Promise((resolve, reject) => {
      this.models[tableName]
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

  /**
   * Check if the records matched by the given parameters already exist
   * @param {Object} tableName The table name in which to check for duplicate records
   * @param {String} keys The attributes names of table to check
   * @param {String} values The attributes values to be validated
   */
  async validateDuplicate (tableName, keys, values) {
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

    const records = await this.search(tableName, options)
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

  /**
   * Create item in the specified table with the given data values
   *
   * @param {Object} tableName The table name in which to create the record
   * @param {Object} data The data of the object to create
   * @returns created record
   */
  create (tableName, data) {
    return new Promise((resolve, reject) => {
      const dbItem = new this.models[tableName](data)
      dbItem.save((err) => {
        if (err) {
          reject(err)
        } else {
          resolve(dbItem)
        }
      })
    })
  }

  /**
   * Update item in database
   * @param {Object} dbItem The Dynamo database item
   * @param {Object} data The updated data object
   * @returns updated entity
   */
  update (dbItem, data) {
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

  /**
   * Delete item in database
   * @param {Object} dbItem The Dynamo database item to remove
   */
  delete (dbItem) {
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

module.exports = {
  DynamoDbService
}
