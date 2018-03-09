/*
    get new user info and send them to auth.js to create new user
*/
function signup(app, needle, usersSession) {
    app.post('/newUser', function (mainReq, mainRes) {
        needle.post('localhost:3002/newUser', {
            //sql injection
            name: mainReq.body.username.toString(),
            pass: mainReq.body.newPass.toString(),
            email: mainReq.body.email.toString(),
            fName: mainReq.body.fName.toString(),
            lName: mainReq.body.lName.toString(),
            street: mainReq.body.street.toString(),
            unit: mainReq.body.unit.toString(),
            city: mainReq.body.city.toString(),
            pcode: mainReq.body.pcode.toString(),
            province: mainReq.body.province.toString(),
            country: mainReq.body.country.toString(),
            phone: mainReq.body.phone.toString()
        }, function (req, res) {
            session = mainReq.session;
            usersSession[res.body.token] = { //use token as sessionID
                name: res.body.name
            };
            session.user = usersSession;
            mainRes.json({
                id: res.body.token
            });
        });
    });
}

module.exports = signup;
