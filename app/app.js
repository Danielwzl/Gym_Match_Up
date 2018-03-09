var exp = require('express'),
    app = exp(),
    bp = require('body-parser'),
    needle = require('needle'),
    config = require('./config.js'),
    sessions = require('express-session'),
    jwt = require('jsonwebtoken'),
    server = require('http').createServer(app),
    mongoose = require('mongoose'),
    io = require('socket.io').listen(server),
    login = require('./app_modules/auth/login.js'),
    signup = require('./app_modules/auth/signup.js'),
    forget = require('./app_modules/auth/forgetPass.js'),
    emoji = require('node-emoji'),
    Gyms = require('./app_modules/dbs/appdb.js'),
    Foods = require('./app_modules/dbs/fooddb.js'),
    allUsrName = {},
    usersSession = {}, //req.session.user point to this array
    tempSession = {}; //for reset password, it gives all user a random session, will expire when they refresh the page


app.use(exp.static('public'));

app.use(bp.urlencoded({
    extended: false
}));

app.use(sessions({
    secret: 'swe021jdio32409fj',
    resave: false,
    saveUninitialized: false
}));

/*start app server in 3000*/
server.listen(3000, (err) => {
    if (err) console.log('error');
    else {
        var port = server.address().port;
        console.log('server started at localhost:%s', port);
        mongoose.connect(config.database);
    }
});

/*main page for login and signup*/
app.get('/', (req, res) => {
    res.redirect('/signupLogin');
});

app.get('/signupLogin', (req, res) => {
    res.sendFile(__dirname + '/public/signupLogin.html');
})

/*app main page*/
app.get('/userMain/:id', function (req, res) {
    if (!req.session.user) {
        res.redirect('/');
        return;
    }
    if (req.session.user[req.params.id] != undefined) res.sendFile(__dirname + '/secure/userMain.html');
    else res.redirect('/');
});

/*chat page*/
app.get('/chatpage', (req, res) => {
    if (true) res.sendFile(__dirname + "/secure/chatpage.html");
    else res.redirect('/');
});

/*reset password page*/
app.get('/resetpsw/:sid', (req, res) => {
    if (!req.session.tempSession) return; //err if there is no temp Session
    if (req.session.tempSession[req.params.sid] != undefined) {
        res.sendFile(__dirname + '/secure/resetpwd.html');
    }
});

/*get user profile- updated*/
app.post('/getUserProfile', (mainReq, mainRes) => {
    needle.post('localhost:3002/getUserProfile', mainReq.body, (req, res) => {
        if (res == undefined) {
            console.log('server down');
            return;
        }
        mainRes.json(res.body);
    });
});

/*update user account information*/
app.post('/updateAcct', (mainReq, mainRes) => {
    needle.post('localhost:3002/serverLogin', mainReq.body, (req, res) => {
        if (res == undefined) {
            console.log('server down');
            return;
        }
        if (res.body.token) {
            updateUser('serverUpdate', mainReq, mainRes);
        } else mainRes.send(false);
    });
});

/*update user account helper function*/
function updateUser(portName, mainReq, mainRes) {
    needle.post('localhost:3002/' + portName, mainReq.body, (finReq, finRes) => {
        if (finRes == undefined) return;
        mainRes.send(finRes.body.done);
    });
}

/*three auth functions, hidden in seperate app_module folder*/
login(app, needle, usersSession);
signup(app, needle, usersSession);
forget(app, needle, tempSession);

/*logout*/
app.post('/logout/:id', function (req, res) {
    if (req.session.user == undefined) {
        res.redirect('/');
        return; //any error on page will logout and lead user to login page 
    }
    if (req.session.user[req.params.id]) { //if there is session and user hit logout button
        delete usersSession[req.params.id]; //delete from session array
        delete req.session.user[req.params.id]; //delete from req session
    }
    if (Object.keys(req.session.user).length == 0) {
        req.session.destroy(); //destory session if all user left, session will create if user back, let server breath
    }
    res.redirect('/');
});

/*get all type of workout in order to do some analysis*/
app.post('/getAllType', (req, res) => {
    Gyms.find({}, 'type_workout -_id', (err, data) => {
        if (err) throw err;
        res.send(data);
    });
});

/*check if username or email exist, sign in, login, update user account will rely on this function*/
app.post('/checkExist', (mainReq, mainRes) => {
    generalReq('serverCheck', mainReq, mainRes);
});

/*get all workout history to do some analysis*/
app.post('/getHistory', (mainReq, mainRes) => {
    generalReq('getHistory', mainReq, mainRes);
});

//helper function for simple request from app.js to auth.js
function generalReq(port, mainReq, mainRes) {
    needle.post('localhost:3002/' + port, mainReq.body, (req, res) => {
        if (!res) return;
        mainRes.json(res.body);
    });
}

/*update personal information*/
app.post('/updatePersonalInfo', (mainReq, mainRes) => {
    needle.post('localhost:3002/updatePersonalInfo', mainReq.body, (req, res) => {
        if (!res) return;
        mainRes.send(res.body.done);
    });
});

/*reset password
if will check if user has temp session
if there is, send new password and there email to auth.js
*/
app.post('/updateUser', function (mainReq, mainRes) {
    var session = mainReq.session.tempSession;
    if (session == undefined) {
        console.log('session not authurized');
        return;
    }
    if (!mainReq.body.email) mainReq.body.email = session[mainReq.body.sid]; //could be from different page
    needle.post('localhost:3002/serverUpdate', mainReq.body, (req, res) => {
        if (res == undefined) {
            console.log('server err on reset psw');
            return;
        }
        if (res.body.done) mainRes.json(res.body);
    });
});

