'use strict';

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const ZOOPLA_API_TOKEN = process.env.ZOOPLA_API_TOKEN;
const request = require('request');
// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, () => console.log('webhook is listening'));

// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

  console.log("WHAT THE FUCK ARE YOU DOING");
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

  // Gets the body of the webhook event
  let webhook_event = entry.messaging[0];
  console.log(webhook_event);


  // Get the sender PSID
  let sender_psid = webhook_event.sender.id;
  console.log('Sender PSID: ' + sender_psid);

  // Check if the event is a message or postback and
  // pass the event to the appropriate handler function
  if (webhook_event.message) {
    handleMessage(sender_psid, webhook_event.message);
  } else if (webhook_event.postback) {
    handlePostback(sender_psid, webhook_event.postback);
  }

});

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  console.log("GET OR WHAT?");

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "123456"

  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {

    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {

      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);

    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});

// Gets the urls of each property and returns them in a list
function returnProperties (received_message, listing_count) {
  var url;
  for (var p = 0; p < listing_count; p++) {
    url.push((received_message[p]).details_url);
  }
  return url;
}

// Handles messages events
function handleMessage(sender_psid, received_message) {

  let response;

  // Check if the message contains text
  if (received_message.text) {

    // Create the payload for a basic text message
    var zooplaData = callZooplaAPI("Edinburgh", "eh165ay");
    var urls = returnProperties (zooplaData.listing, zooplaData.result_count);

    // !!Rough algorithm!! change as needed
    //- send first message
    //-	Get budget if valid number is given
    //-	Get location if valid location is given
    //-	If neither detected, “Sorry, but I couldn’t recognise a budget or location. Could you tell me again?”
    //
    //“I found these properties that match: blabflaefaeblhfabefwlbweia.”
    //“Would ya like more?”
    //-	If yes, repeat
    //-	If no “aight cool bye"
    response = {
      "text": `Hello. Thanks for contacting me. I can help you with finding a property. To get started, could you give me a rough idea of your budget and/or the location you are looking for properties?`
    }
  }

  // Sends the response message
  callSendAPI(sender_psid, response);
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": process.env.PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}

function callZooplaAPI(location, postcode) {
    const Http = new XMLHttpRequest();
    const url="http://api.zoopla.co.uk/api/v1/property_listings.js?postcode=" + postcode + "&area=" + location + "&api_key=" + ZOOPLA_API_TOKEN;
    Http.open("GET", url);
    Http.send();

    Http.onreadystatechange=(e)=>{
      var response = Http.responseText;
    }

    return response;

}
