const express = require('express');
const bodyParser = require('body-parser');
const request = require("request");

var sf = require('node-salesforce');
const config = require('./config')
var userObject = {};

const sandboxRoot = config.salesforce.sandboxRoot
const callbackRoot = config.salesforce.callbackRoot

var conn = new sf.Connection({
    instanceUrl: sandboxRoot    
});

const app = express();

app.use(function (req, res, next) {

    // Website you wish to allow to connect
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Request methods you wish to allow
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

    // Request headers you wish to allow
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

    // Set to true if you need the website to include cookies in the requests sent
    // to the API (e.g. in case you use sessions)
    res.setHeader('Access-Control-Allow-Credentials', true);

    // Pass to next layer of middleware
    next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res){
    res.render('index', {
                //customers:data.data.rows
            })
})
app.post('/getclientid', function(req, res){
    res.send(config.salesforce.client_id);
}) 
app.post('/settoken', function(req, res){
    var queryParams = "grant_type=authorization_code&code="+req.body.code+"&client_id="+config.salesforce.client_id+"&client_secret="+config.salesforce.client_secret+"&redirect_uri="+callbackRoot;
    var reqBodyLength = queryParams.length;
    let obj = {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Content-Length':reqBodyLength},
        //url:     sandboxRoot+'services/oauth2/token',
        url: 'https://login.salesforce.com/services/oauth2/token',
        body: queryParams
    };
    request.post(obj, function(error, response, body){
        var bodyJSON = JSON.parse(body);
        if (!error) {
            conn.accessToken = bodyJSON.access_token;
            res.send("token set!");
        }
        else {
            res.send("loginError: " + JSON.stringify(bodyJSON.error));
        }
     });
}) 
app.post('/getassets/', function (req, res) {
    const assetList = req.body.assetids
    let assetIds = "("
    assetList.forEach(function(listItem, index){
        index===0?assetIds+="'"+listItem+"'":assetIds+=",'"+listItem+"'"
    })
    assetIds+=")"
    conn.query("SELECT Id, SerialNumber, Adopted__c FROM Asset WHERE SerialNumber IN " + assetIds, function(err, result) {
        if (err) { return console.error('getAssets err: ' + err); }
        res.send(result.records);
    });

});
 
app.post('/get_all_assets/', function (req, res) {
    let assetIds = "("
    
    conn.query("SELECT Id, Name, Description, location__c FROM Asset", function(err, result) {
        if (err) { return console.error('getAssets err: ' + err); }
        res.send(result.records);
    });

});
app.post('/saveasset/', function (req, res) {
    var request = require('request');

    var headers = {
        'authorization': 'OAuth '+ conn.accessToken,
        'content-type': 'application/json'
    };

    var dataString 
    
    if (req.body.info.hasOwnProperty('Name')) {
        dataString = `{"Name": "${req.body.info.Name}"}`;
    }
    else if (req.body.info.hasOwnProperty('Description')) {
        dataString = `{"Description": "${req.body.info.Description}"}`;
    }

    var options = {
        url: sandboxRoot+"services/data/v53.0/sobjects/Asset/"+req.body.info.Id+".json",
        method: 'PATCH',
        headers: headers,
        body: dataString
    };

    function callback(error, response, body) {
        if (!error && response.statusCode === 200 || response.statusCode === 204) {
            res.send('success');
        } else {
            res.status(400).send({
                message: 'This is an error!'
            });
        }
    }
    request(options, callback);
})
app.listen(config.app.port, function(){
    console.log('Server started on port ' + config.app.port);
})

