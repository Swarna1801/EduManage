const express = require('express');
const router = express.Router();
const { MessagingResponse } = require('twilio').twiml;

router.post('/incoming', async (req, res) => {
    const twiml = new MessagingResponse();
    const messageBody = req.body.Body.toLowerCase();

    // Basic Logic for EduManage
    if (messageBody.includes('marks')) {
        twiml.message("Checking the latest marks for your child... 📈");
    } else {
        twiml.message("Welcome to EduManage! Reply with 'MARKS' for grades or 'EVENT' for school news.");
    }

    res.type('text/xml').send(twiml.toString());
});

module.exports = router;