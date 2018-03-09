/*
    get user name and pass and send them to auth.js to verify them
*/
function login(app, needle, usersSession) {
    var session;
    app.post('/login', (mainReq, mainRes) => {
        needle.post('localhost:3002/serverLogin', {
            name: mainReq.body.name,
            pass: mainReq.body.pass
        }, (req, res) => {
            if (res == undefined) {
                console.log('server down');
                return;
            }
            if (res.body.status == 'ok') { //login
                console.log('login successfully!');
                session = mainReq.session;
                usersSession[res.body.token] = { //use token as sessionID
                    name: res.body.name
                };
                session.user = usersSession; //store into req session too
                mainRes.json({
                    id: res.body.token
                });
            } else if (res.body.status == "fail") { //not login
                console.log('login failed');
                mainRes.json({
                    login: false
                });
            }
        });
    });
}

module.exports = login;
