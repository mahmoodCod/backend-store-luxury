const express = require('express')
const router = express.Router()

const { send } = require('../../controllers/v1/contact')

router.post('/', send)

module.exports = router



