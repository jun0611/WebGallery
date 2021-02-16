const path = require('path');
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('frontend'));

var multer  = require('multer');
var upload = multer({ dest: 'uploads/' });

var Datastore = require('nedb')
  , users = new Datastore({ filename: 'db/users.db', autoload: true })
  , comments = new Datastore({ filename: 'db/comments.db', autoload: true})
  , images = new Datastore({ filename: 'db/images.db', autoload: true });


const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(function (req, res, next){
    var cookies = cookie.parse(req.headers.cookie || '');
    req.username = (req.session.username)? req.session.username : "";
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

var isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};

var Comment = function cmt(req){
    this.content = req.body.content;
    this.author = req.username;
    this.date = (new Date()).toDateString();
    this.timeCreated = (new Date()).getTime();
    this.imageId = req.body.imageId;
};

var Image = function image(req){
    this.title = req.body.title;
    this.author = req.body.author;
    this.date = (new Date()).toDateString();
    this.picture = req.file;
    this.prev = null;
    this.next = null;
    this.owner = req.username;
};

function generateSalt (){
    return crypto.randomBytes(16).toString('base64');
}

function generateHash (password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

app.post('/signup/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (user) return res.status(409).end("username " + username + " already exists");
        //generate hash
        var salt = generateSalt();
        var saltedHash = generateHash(password, salt);
        users.update({_id: username},{_id: username, saltedHash, salt}, {upsert: true}, function(err){
            if (err) return res.status(500).end(err);
            req.session.username = username;
            // initialize cookie
            res.setHeader('Set-Cookie', cookie.serialize('username', username, {
                  path : '/', 
                  maxAge: 60 * 60 * 24 * 7
            }));
            return res.json(username);
        });
    });
});

app.post('/signin/', function (req, res, next) {
    var username = req.body.username;
    var password = req.body.password;
    // retrieve user from the database
    users.findOne({_id: username}, function(err, user){
        if (err) return res.status(500).end(err);
        if (!user) return res.status(401).end("access denied");
        //generate hash
        var saltedHash = generateHash(password, user.salt);
        if (user.saltedHash !== saltedHash) return res.status(401).end("access denied"); 
        // initialize cookie
        req.session.username = username;
        res.setHeader('Set-Cookie', cookie.serialize('username', username, {
              path : '/', 
              maxAge: 60 * 60 * 24 * 7
        }));
        return res.json(username);
    });
});

app.post('/api/images/picture/:username/', isAuthenticated, upload.single('picture'), function (req, res, next) {
    // authorization
    if (req.params.username == req.username){
        var img = new Image(req);
        //set next for img
        images.find({"owner": req.username}).sort({"_id":-1}).limit(1).exec(function(err, first_img){
            if (err) return res.status(500).end(err);
            // if the owner has a gallery
            if (first_img.length != 0) { 
                // set next for img
                img.next = first_img[0]._id;
                images.insert(img, function(err, image){
                    if (err) return res.status(409).end(err);
                    //update prev for next image
                    images.update({"_id": first_img[0]._id}, {$set: {"prev": image._id}}, function(err, prev){
                        if (err) return res.status(500).end(err);
                        return res.json(image);
                    });
                });
            } else {
                // insert img if img is the very first image of owner's gallery
                images.insert(img, function(err, image){
                    if (err) return res.status(409).end(err);
                    return res.json(image);
                });                
            }
        });
    }
});

app.post('/api/comments/:imgId/', isAuthenticated, function (req, res, next) {
    images.findOne({"_id": req.params.imgId}, function(err, img){
        if (err) return res.status(500).end(err);
        if (img) {
            let comment = new Comment(req);
            comments.insert(comment, function(err, res_cmt){
                if (err) return res.status(500).end(err);
                return res.json(res_cmt);
            });
        } else return res.status(401).end("image does not exist")
    });
});


app.get('/signout/', function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    res.redirect('/');
});

app.get('/api/comments/:id/:page/', isAuthenticated, function (req, res, next) {
    let img_id = req.params.id;
    let page = parseInt(req.params.page);
    let hasNextPage = true;
    comments.find({"imageId": img_id}).sort({timeCreated:-1}).skip(page*5).limit(6).exec(function(err, cmts){
        if (err) return res.status(500).end(err);
        if (cmts.length < 6) hasNextPage = false;
        cmts = cmts.slice(0, 5);
        return res.json({'comments': cmts.reverse(), 'page': page, 'hasNextPage': hasNextPage});
    });
});

