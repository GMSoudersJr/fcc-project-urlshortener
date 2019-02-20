'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var cors = require('cors');
const dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;

/** this project needs a db !! **/ 
// mongoose.connect(process.env.MONGOLAB_URI);
//mongoose.connect(process.env.MONGO_URI, {useNewUrlParser: true})
var connection = mongoose.createConnection(process.env.MONGO_URI, {useNewUrlParser: true});
var schema = mongoose.Schema
      var urlSchema = new schema({
        original_url : String,
        short_url: Number,
        address: String
      })
var URL =  connection.model('URL', urlSchema)
var db = mongoose.createConnection(process.env.MONGO_URI, {useNewUrlParser: true});
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function() {
  // we're connected!
  console.log('database connection: Successful!')
  
});

//Logger
app.use(function(req, res, next){
console.log(req.method +' '+ req.path  + ' - ' + req.ip)
next()
})

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({extended:false}))

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});

  
// your first API endpoint... 
app.get("/api/hello", function (req, res) {
  res.json({greeting: 'hello API'});
});


app.post("/api/shorturl/new", function(req, res, next){
  let url = req.body.url
  const regex = /^https*:\/\// //Made this to take care of url issues in the beginning
  const routeCutter = '/'    //turns out I'm not done.  Need to add somemore to the regex 
  url.match(regex)?req.body.host = url.slice(url.match(regex)[0].length):req.body.host = 'has an invalid URL';
  //Put this here to cut-off the end of the url so lookup only deals with the hostname
  req.body.host.indexOf(routeCutter)>=0?req.body.host=(req.body.host.substring(0, req.body.host.indexOf(routeCutter))):console.log("it doesn't have any routes")
  var lookThisShitUp = function(done){
    dns.lookup(req.body.host, function(err, address){
       console.log("Lookup is validating " + req.body.host + " and the address is " + address)
//create, save, and display the newest addition to the database.
      var createAndSaveUrl = function(done) {
        console.log("It doesn't exist in the database, so it will be created, saved, and displayed.")
        URL.find().estimatedDocumentCount(function(err, count){
          count+=1;//creates the short_url.
          var website = new URL({original_url: req.body.url, short_url:count, address: address})
          err?console.log(err+" @estimatedDocumentCount createAndSave"):
           website.save(function(err){
            err?console.log(err+" @createAndSaveUrl"):res.json({'original_url':website.original_url, 'short_url':website.short_url, 'message': 'Thanks for the new entry'});
          })
        })
      };
//This find is to make sure that the database does not get duplicate entries.  If it does not exist, go create it.
      var findUrl= function(url, done) {
        URL.find({'original_url':url}, function(err, who){
          console.log("Searching the database for "+ req.body.url)
        err?console.log(err)
          :who[0]===undefined?createAndSaveUrl(url):
        done;
        })
      };
//If dns.lookup throws an error, then the problem is the hostname, not the url.  Otherwise, find it in the database.       
      err?req.body.host='has an invalid Hostname':findUrl(req.body.url)
      done;
  })  
  };
  
  lookThisShitUp()
  next()
  }, function (req, res){
   //if the url is invalid, don't even bother searching for it.  Respond with the error!  Tell the user what to look for.
      req.body.host==='has an invalid URL'?res.json({'error':req.body.host+" - Check http(s)://"}):
      URL.find({original_url:req.body.url}, "original_url short_url",function(err, doc){
        err?console.log(err + ' @next findURL'):
        req.body.host==='has an invalid Hostname'?res.json({'error':req.body.host+" - Check the spelling."}):
//Decided to use null here so that there would be a space available for the newly created documents to be displayed.
        doc[0]===undefined?null:res.json({'original_url':doc[0].original_url, 'short_url':doc[0].short_url,'Here you go': 'From the database'})
  })
});

app.get('/api/shorturl/:short_url', function(req, res){
console.log(req.params.short_url)
  var requestedShortUrl = req.params.short_url;
  URL.find({short_url:requestedShortUrl}, function(err, doc){
    err?console.log(err + '@GET short_url find'):
    doc[0]===undefined?res.json({'error': 'This short_url does not exist in this database, yet.'}):res.redirect(doc[0].original_url)
  })
});

app.listen(port, function () {
  console.log('Node.js listening ... on port ' + port);
});