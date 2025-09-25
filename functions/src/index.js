const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Example function - you can add your own functions here
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

// Export any other functions you need here
