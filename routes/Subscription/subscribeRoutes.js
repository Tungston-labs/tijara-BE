const express = require('express');
const router = express.Router();
const jwtAuthentication = require('../../middleware/jwtAuthentication');
const { subscribeUser } = require('../../controllers/Subscription/subscriptionController');

// Protect this route with JWT
router.post('/subscribe', jwtAuthentication, subscribeUser);

module.exports = router;
