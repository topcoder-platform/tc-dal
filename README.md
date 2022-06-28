# Topcoder Data Access Layer:
This library provides data access layer to use by Topcoder applications.

Currently it only supports DynamoDB database

# Benefits of using the DAL:
This DAL provides a centralized layer for all interactions with the database.

Instead of repeating the same code across multiple applications, it is grouped in the DAL which makes the code a lot easier to maintain and update.

It also adds an abstraction level to the database calls, and makes the applications loosely coupled with the underlying database system, Switching to another database can be achieved with minimal code and configuration changes.

# Documenation:
. Documentation for Dal usage with DynamoDB can be found at [DynamoDb docs](docs/DynamoDB.md)

