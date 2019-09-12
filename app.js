const express = require('express');
const bodyParser = require('body-parser');
const request = require("request");

var sf = require('node-salesforce');
const config = require('./config')
console.log("config: " + JSON.stringify(config))
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
    console.log('getclientid')
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
        console.log("total : " + result.totalSize);
        console.log("fetched : " + result.records);
        res.send(result.records);
    });

});
 
app.post('/get_all_assets/', function (req, res) {
    let assetIds = "("
    
    conn.query("SELECT Id, Name, Description, location__c FROM Asset", function(err, result) {
        if (err) { return console.error('getAssets err: ' + err); }
        console.log("total : " + result.totalSize);
        console.log("fetched : " + result.records);
        res.send(result.records);
    });

});
app.post('/toggleadopt/', function (req, res) {
    const info = req.body.info
    conn.sobject("Asset").update({ 
        Id : info.sfid
      }, function(err, ret) {
        if (err || !ret.success) { return console.error(err, ret); }
        // ...
      });
      //
      //
      conn.sobject("Asset").update([
        { Id : info.sfid, Adopted__c : info.Adopted }
      ],
      function(err, rets) {
        if (err) { return console.error(err); }
        console.log("rets: " + JSON.stringify(rets))
        for (var i=0; i < rets.length; i++) {
          if (rets[i].success) {
            console.log("Updated Successfully : " + rets[i].id);
          }
        }
      });
    res.send('gotit');
})
app.post('/adoptaasset/', function (req, res) {
    var asset = req.body.asset;
    console.log('adoptaasset: ' + asset);
    res.send(asset);
})
app.post('/unadoptaasset/', function (req, res) {
    var asset = req.body.asset;
    console.log('unadoptaasset: ' + asset);
    res.send(asset);
})

app.post('/getchatterfeed', function(req, res){
    
    var sfid = req.body.sfId;
    const options = {  
        url: sandboxRoot+"services/data/v45.0/chatter/feeds/record/"+sfid+"/feed-elements",
        method: 'GET',
        headers: {
            Authorization: 'OAuth '+ conn.accessToken
        }
    };
    
    request(options, function(err, res1, body) {  
        let chatterInfo = []
        const json = JSON.parse(body);
        //console.log('request json: ' + JSON.stringify(json));

        json.elements.forEach(function(element){
            
            chatterInfo.push({
                            "actor":{
                                "displayName":element.actor.displayName, 
                                "id":element.actor.id, 
                                "photo": element.actor.photo.smallPhotoUrl
                            }, 
                            "message":{
                                "id":element.id,
                                "parentId":element.parent.id,
                                "createDate":element.createDate,
                                "text":element.body.text,
                                "segments":element.body.messageSegments,
                                "comments":element.capabilities.comments,
                            }
                        })
        })
        //console.log("chatterInfo")
        //console.log(JSON.stringify(chatterInfo))
        res.send(chatterInfo)
    });
})
app.post('/addchatterpost', function (req, res) {
    const msgBody = req.body.msgBody;
    const options = {  
        url: sandboxRoot+"services/data/v45.0/chatter/feed-elements?feedElementType=FeedItem&subjectId="+msgBody.subjectId+"&text="+msgBody.body.messageSegments[0].text,
        method: 'POST',
        headers: {
            Authorization: 'OAuth '+ conn.accessToken
        },
    };
    request(options, function(err, res1, body) {  
        const json = JSON.parse(body);
        let chatterInfo = {}

        chatterInfo.actor = {
            "displayName":json.actor.displayName, 
            "id":json.actor.id, 
            "photo": json.actor.photo.smallPhotoUrl
        }
        chatterInfo.message={
            "id":json.id,
            "parentId":json.parent.id,
            "createDate":json.createDate,
            "text":json.body.text,
            "segments":json.body.messageSegments,
            "comments":json.capabilities.comments,
        }
                        
        
        res.send(chatterInfo)
    });
});
app.post('/addchattercomment', function (req, res) {
    const msgBody = req.body.msgBody;
    const options = {  
        url: sandboxRoot+"services/data/v45.0/chatter/feed-elements/"+msgBody.messageId+"/capabilities/comments/items?text="+msgBody.comment,
        method: 'POST',
        headers: {
            Authorization: 'OAuth '+ conn.accessToken
        },
    };
    request(options, function(err, res1, body) {  
        const json = JSON.parse(body);
        res.send(json)
    });
});

app.post('/test/', function (req, res) {
    console.log('userObject: ' + JSON.stringify(userObject));
    console.log('userObject.userAccessToken: ' + userObject.userAccessToken);
    res.send("esri_salesforce app works")
})
app.listen(config.app.port, function(){
    console.log('Server started on port ' + config.app.port);
})

