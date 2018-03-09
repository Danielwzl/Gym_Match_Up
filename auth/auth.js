var exp = require('express'),
    app = exp(),
    bp = require('body-parser'),
    mongoose = require('mongoose'),
    jwt = require('jsonwebtoken'),
    config = require('./config.js'),
    nodemailer = require('nodemailer'),
    Users = require('./models/users.js');

app.use(exp.static('public'));

app.use(bp.urlencoded({
    extended: false
}));

/*start sever in 3002*/
var server = app.listen(3002, (err) => {
    if (err) console.log('error');
    else {
        var port = server.address().port;
        console.log('sever started at localhost:%s', port);
        mongoose.connect(config.database); //connect to mongodb
    }
});


// create reusable transporter object using the default SMTP transport
let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'gymmatchupmru@gmail.com',
        pass: 'zwang719'
    }
});

/*debug page wasted*/
app.get('/', function (req, res) {
    res.send('hello');
});

/*deal with user login*/
app.post('/serverLogin', (req, res) => {
    var name = req.body.name,
        pass = req.body.pass;
    if (name.match(/\w+\@\w+(\.\w+)+/)) obj = {
        email: name //it will check user use either email or username
    };
    else obj = {
        name: name
    };
    authUser(obj, pass, res); //auth user
});

/*sign up for new user*/
app.post('/newUser', (req, res) => {
    var usr = new Users({
        name: req.body.name,
        pass: req.body.pass,
        email: req.body.email,
        rName: {
            lName: req.body.lName,
            fName: req.body.fName
        },
        address: {
            unit: req.body.unit,
            street: req.body.street,
            city: req.body.city,
            province: req.body.province,
            country: req.body.country,
            pcode: req.body.pcode
        },
        phone: req.body.phone,
        token: generateToken(req.body.name, req.body.pass)
    });
    usr.save((err, data) => {
        console.log('data saved');
        res.json({
            name: data.name,
            token: data._id //as their new sid
        });
    });
});

/*check if user exist*/
app.post('/serverCheck', (req, res) => {
    var exist = false;
    Users.findOne(req.body, (err, data) => {
        if (err) throw err;
        if (data) exist = true;
        res.json({
            exist: exist
        });
    });
});

/*save new match up post to dbs*/
//RANDY April 1 2017 make query right changes
app.post('/savePost', (req, res) => {
    var saved = false,
        post = req.body,
        times = formatTimeAndDate(post.time),
        obj_json = {
            time: times.time,
            date: times.date,
            description: post.des,
            place: post.meetplace + '|' + post.gym + '|' + post.branch,
            type: post.type,
            maxppl: post.maxppl,
            ppl: [],
            postTime: post.postTime
        },
        obj = JSON.stringify(obj_json);
    Users.findOneAndUpdate({
        _id: post.id
    }, {
        $push: {
            currentPost: obj
        }
    }, (err, data) => {
        if (err) throw err;
        if (data)
            res.json(obj_json);
        else res.send(false);
    });
});

/*update user persional infomation*/
app.post('/updatePersonalInfo', (req, res) => {
    var obj = {
        rName: {
            lName: req.body.lName,
            fName: req.body.fName
        },
        address: {
            unit: req.body.unit,
            street: req.body.street,
            city: req.body.city,
            province: req.body.province,
            country: req.body.country,
            pcode: req.body.pcode
        },
        phone: req.body.phone
    }

    Users.findOneAndUpdate({
        name: req.body.name
    }, obj, (err, data) => {
        if (err) throw err;

        if (data) res.json({
            done: true
        });
        else res.json({
            done: false
        });
    });
});

/*get user profile- updated*/
app.post('/getUserProfile', (req, res) => {
    if (!req.body._id) return;
    Users.findOne(req.body, '-_id -__v', (err, data) => {
        if (err) throw err;
        res.send(data);
    });
});

/*send server email to user*/
app.post('/emailForPsw', (req, res) => {
    Users.findOne({
        email: req.body.email
    }, (err, data) => {
        if (err) throw err;
        else {
            if (!data) {
                res.json({
                    exist: false,
                    meg: "user not found"
                });
            } else {
                let mailOptions = {
                    from: '"(noreply)password reset" <gymmatchupmru@gmail.com>', // sender address
                    to: data.email, // list of receivers
                    subject: 'Gym match up reset password', // Subject line
                    text: 'click link to complete reset password', // plain text body
                    html: '<b>click link to complete reset password:</b> <a href = "http://localhost:3000/resetpsw/' + req.body.sid + '">reset password</a>'
                };
                // send mail with defined transport object
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) {
                        console.log(error);
                        return;
                    }
                });
                res.json({
                    exist: true,
                    meg: "user found"
                });
            }
        }
    });
});

