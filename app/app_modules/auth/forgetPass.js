/*after click sendemail, then it will ask auth to send server email*/
function forgetPass(app, needle, tempSession){
    app.post('/forgot', (mainReq, mainRes) => {
    var session = mainReq.session;
    mainReq.body.sid = session.id; //send session id to auth.js
    needle.post('localhost:3002/emailForPsw', mainReq.body, (req, res) => {
        if (res.body.exist) {
            if (session.tempSession == undefined) {
                session.tempSession = tempSession;
            }
            session.tempSession[mainReq.body.sid] = mainReq.body.email;
        }
        res.body.sid = mainReq.session.id;
        mainRes.json(res.body); //send to forgot-psw module
    });
});
}

module.exports = forgetPass;





