let api = (function(){
    "use strict";
    let module = {};

    function sendFiles(method, url, data, callback){
        let formdata = new FormData();
        Object.keys(data).forEach(function(key){
            let value = data[key];
            formdata.append(key, value);
        });
        let xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        xhr.send(formdata);
    }

    function send(method, url, data, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) callback("[" + xhr.status + "]" + xhr.responseText, null);
            else callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.send(JSON.stringify(data));
        }
    }

    let img_listeners = [];
    let comment_listeners = [];
    let userListeners = [];
    let signUpListeners = [];
    let pg = 0;
    
    /*  ******* Data types *******
        image objects must have at least the following attributes:
            - (String) _id 
            - (String) title
            - (String) author
            - (Date) date
    
        comment objects must have the following attributes
            - (String) _id
            - (String) imageId
            - (String) author
            - (String) content
            - (Date) date
    
    ****************************** */ 

    module.signup = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
             if (err) console.log(err);
             notifyUserListeners(getUsername());
             notifySignUpListeners();
        });  
    }
    
    module.signin = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
             if (err) console.log(err);
             notifyUserListeners(getUsername());
        });
    }

    module.signout = function(){
       send("GET", "/signout/", null, function(err, res){
             if (err) console.log(err);
             notifyUserListeners(res);
        });
    }

    function notifySignUpListeners(){
        signUpListeners.forEach(function(listener){
           getUsers(function(err, users){
                if (err) console.log(err);
                listener(users);
            });
        });
    }
    
    module.onSignUp = function(listener){
        signUpListeners.push(listener);
        getUsers(function(err, users){
            if (err) console.log(err);
            listener(users);
        });
    }

    let getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    }

    let getUsers = function(callback){
        send("GET", "/api/users/", null, callback);
    }

    module.onUserUpdate = function(listener){
        userListeners.push(listener);
        listener(getUsername());
    }

    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    };
    
    module.addImage = function(title, author, picture, username){
        sendFiles("POST", "/api/images/picture/" + username + "/", {author: author, title: title, picture: picture}, function(err, res){
            if (err) console.log(err);
            if (res) notify_img_listeners(res._id);
        });
    }

    let getImage = function(callback, id=-1){
        send("GET", "/api/images/" + id + "/", null, callback);
    }

    module.getDisplayImage = function(callback){
        send("GET", "/api/displaying/", null, callback);
    };
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        send("DELETE", "/api/images/" + imageId + "/", null, function(err, res){
             if (err) return notifyErrorListeners(err);
             if (!res) notify_img_listeners(-1);
             else notify_img_listeners(res._id);
        });
    };
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        send("POST", "/api/comments/", {content: content, imageId: imageId}, function(err, res){
             if (err) console.log(err);
             notifyCommentListeners(imageId);
        });  
    };

    let getComments = function(callback, imageId, page=0){
        send("GET", "/api/comments/" + imageId + "/" + page + "/", null, callback);
    }
    
    // delete a comment to an image
    module.deleteComment = function(commentId, gallery){
        send("DELETE", "/api/comments/" + commentId + "/" + gallery + "/", null, function(err, res){
             if (err) console.log(err);
             console.log(res);
             notifyCommentListeners(res.imageId);
        });
    };
    
    // register an image listener
    // to be notified when an image is added or deleted from the gallery
    module.onImageUpdate = function(listener){
        img_listeners.push(listener);
        getImage(function(err, img){
            if (err) console.log(err);
            listener(img);
            if (img !== null) notifyCommentListeners(img._id);
        });
    };

    function notify_img_listeners(imgId){
        img_listeners.forEach(function(listener){
            if (!imgId) listener(imgId);
            getImage(function(err, img){
                if (err) console.log(err);
                listener(img);  
            }, imgId);
        });
        notifyCommentListeners(imgId);
    }

    // register an comment listener
    // to be notified when a comment is added or deleted to an image
    module.onCommentUpdate = function(listener){
        comment_listeners.push(listener);
    };

    function notifyCommentListeners(imgId){
        comment_listeners.forEach(function(listener){
            getComments(function(err, cmts){
                if (err) console.log(err);
                listener(cmts);
            }, imgId, pg);
        });
    }

    module.showNextImg = function(imgId){
        pg = 0;
        notify_img_listeners(imgId);
    };

    module.showNextPg = function(imgId, action){
        if (action === "next") pg += 1;
        else pg -= 1;
        comment_listeners.forEach(function(listener){
            getComments(function(err, cmts){
                if (err) console.log(err);
                if (cmts !== null) listener(cmts);
            }, imgId, pg);
        });
    };

    module.selectGallery = function(username){
        send("GET", "/api/gallery/" + username + "/", null, function(err, res){
             if (err) console.log(err);
             if (res) notify_img_listeners(res._id);
             else notify_img_listeners(null);
        });  
    };
    
    (function refresh(){
        setTimeout(function(e){
            module.getDisplayImage(function(err, img){
                if (err) console.log(err);
                img_listeners.forEach(function(listener){
                        listener(img);
                });
            });
            refresh();
        }, 2000);
    }());

    return module;
})();