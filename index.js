

const express = require('express') ;
const app = express() ;
const bodyParser = require('body-parser') ;
const request = require('request');

const LEFT = 10 ;   // number of tries the user get

const token = process.env.token ;
const access= process.env.access ;
app.set('port',(process.env.PORT || 5000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


var mongo = require('mongodb');
var MongoClient = require('mongodb').MongoClient;
var url = process.env.URL;

app.get('/',function(req,res){
   res.send('Hi this is my pape!') ;
});

app.get('/webhook/',function(req,res){
   if(req.query['hub.verify_token']=== token ){
       res.send(req.query['hub.challenge']);
   }
    res.send('no entry');
});

app.post('/webhook', function (req, res) {
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {

    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);

  }
});

function receivedMessage(event) {
  var senderID      =      event.sender.id;
  var recipientID   =   event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var messageText = message.text;
  var messageAttachments = message.attachments;

  if (messageText) {

    // If we receive a text message, check to see if it matches a keyword
    // and send back the example. Otherwise, just echo the text we received.

        isInGameSessoin(senderID , messageText) ;
        // sendTextMessage(senderID, pickWord(messageText));

  } else if (messageAttachments) { // if the message isnt text
    sendTextMessage(senderID , "sorry you have to send text message")


  }
}

function sendTextMessage(recipientId, messageText) {

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}




function pickWord(senderID , word){

  console.log("******************************pickWord phse**********************************") ;
 var message="" ;


 if(word.toLowerCase().includes("hi")||word.toLowerCase().includes("hello") || word.toLowerCase().includes("whatsapp") ||word.toLowerCase().includes("doing")||word.toLowerCase().includes("get started"))
   message = "Hi , iam gaming bot try to say 'play game'" ;

   else if(word.toLowerCase().includes("bad")||word.toLowerCase().includes("stupid")||word.toLowerCase().includes("worst")||word.toLowerCase().includes("shit")||word.toLowerCase().includes("not good")||word.toLowerCase().includes("fuck"))
   message="iam sorry i will try harder next time" ;

   else if(word.toLowerCase().includes("good")||word.toLowerCase().includes("amazing")||word.toLowerCase().includes("nice")||word.toLowerCase().includes("job")||word.toLowerCase().includes("work") ||word.toLowerCase().includes("perfect") ||word.toLowerCase().includes("awesome")||word.toLowerCase().includes("great")||word.toLowerCase().includes("marvelous")||word.toLowerCase().includes("thanks")||word.toLowerCase().includes("thx")||word.toLowerCase().includes("helped")||word.toLowerCase().includes("masterpiece"))
   message="Thanks";

   else
   if(word.toLowerCase().includes("introduce")||word.toLowerCase().includes("make")||word.toLowerCase().includes("do"))
   message ="iam a gaming bot, to start the game say 'play game'" ;
   else
   message ='hmm i didnt quite get that';

   sendTextMessage(senderID , message) ;

 }


function isInGameSessoin(senderID , word){
  MongoClient.connect(url, function(err, db) {
    if (err) {
    console.log(err)   ;
    return sendTextMessage(senderID , "there is an error try again latter " ) ;
    }


    db.collection("users").findOne({_id:senderID} ,function(err , result){

      if (err) {
      console.log(err);
      return sendTextMessage(senderID , "there is an error try again latter " ) ;
      }
      // {id : 23423234  , number : 1412   , left : 3}
      if(result === null) {
        if(word.toLowerCase() !== "play game"){
            console.log("**************************************new user & no game**************************************") ;
            return pickWord(senderID , word) ;
      }
        else{
          console.log("**************************************new user & new game**************************************") ;
          return createNewUser(true , true , word , senderID , null) ;
        }
      }
      else if(result['left'] <= 0){
        if(word.toLowerCase() !== "play game"){
          console.log("**************************************old user & no game**************************************") ;
            return pickWord(senderID , word) ;
          }
        else{
            console.log("**************************************older user & new game**************************************") ;
            return validateInput(false , true ,  word , senderID , result) ;
        }
      }else{
        console.log("**************************************old user & old game**************************************") ;
        if(word.toLowerCase() === "play game")
          return validateInput(false , true ,  word , senderID , result) ;
        else {
          if(word.toLowerCase() === "exit")
              return updateData(word , senderID , 0 , "okay , hope you enjoyed :D " , -1) ;
          else
              return validateInput(false ,false ,  word , senderID  , result) ;
        }

      }



      db.close() ;

    }) ;
});

}


function validateInput(newUser , newGame , word , senderID , dataObj){
  if(newGame){
    return updateData(word , senderID , LEFT , "hi you have " + LEFT +" tries to guess the 4 digit number , to start the game again type 'play secret game' and 'exit' to end, ok lets begin your first guess ?"  , -1 ) ;

  }

  if(isNaN(word) || word.length != 4 ){
    return sendTextMessage(senderID , "sorry you have to put 4 digit number" ) ;
  }




  return nextTurn(word , senderID , dataObj) ;



}

// update database
function updateData(word , senderID , left , message, oldNumber){
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;


    // {id : 23423234  , number : 1412   , left : 3}
    if(left === LEFT){
        oldNumber = getNumber()  + "" ;
        console.log("the random number is :" + oldNumber )  ;
      }

    var myquery = { _id : senderID };
    var newvalues = { _id : senderID ,number : oldNumber , left : left };   // will change all the fields
    db.collection("users").updateOne(myquery, newvalues, function(err, res) {
      if (err) {
        console.log(err);
        return sendTextMessage(senderID , "there is an error try again latter " ) ;
      }

      db.close();
      return sendTextMessage(senderID , message  )  ;
    });
  });


}