/*get user work out history*/
app.post('/getHistory', (req, res) => {
    Users.findOne({
        name: req.body.name
    }, 'postHistory -_id', ' -__v ', (err, data) => {
        if (err) throw err;
        res.send(data);
    });
});

/*for reset or update password or username(account info)*/
app.post('/serverUpdate', (req, res) => {
    if (req.body.type == 'resetPass') {
        Users.findOne({
                email: req.body.email || req.body.name, //different key all refer to email, this is one solution for bad structure 
            },
            'name token pass', (err, data) => {
                if (err) {
                    throw err;
                } else {
                    if (!data) return;
                    var name = req.body.newName || data.name, //get name for making token
                        token = req.body.newPass ? generateToken(name, req.body.newPass) : data.token; //if there is new password, generate token otherwise user old password
                    if (name != null) {
                        Users.findOneAndUpdate({
                            name: data.name
                        }, {
                            name: name,
                            pass: req.body.newPass || data.pass,
                            token: token
                        }, (err, data) => {
                            if (err) throw err;
                            else {
                                if (!data) {
                                    console.log('no user found');
                                } else {
                                    res.json({
                                        done: true
                                    });
                                }
                            }
                        });
                    }
                }
            });
    }
});

/*get all matchup post for match up page*/
app.post("/getAllPost", function (req, res) {
    Users.find({
        currentPost: {
            $gt: 0
        }
    }, 'name currentPost -_id', (err, data) => {
        if (err) throw err;
        res.json(data);
    });
});

/*check username and password by using token*/
function authUser(obj, pass, res) {
    var status = 'fail',
        token, name;
    Users.findOne(obj, (err, data) => {
        if (err) throw err;
        if (!data) {
            console.log('user not exists');
        } else {
            token = jwt.decode(data.token);
            if (pass == token.pass) {
                status = 'ok';
                token = data._id;
                name = data.name;
            } else token = null;
        }

        if (!res) return;
        res.json({
            name: name,
            status: status,
            token: token
        });
    });
}

/*making a new token*/
function generateToken(name, pass) {
    return jwt.sign({
        name: name,
        pass: pass
    }, 'secret', {
        expiresIn: 60 * 60
    });
}

/*take data and time in proper format*/
function formatTimeAndDate(time) {
    var data = time.split('T');
    return {
        date: data[0],
        time: data[1]
    }

}

/*sort by search -updateW*/
app.post('/searchPost', (req, res) => {
    Users.find({
        currentPost: {
            $gt: 0
        }
    }, 'name currentPost', (err, data) => {
        if (err) throw err;
        var objs = [];
        var name;
        var id;
        var posts;
        var type;
        var currentPost;
        for (var i = 0, len = data.length; i < len; i++) {
            id = data[i]._id;
            name = data[i].name;
            posts = data[i].currentPost;
            currentPost = [];
            for (var j = 0, len2 = posts.length; j < len2; j++) {
                type = JSON.parse(posts[j]).type;
                if (req.body.type == type) {
                    currentPost.push(posts[j]);
                }
            }
            objs.push({
                id: id,
                name: name,
                currentPost: currentPost
            });
        }
        res.json(objs);
    });
});

/*remove all history*/
app.post('/removeHis', (req, res) => {
    Users.update({
        _id: req.body.id,
        postHistory: {
            $gt: 0
        }
    }, {
        $set: {
            postHistory: []
        }
    }, (err, data) => {
        if (err) throw err;
        res.send(true);
    });
});

/*set history as read*/
app.post('/setHisRead', (req, res) => {
    var postTime = req.body.postTime,
        owner = req.body.name,
        tempData;
    Users.find({
            _id: req.body.id,
            postHistory: {
                $gt: 0
            }
        },
        'postHistory -_id', (err, data) => {
            if (err) throw err;
            data = data[0].postHistory;
            for (var i = 0, len = data.length; i < len; i++) {
                tempData = JSON.parse(data[i]);
                if (postTime == tempData.postTime && tempData.owner == owner) {
                    tempData.new = false;
                    data[i] = JSON.stringify(tempData);
                    Users.update({
                        _id: req.body.id
                    }, {
                        postHistory: data
                    }, (err, data) => {
                        res.send(true);
                    });
                    break;
                }
            }
        });
});

//get all phone with user in this match
app.post('/getPhones', (req, res) => {
    var postTime = req.body.postTime,
        owner = req.body.name,
        tempData,
        myPhone,
        phones = {};
    Users.find({
        _id: req.body.id
    }, 'phone postHistory -_id', (err, data) => {
        if (err) throw err;
        myPhone = data[0].phone;
        data = data[0].postHistory; //get posthistory 
        for (var i = 0, len = data.length; i < len; i++) {
            tempData = JSON.parse(data[i]);
            //find this post history
            if (postTime == tempData.postTime && tempData.owner == owner) {
                if (tempData.ppl.length == 0) { //no one join
                    phones[owner] = myPhone;
                    res.json(phones);
                    return;
                }
                tempData.ppl.push(owner); //add owner to ary, loop for it
                for (var j = 0; j < tempData.ppl.length; j++) {
                    Users.findOne({
                        name: tempData.ppl[j]
                    }, 'name phone -_id', (err, data) => {
                        if (err) throw err;
                        phones[data.name] = data.phone;
                        if (Object.keys(phones).length == tempData.ppl.length) {
                            res.json(phones);
                        }
                    });
                }
                break;
            }
        }
    });
});

