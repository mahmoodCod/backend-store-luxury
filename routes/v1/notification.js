const router = require('express').Router();
const { list, markRead, markAllRead, remove } = require('../../controllers/v1/notification');
const { auth } = require('../../middlewares/auth');
const roleGuard = require('../../middlewares/roleGuard');

router.use(auth, roleGuard('ADMIN'));

router.get('/', list);
router.patch('/read-all', markAllRead);
router.patch('/:id/read', markRead);
router.delete('/:id', remove);

module.exports = router;


