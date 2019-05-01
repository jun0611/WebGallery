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

app.use(function (req, res, next){
    var cookies = cookie.parse(req.headers.cookie || '');
    req.username = session.username;
    console.log("HTTP request", req.username, req.method, req.url, req.body);
    next();
});

const session = require('express-session');
app.use(session({
    secret: 'please change this secret',
    resave: false,
    saveUninitialized: true,
}));

app.use(function (req, res, next){
    console.log("HTTP request", req.method, req.url, req.body);
    next();
});

var Comment = (function(){
    var id = 0;
    return function cmt(req){
        this._id = id++;
        this.content = req.body.content;
        this.author = req.username;
        this.date = (new Date()).toDateString();
        this.imageId = req.body.imageId;
    }
}());

var Image = (function(){
    var id = 0;
    return function image(req){
        this._id = id++;
        this.title = req.body.title;
        this.author = req.body.author;
        this.date = (new Date()).toDateString();
        this.picture = req.file;
        this.prev = null;
        this.next = null;
        this.owner = req.username;
    }
}());

function generateSalt (){
    return crypto.randomBytes(16).toString('base64');
}

function generateHash (password, salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    return hash.digest('base64');
}

var isAuthenticated = function(req, res, next) {
    if (!req.username) return res.status(401).end("access denied");
    next();
};

function getCurrentGallery(){
    images.findOne({"_id": displaying}, function(err, cur_img){
        if (err) console.log(err);
        if (!cur_img) return null;
        else return cur_img.owner;
    });
}

app.use(function(req, res, next){
    req.username = ('username' in req.session)? req.session.username : null;
    next();
});

var displaying = null;

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

            return res.json("user " + username + " signed up");
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
        return res.json("user " + username + " signed in");
    });
});

app.post('/api/images/picture/:username/', isAuthenticated, upload.single('picture'), function (req, res, next) {
    if (req.params.username == req.username){
        var img = new Image(req);
        //set next for img
        images.find({"owner": req.username}).sort({"_id":-1}).limit(1).exec(function(err, first_img){
            if (err) return res.status(500).end(err);
            if (first_img.length != 0) { 
                img.next = first_img[0]._id
                //update prev for next image
                images.update({"_id": first_img[0]._id}, {$set: {"prev": img._id}}, function(err, prev){
                    if (err) return res.status(500).end(err);
                });
            }
        });
        images.insert(img, function(err, image){
            if (err) return res.status(409).end(err);
            return res.json(image);
        });
    }
});

app.post('/api/comments/', isAuthenticated, function (req, res, next) {
    var comment = new Comment(req);
    images.findOne({"_id": displaying}, function(err, cur_img){
        if (err) return res.status(500).end(err);
        if (!cur_img) return res.json(null);
        else comment.imageId = cur_img._id;
        comments.insert(comment, function(err, new_comment){
            if (err) return res.status(500).end(err);
            return res.json(new_comment);
        });
    });
});


app.get('/signout/', function (req, res, next) {
    req.session.destroy();
    res.setHeader('Set-Cookie', cookie.serialize('username', '', {
          path : '/', 
          maxAge: 60 * 60 * 24 * 7 // 1 week in number of seconds
    }));
    return res.json(null);
});

app.get('/api/comments/:id/:page/', isAuthenticated, function (req, res, next) {
    img_id = parseInt(req.params.id);
    page = parseInt(req.params.page);
    comments.find({"imageId": img_id}).sort({_id:-1}).skip(page*10).limit(10).exec(function(err, cmts){
        if (err) return res.status(500).end(err);
        if (cmts.length == 0) return res.json(null);
        return res.json(cmts.reverse());
    });
});

app.get('/api/images/display/:id/', isAuthenticated, function (req, res, next) {
    img_id = parseInt(req.params.id);
    images.findOne({"_id": img_id}, function(err, img){
        if (err) return res.status(500).end(err);
        if(!img) return res.status(404).end("image:" + img_id + " does not exists");
        //send file
        res.setHeader('Content-Type', img.picture.mimetype);
        res.sendFile(__dirname + '/' + img.picture.path);
    });
});

app.get('/api/gallery/:username/', isAuthenticated, function (req, res, next) {
    images.find({"owner":req.params.username}).sort({"_id":-1}).limit(1).exec(function(err, first_img){
        if (err) return res.status(500).end(err);
        if (first_img.length == 0){
            displaying = null;
            return res.json(null);
        } else {
            displaying = first_img[0]._id;
            res.json(first_img[0]);
        }
    });
});

app.get('/api/displaying/', function (req, res, next) {
    images.findOne({"_id": displaying}, function(err, img){
        if (err) return res.status(500).end(err);
        if(!img) return res.json(null);
        else res.json(img);
    });
});


//get image object
app.get('/api/images/:id/', isAuthenticated, function (req, res, next) {
    img_id = parseInt(req.params.id);
    if (img_id == -1){
        images.find({}).sort({"_id":-1}).limit(1).exec(function(err, first_img){
            if (err) return res.status(500).end(err);
            if (first_img.length == 0) return res.json(null);
            else {
                displaying = first_img[0]._id;
                res.json(first_img[0]);
            }
        });
    } else {
        images.findOne({"_id": img_id}, function(err, img){
            if (err) return res.status(500).end(err);
            if(!img) return res.json(null);
            else {
                displaying = img._id;
                res.json(img);
            }
        });
    }
});

app.delete('/api/images/:id/', isAuthenticated, function (req, res, next) {
    img_id = parseInt(req.params.id);
    //update prev and next images
    images.findOne({"_id": img_id}, function(err, cur_img){
        if (err) return res.status(500).end(err);
        if(!cur_img) return res.status(404).end("image:" + img_id + " does not exists");
        if (cur_img.owner == req.username) {
            //remove cur_img from database
            images.remove({"_id": img_id}, function(err, msg){
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
        }
    });
});

app.delete('/api/comments/:id/:gallery/', isAuthenticated, function (req, res, next) {
    comments.findOne({"_id": parseInt(req.params.id)}, function(err, comment){
        if (err) return res.status(500).end(err);
        if (!comment) return res.status(404).end("comment id:" + req.params.id + " does not exists");
        if(comment.author == req.username || req.params.gallery == req.username){
            comments.remove({"_id": parseInt(req.params.id)}, function(err, cmt){
                if (err) return res.status(500).end(err);
                return res.json(comment);
            });
        }
    });
});

app.get('/api/users/', function (req, res, next) {
    users.find({}).exec(function(err, db_users){
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
