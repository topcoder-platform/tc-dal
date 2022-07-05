# Topcoder Data Access Layer:
This library provides data access layer to use by Topcoder applications.

Currently it only supports DynamoDB database

# Logging and Instrumentation:
This library uses the logger library which part of the tc-framework https://github.com/topcoder-platform/tc-framework/tree/develop/src/lib/logger

The logger library is used for logging and code instrumentation, however it does not fully work, it is still under development/test.

For local testing, kindly make sure that tc-framwork is properly installed locally and update the file path accordingly in `package.json` (`"tc-framework": "file:../tc-framework"`)


# Benefits of using the DAL:
This DAL provides a centralized layer for all interactions with the database.

Instead of repeating the same code across multiple applications, it is grouped in the DAL which makes the code a lot easier to maintain and update.

It also adds an abstraction level to the database calls, and makes the applications loosely coupled with the underlying database system, Switching to another database can be achieved with minimal code and configuration changes.

# Documenation:
. Documentation for Dal usage with DynamoDB can be found at [DynamoDb docs](docs/DynamoDB.md)