app.get('/api/images/display/:id/', isAuthenticated, function (req, res, next) {
    images.findOne({"_id": req.params.id}, function(err, img){
        if (err) return res.status(500).end(err);
        if(!img) return res.status(404).end("image:" + req.params.id + " does not exists");
        //send file
        res.setHeader('Content-Type', img.picture.mimetype);
        res.sendFile(__dirname + '/' + img.picture.path);
    });
});

// return first image of a user's gallery
app.get('/api/gallery/:username/', isAuthenticated, function (req, res, next) {
    images.find({"owner":req.params.username}).sort({"_id":-1}).limit(1).exec(function(err, first_img){
        if (err) return res.status(500).end(err);
        if (first_img.length != 0){
            return res.json(first_img[0]);
        } else return res.json(null);
    });
});

//get image object
app.get('/api/image/:id/', isAuthenticated, function (req, res, next) {
    images.findOne({"_id": req.params.id}, function(err, img){
        if (err) return res.status(500).end(err);
            return res.json(img);
    });
});

app.delete('/api/images/:id/', isAuthenticated, function (req, res, next) {
    img_id = req.params.id;
    //update prev and next images
    images.findOne({"_id": img_id}, function(err, cur_img){
        if (err) return res.status(500).end(err);
        if(!cur_img) return res.status(404).end("image:" + img_id + " does not exists");
        if (cur_img.owner == req.username) {
            //remove cur_img from database
            images.remove({"_id": img_id}, function(err, msg){
                if (err) return res.status(500).end(err);
                //remove comments
                comments.remove({"imageId": img_id}, function(err, numDeleted){
                    if (err) return res.status(500).end(err);
                    //update prev and next images
                    images.findOne({"_id": cur_img.prev}, function(err, prev_img){
                        if (err) return res.status(500).end(err);
                        images.findOne({"_id": cur_img.next}, function(err, next_img){
                            if (err) return res.status(500).end(err);
                            if (!next_img) {
                                //no prev and no next
                                if (!prev_img) return res.json(null)
                                //if there is prev but no next
                                images.update({"_id": prev_img._id}, {$set: {"next": null}}, function(err, new_next){
                                    if (err) return res.status(500).end(err);
                                });
                                return res.json(prev_img);
                            } else {
                                // if there is next but no prev
                                if (!prev_img) {
                                    images.update({"_id": next_img._id}, {$set: {"prev": null}}, function(err, new_next){
                                        if (err) return res.status(500).end(err);
                                    });
                                    return res.json(next_img);                      
                                }
                                // if there is next and prev
                                images.update({"_id": prev_img._id}, {$set: {"next": next_img._id}}, function(err, new_next){
                                    if (err) return res.status(500).end(err);
                                });
                                images.update({"_id": next_img._id}, {$set: {"prev": prev_img._id}}, function(err, new_next){
                                    if (err) return res.status(500).end(err);
                                });
                                return res.json(prev_img);
                            }
                        });
                    });
                });
            });
        }
    });
});

app.delete('/api/comments/:id/', isAuthenticated, function (req, res, next) {
    comments.findOne({"_id": req.params.id}, function(err, comment){
        if (err) return res.status(500).end(err);
        if (!comment) return res.status(404).end("comment id:" + req.params.id + " does not exists");
        // delete if the comment belongs to the user 
        // or if the user owns the image that the comment is under
        images.findOne({"_id": comment.imageId}, function(err, image){
            if(err) return res.status(500).end(err);
            if(image) {
                if(comment.author == req.username || image.owner == req.username){
                    comments.remove({"_id": req.params.id}, function(err, result){
                        if (err) return res.status(500).end(err);
                        return res.json(comment);
                    });
                } else return res.status(401).end("access denied");
            }
        });
    });
});

app.get('/api/users/', function (req, res, next) {
    users.find({}, {_id: 1}, function(err, db_users){
        if (err) return res.status(500).end(err);
        return res.json(db_users);
    });
});

const http = require('http');
const PORT = 3000;

http.createServer(app).listen(PORT, function (err) {
    if (err) console.log(err);
    else console.log("HTTP server on http://localhost:%s", PORT);
});