/*


New Code Randy Ma




*/

//Updates Matches so when new user logs in he/she can see it
//March 28 2017 Randy: ADDED postTIME will now update right one. PENDING LOOKING FOR BETTER WAY TO UPDATE
//NEW it will update message too.
app.post("/updateMatch", function (req, res) {
    var post = req.body;

    Users.findOne({
        name: post.name
    }, 'currentPost -_id', function (err, data) {
        if (err) throw err;
        var i = 0;

        for (i = 0; i < data.currentPost.length; i++) {
            var detail = data.currentPost[i];
            var obj = JSON.parse(detail)

            if (
                obj.time == post.time &&
                obj.description == post.des &&
                obj.type == post.type &&
                obj.place == post.place &&
                obj.date == post.date &&
                obj.maxppl == post.limit &&
                obj.postTime == post.postTime
            ) {
                //Checks to see if it pushing the user to ppl or it is updating message
                if (post.user) {
                    obj.ppl.push(post.user)

                }
                if (post.message) {
                    obj.message = post.message;
                }

                var objString = JSON.stringify(obj);

                data.currentPost[i] = objString;

                break;
            }
        }

        var string = JSON.stringify(data)


        Users.findOneAndUpdate({
            name: post.name
        }, {
            $set: {
                currentPost: data.currentPost
            }
        }, function (err, post) {
            if (err) throw err;
        })

        res.json(data.currentPost[i]);
    });

})

//Active when user is done with post. Delete entry from current post and moves to history
//March 28 2017 add postTime and remove most comments. 
//CAUTION MAKE SURE THAT USER IN CLIENT HAVE THE RIGHT NAME
//March 29 I forgot it to add to poster so now it will add to poster history
app.post("/matchDone", (req, res) => {

    var post = req.body;
    var ppl = post['listOfPeople[][0]'],
        i = 0,
        aryOfppl = [];
    //get all user joined this match
    while (ppl != undefined || ppl) {
        if (ppl != "user") aryOfppl.push(ppl);
        ppl = post['listOfPeople[][' + ++i + ']'];
    }
    var obj_json = {
            owner: post.name,
            time: post.time,
            date: post.date,
            description: post.des,
            place: post.place,
            type: post.type,
            new: true,
            postTime: post.postTime,
            ppl: aryOfppl
        },
        obj = JSON.stringify(obj_json);

    //add to poster 
    Users.findOneAndUpdate({
        name: post.name
    }, {
        $push: {
            postHistory: obj

        }
    }, (err, data) => {
        if (err) throw err;
        if (data) {



        }
    });

    //This will looop through the limit and break if it's undefined
    for (let index = 0; index < post.limit; index++) {

        if (post["listOfPeople[][" + index + "]"]) {
            var user = post["listOfPeople[][" + index + "]"]
            /* This add the postHistory for each user in the list.*/
            Users.findOneAndUpdate({
                name: user
            }, {
                $push: {
                    postHistory: obj
                }
            }, (err, data) => {
                if (err) throw err;
                if (data) {}
            });

        } else {
            break;
        }

    }
    //Insert remove currentPost Here Find by orignal user in req.body.name



    Users.findOne({
        name: post.name
    }, 'currentPost -_id', function (err, data) {
        if (err) throw err;
        var i = 0;


        for (i = 0; i < data.currentPost.length; i++) {
            var detail = data.currentPost[i];
            var obj = JSON.parse(detail)

            if (
                obj.time == post.time &&
                obj.description == post.des &&
                obj.type == post.type &&
                obj.place == post.place &&
                obj.date == post.date &&
                obj.maxppl == post.limit &&
                obj.postTime == post.postTime
            ) {



                data.currentPost.splice(i, 1)




                break;
            }
        }

        var string = JSON.stringify(data)
        //This will reset the whole array 

        Users.findOneAndUpdate({
            name: post.name
        }, {
            $set: {
                currentPost: data.currentPost
            }
        }, function (err, post) {
            if (err) throw err;
        })

        res.json(data)
    });





});

//New code kyle Lavery
//This will get all post History based off user name.
app.post("/getAllHistory", function (req, res) {
    Users.find({
        name: req.body.name,
        postHistory: {
            $gt: 0
        }
    }, 'name postHistory -_id', (err, data) => {
        if (err) throw err;
        res.json(data);
    });

})
