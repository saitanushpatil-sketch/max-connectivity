const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { getCallHistory, logCall } = require('../controllers/callController');

router.get('/history', auth, getCallHistory);
router.post('/log', auth, logCall);

module.exports = router;