// play next turn
function nextTurn(word , senderID , dataObj){
  if(word === dataObj['number']){
    return updateData(word , senderID , 0 , "Great you won :D ,  the number is: " + dataObj['number'] ,  -1) ;
  }
  else{
    if(dataObj['left'] === 1){
      return updateData(word , senderID , 0 , "ops you lost :( , the number was: " + dataObj['number'] , -1) ;
    }else{
      return updateData(word , senderID , dataObj['left'] - 1 ,getCommonNumber(dataObj['number'] , word) + " correct numbers, " + getNumberInPlaces(dataObj['number'], word) +" correct places, " + (dataObj['left'] - 1 ) + " left tries" , dataObj['number']) ;
    }
  }
}

// to create new user account on the database
function createNewUser(newUser , newGame , word , senderID , dataObj  ) {
  MongoClient.connect(url, function(err, db) {
    if (err) {
      console.log(err);
    return sendTextMessage(senderID , "there is an error try again latter " ) ;
    }
     // {id : 23423234  , number : 1412   , left : 3}
   var obj = { _id : senderID } ;
   db.collection("users").insertOne(obj , function(err , res){
     if(err){
       console.log(err);
      return sendTextMessage(senderID , "there is an error try again latter " ) ;
     }

       db.close() ;
       return  validateInput(newUser , newGame , word , senderID , dataObj) ;
     });
}) ;
}




 function getNumber(){

   var number = "" ;
  do {
   number = "" ;
   number +=  Math.random()  ;
 } while (number.length < 6 );



   console.log("the guessed number is :"+ number) ;

   var rightNumber = "" ;

   for(var i = number.length - 1 ;  i > number.length - 5 ; --i ){
     rightNumber += number.charAt(i) ;
   }

   return rightNumber ;

 }





 function getNumberInPlaces( number,   guess){
   var ans =  0 ;
   for(var i = 0 ; i  < number.length ;  ++i){
       if(number.charAt(i) === guess.charAt(i)){
         ++ans ;
       }
     }

   return ans ;
 }

 function getCommonNumber(number ,  guess){
   var ans =  0 ;
   var done = [false , false , false , false ]  ;
   for(var i = 0 ; i  < guess.length ;  ++i){
     for(var x = 0 ; x < number.length ; ++x){
       if(done[x]) continue  ;
       if(number.charAt(x) === guess.charAt(i)){

         ++ans ;
         done[x] = true ;
         break ;
       }
     }
   }
   return ans ;
 }


function callSendAPI(messageData) {


  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: access },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s",
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });
}


function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback
  // button for Structured Messages.
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " +
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}


app.listen(app.get('port'),function(){
    console.log('running port',app.get('port'));
});
