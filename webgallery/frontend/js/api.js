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

    let img_listeners = [];
    let comment_listeners = [];
    let userListeners = [];
    let signUpListeners = [];
    let pg = 0;

    function notifySignUpListeners(user){
        signUpListeners.forEach(function(listener){
           getUsers(function(err, users){
                if (err) console.log(err);
                listener(users);
                notifyUserListeners(user);
            });
        });
    }

    function notifyCommentListeners(imgId, pg=0){
        comment_listeners.forEach(function(listener){
            getComments(function(err, comments){
                if (err) console.log(err);
                listener(comments);
            }, imgId, pg);
        });
    }

    function notify_img_listeners(imgId){
        img_listeners.forEach(function(listener){
            if (imgId) {
                getImage(function(err, img){
                    if (err) console.log(err);
                    if(img) {
                        listener(img);
                        notifyCommentListeners(imgId);  
                    }
                }, imgId)}
            else {
                listener(imgId);
                notifyCommentListeners(imgId)
            }
        });
    }

    let getComments = function(callback, imageId, page=0){
        send("GET", "/api/comments/" + imageId + "/" + page + "/", null, callback);
    }

    function getImage(callback, id){
        send("GET", "/api/image/" + id + "/", null, callback);
    }

    function notifyUserListeners(username){
        userListeners.forEach(function(listener){
            listener(username);
        });
    };

    let getUsers = function(callback){
        send("GET", "/api/users/", null, callback);
    }

    module.signup = function(username, password){
        send("POST", "/signup/", {username, password}, function(err, res){
             if (err) console.log(err);
             notifySignUpListeners(res);
        });  
    }
    
    module.signin = function(username, password){
        send("POST", "/signin/", {username, password}, function(err, res){
             if (err) console.log(err);
             notifySignUpListeners(res);
        });
    }

    module.signout = function(){
       send("GET", "/signout/", null, function(err, res){
             if (err) console.log(err);
             notifyUserListeners(res);
        });
    }
    
    module.onSignUp = function(listener){
        signUpListeners.push(listener);
    }

    module.onUserUpdate = function(listener){
        userListeners.push(listener);
    }
    
    module.addImage = function(title, author, picture, username){
        sendFiles("POST", "/api/images/picture/" + username + "/", {author: author, title: title, picture: picture}, function(err, res){
            if (err) console.log(err);
            if (res) notify_img_listeners(res._id);
        });
    }
    
    // delete an image from the gallery given its imageId
    module.deleteImage = function(imageId){
        send("DELETE", "/api/images/" + imageId + "/", null, function(err, res){
             if (err) return notifyErrorListeners(err);
             if (!res) notify_img_listeners(res);
             else notify_img_listeners(res._id);
        });
    };
    
    // add a comment to an image
    module.addComment = function(imageId, content){
        send("POST", "/api/comments/" + imageId + "/", {content: content, imageId: imageId}, function(err, res){
             if (err) console.log(err);
             notifyCommentListeners(imageId);
        });  
    };

    module.deleteComment = function(comment, pg){
        send("DELETE", "/api/comments/" + comment._id + "/", null, function(err, res){
             if (err) console.log(err);
             notifyCommentListeners(res.imageId, pg);
        });
    };

    // to be notified when a change in display image occurs
    module.onImageUpdate = function(listener){
        img_listeners.push(listener);
    };

    // register a comment listener
    // to be notified when a comment is added or deleted from an image
    module.onCommentUpdate = function(listener){
        comment_listeners.push(listener);
    };

    module.showNextImg = function(imgId){
        notify_img_listeners(imgId);
    };

    module.showNextPg = function(imgId, pg){
        comment_listeners.forEach(function(listener){
            getComments(function(err, res){
                if (err) console.log(err);
                listener(res);
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
    
    // (function refresh(){
    //     setTimeout(function(e){
    //         module.getDisplayImage(function(err, img){
    //             if (err) console.log(err);
    //             img_listeners.forEach(function(listener){
    //                     listener(img);
    //             });
    //         });
    //         refresh();
    //     }, 2000);
    // }());

    return module;
})();