//Update the properties of the object below and rename this file config.js

let config = {}

config.salesforce = {}
config.salesforce.client_id = "client_id"
config.salesforce.client_secret = "client_secret"
config.salesforce.sandboxRoot = 'sandbox'
config.salesforce.callbackRoot = 'http://localhost:3002/'

config.app={}
config.app.port = 3002 //or whatever port you want to run this applicaiton on. 

module.exports = config