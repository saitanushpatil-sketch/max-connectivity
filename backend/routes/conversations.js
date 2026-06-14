const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/conversationController');

router.get('/', auth, ctrl.getConversations);
router.post('/get-or-create', auth, ctrl.getOrCreate);
router.post('/group', auth, ctrl.createGroup);
router.put('/:id/theme', auth, ctrl.updateTheme);
router.put('/:id/disappear', auth, ctrl.updateDisappear);
router.put('/:id/read', auth, ctrl.markRead);

module.exports = router;