/*get food data*/
app.post('/getFoodData', (req, res) => {
    Foods.find({}, '-_id -__v', (err, data) => {
        if (err) throw err;
        res.json(data);
    });
});
/*gernerate gym dropdown in post page*/
app.post('/gymDropdown', (req, res) => {
    Gyms.find('-_id  -__v', (err, data) => {
        if (err) throw err;
        else {
            res.json(data);
        }
    });
});

/*send new post to auth.js*/
app.post('/postNewMatch', (mainReq, mainRes) => {
    needle.post('localhost:3002/savePost', mainReq.body, (req, res) => {
        if (res == undefined) {
            console.log('server down');
            return;
        }
        mainRes.json(res.body);
    });
});

app.post('/setHisRead', (mainReq, mainRes) => {
    generalReq('setHisRead', mainReq, mainRes);
});

app.post('/getPhones', (mainReq, mainRes) => {
    generalReq('getPhones', mainReq, mainRes);
});
/*********************/
/*    get    emoji   */
/*********************/

app.post('/emoji', (req, res) => {
    res.json(emoji);
});

/*search post -updateW */
app.post('/searchPost', (mainReq, mainRes) => {
    generalReq('searchPost', mainReq, mainRes);
});

app.post('/removeHis', (mainReq, mainRes) => {
    generalReq('removeHis', mainReq, mainRes);
});
/*********************/
/*    chat handler   */
/*********************/

io.sockets.on('connection', function (socket) {
    //private chat or group chat
    //if there is user I want to send to(sendTo != null) send private msg 
    socket.on('send msg', function (data, callback) {
        if (data.sendTo) { //private msg
            if (socket.nickname === data.sendTo) return; //cannot send to self
            if (data.sendTo in allUsrName) { //name exist
                allUsrName[data.sendTo].emit('wisper', {
                    msg: data.msg,
                    type: data.type,
                    name: socket.nickname
                });
                callback(true);
            } else callback(false);
        } else { //public msg
            socket.broadcast.emit('new msg', {
                msg: data.msg,
                type: data.type,
                name: socket.nickname
            });
            callback(true);
        }
    });

    /*helper function for add new user to chating list
        if there is user logout, it should take param of who logout, and remove that user from UI
    */
    function updateUsers(dcnt) {
        io.sockets.emit('join', {
            names: Object.keys(allUsrName), //just get all their names
            dcnt: dcnt
        });
    }

    /*check if there is user exist in the session - not used this time*/
    function isExist(usersSession, tar) {
        for (one in usersSession) {
            if (usersSession[one].name == tar) return true
        }
        return false;
    }

    //when other user online, should update user list in chat room
    socket.on('new user', function (data, callback) {
        var tar = usersSession[data.id].name;
        callback(tar); //send self to let chat know who is hosting
        if (!(tar in allUsrName)) {
            socket.nickname = tar;
            allUsrName[tar] = socket;
            updateUsers(null);
        }
    });

    /*update everything related to chat if user logout*/
    socket.on('disconnect', function () {
        var name = socket.nickname;
        if (!name) {
            return;
        }
        /*if (!isExist(usersSession, socket.nickname))*/
        delete allUsrName[name]; //delete user from allUserName array
        updateUsers(name);
    });

    // Match Section -Randy
    //Updated March 28 2017, Randy Ma : Fixed socket problems should be updating now
    socket.on('info update', function (data, callback) {
        if (data.id) { //checks for the id of the info-module.
            io.sockets.emit('match update', {
                listOfPeople: data.listOfPeople,
                numOfPeople: data.numOfPeople,
                id: data.id
            });
            callback(true);
        } else {
            callback(false);
        }
    });

    socket.on("info done", function (data, callback) {
        if (data.id) { //checks for the id of the info-module.
            io.sockets.emit('match done', {
                id: data.id
            });
            callback(true);
        } else {
            callback(false);
        }


    });

    socket.on("comment update", function (data, callback) {
        if (data.id) { //checks for the id of the info-module.
            io.sockets.emit('comment respond', {
                id: data.id,
                message: data.message
            });
            callback(true);
        } else {
            callback(false);
        }


    });
});

/*

Randy's Code

*/

//New Codes 
/*  */
app.post("/getPostData", function (mainReq, mainRes) {
    //get all of the match up post
    needle.post("localhost:3002/getAllPost", {}, function (req, res) {
        if (res) {
            mainRes.send(res.body);
        } else {
            console.log("Server no response")
        }


    })

})

app.post("/finishPost", function (mainReq, mainRes) {
    //This will add to History and delete current post depending on host (post.name)
    needle.post("localhost:3002/matchDone", mainReq.body, function (req, res) {
        if (res) {
            mainRes.send(res.body)
        } else {
            console.log("Server no response")
        }


    })

});

app.post("/updatePost", function (mainReq, mainRes) {
    //Do this once to update Post
    needle.post("localhost:3002/updateMatch", mainReq.body, function (req, res) {
        if (res) {
            mainRes.send(res.body);
        } else {
            console.log("Server no response")
        }
    });


})
//This will add comments to the database 
app.post("/commentUpdate", function (mainReq, mainRes) {
    //Do this once to update Post
    needle.post("localhost:3002/updateMatch", mainReq.body, function (req, res) {
        if (res) {} else {
            console.log("Server no response")
        }
    });


})

//this will add user name
app.post("/getUsername", function (mainReq, mainRes) {

    if (mainReq.body) {
        mainRes.send(usersSession[mainReq.body.id])

    }

})

//New Codes kyle Lavery
//April 1 2017 ADD change now sends user name to get user's post history
app.post("/getHistoryData", function (mainReq, mainRes) {
    //get all of the match up post
    needle.post("localhost:3002/getAllHistory", mainReq.body, function (req, res) {
        if (res) {
            mainRes.send(res.body);
        } else {
            console.log("Server no response")
        }


    })

})
