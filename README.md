# serverless-lambda-remove-dummy-handler-plugin
Serverless plugin for remove lambda handler

**Configuration**
```
plugins:
 - serverless-lambda-remove-dummy-handler-plugin
```


**Usage**

Run below command
```
serverless package
serverless removeDummyHandler --skipFunctions authorizerFunc
serverless deploy --package .serverless
```
