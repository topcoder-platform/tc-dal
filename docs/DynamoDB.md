# Exposed APIs for DynamoDB:

| Function                                     | Description |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| search (tableName, searchOptions)            | Performs a search in the specified table by the provided search options. More details about how to construct the filter options can be found at https://v1.dynamoosejs.com/api/scan/                                              |
| getById (tableName, id)                      | Gets a document by id                                                         |
| validateDuplicate (tableName, keys, values)  | Check if the records matched by the given parameters already exist            |
| create (tableName, data)                     | Create item in the specified table with the given data values                 |
| update (dbItem, data)                        | Update item in database                                                       |
| delete (dbItem)                              | Delete item in database                                                       |

# Dynamoose v1 vs Dynamoose v2:
This DAL uses Dynamoose v1 to access the DynamoDB database.

The reason for using Dynamoose v1 is that almost all Topcoder applications use v1.

The switch to Dynamoose v2 have some breaking changes which may break running applications.

# Dynamo DB Usage example:
## Configuration:
The following confguration parameters need to be provided to get the DynamoDB service instance:
```javascript
databaseService = require('tc-dal').getDatabaseService('DynamoDb', databaseServiceConfig)
```

The format of the configObject is:
```javascript
  const configObject = {
    awsConfig: {
      accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
      region: config.AMAZON.AWS_REGION
      // maxRetries: 10
    },
    isLocalDB: config.AMAZON.IS_LOCAL_DB,
    localDatabaseURL: config.AMAZON.DYNAMODB_URL,
    dynamooseDefaults: { // Dynamoose defaults, see https://v1.dynamoosejs.com/api/config/#dynamoosesetdefaultsoptions for details
      create: false,
      update: false,
      waitForActive: false
    },
    entities : entities
  }
```

| Configuration parameter     | Description                                                         |
| --------------------------- | --------------------------------------------------------------------|
| Database type               | The database type value should be 'DynamoDb'                        |
| awsConfig.accessKeyId       | The AWS Access Key Id                                               |
| awsConfig.secretAccessKey   | The AWS Secret Access Key                                           |
| awsConfig.region            | The AWS Region                                                      |
| awsConfig.maxRetries        | The maximum amount of retries to perform for a service request. For more details about aws config object, refer to https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html                                 |
|isLocalDB                    | This flag indicates whether a local database is used or no          |
|localDatabaseURL             | The URL of the local database, required when isLocalDB== true       |
|dynamooseDefaults            | The global default parameters for Dynamoose. for more details refer to https://v1.dynamoosejs.com/api/config/#dynamoosesetdefaultsoptions                                                                        |
|entities                     | This object holds the entities to be managed by the DAL. The key is the table name and the value is the entity definition                                                                                          |


## Entities:
The entities to be managed in DynamoDB by this DAL should have the following format:
```javascript
const Entity = {
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
```

For example:

`Country.js`
```javascript
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
module.exports = Country
```

`EducationalInstitution.js`
```javascript
const EducationalInstitution = {
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

module.exports = EducationalInstitution
```

Construct the entities object to pass to the DAL
```javascript
const entities = {}
entities['countries'] = require('./Country')
entities['educational_institutions'] = require('EducationalInstitution')

module.exports = entities
```

Get the DynamoDBService instance:

```javascript
const { getDatabaseService } = require('tc-dal')

function getDatabaseServiceInstance () {
  if (databaseService) {
    return databaseService
  }
  // See supported aws config at: https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Config.html#constructor-property

  const databaseServiceConfig = {
    awsConfig: {
      accessKeyId: config.AMAZON.AWS_ACCESS_KEY_ID,
      secretAccessKey: config.AMAZON.AWS_SECRET_ACCESS_KEY,
      region: config.AMAZON.AWS_REGION
      // maxRetries: 10
    },
    isLocalDB: config.AMAZON.IS_LOCAL_DB,
    localDatabaseURL: config.AMAZON.DYNAMODB_URL,
    dynamooseDefaults: { // Dynamoose defaults, see https://v1.dynamoosejs.com/api/config/#dynamoosesetdefaultsoptions for details
      create: false,
      update: false,
      waitForActive: false
    },
    entities : entities // The entities object constructed above
  }

  databaseService = getDatabaseService('DynamoDb', databaseServiceConfig)
  return databaseService
}
```

Manage entities using the retrieved instance
```javascript
const databaseService = await getDatabaseServiceInstance()

// More details about how to construct the filter options can be found at https://v1.dynamoosejs.com/api/scan/
const allCountries = await databaseService.search('countries', {})
const allNonDeletedCountries = await databaseService.search('countries', {isDeleted: {eq: true}})

// validate duplicate
// This will throw a Conflict error if a record with name = 'United States' and countryCode = 'USA' already exists in the database
await databaseService.validateDuplicate('countries', ['name', 'countryCode'], ['United States', 'USA'])

// create a new country
const canada = await databaseService.create('countries', {
  name: 'Canada',
  countryFlag: 'https://commons.wikimedia.org/wiki/File:Flag_of_Canada.svg',
  countryCode: 'CAN',
  isDeleted: false
  })

// find by id
const retrievedById = await databaseService.getById('countries', canada.id)


// Update the country code
const updated = await databaseService.update(retrievedById, {countryCode: 'CA'})
```