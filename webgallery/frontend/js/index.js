/*jshint esversion: 6 */ 
(function(){
    "use strict";
    window.addEventListener('load', function(){
	    api.onSignUp(function(usernames){
	    	if (usernames.length !== 0){
				let userList = document.querySelector("#gallery_username");
				userList.innerHTML = "";
	            usernames.forEach(function(username){
					let option = document.createElement('option');
					option.id = username._id;
	                option.value = username._id;
					option.innerHTML= username._id;
					userList.prepend(option);
				});
			}
		});
		
		// reveal and hide html elements when signin/signup
        api.onUserUpdate(function(username) {
            document.querySelector(".login_form").style.visibility = (username)? 'hidden' : 'visible';
            document.querySelector(".welcome_user").style.visibility = (username)? 'visible' : 'hidden';
            if (username){
				let galleryTitle = document.querySelector(".gallery_title");
				galleryTitle.innerHTML=`
				<div>${username}'s gallery</div>
				`;
				galleryTitle.value = username;
				//show all the hidden forms
				document.getElementById(username).setAttribute('selected', true);	
				document.getElementById('img_form').classList.remove('hidden');
	            document.querySelector(".select_gallery").classList.remove('hidden');
	            document.querySelector(".img_gallery").classList.remove('hidden');
	            document.querySelector("#comments").classList.remove('hidden');
	            document.querySelector(".comment_form").classList.remove('hidden');
	            document.querySelector(".gallery_title").classList.remove('hidden');
	    		let elmt = document.getElementById('logged_in');
	    		elmt.value = username;
	    		elmt.innerHTML = '';
	    		elmt.innerHTML=`
		           <div>Welcome ${username}</div>
				`;
				api.selectGallery(username);
            }
		});

        //sign out
        document.querySelector('#sign_out_btn').addEventListener('click', function(e){
			api.signout();
			document.querySelector(".login_form").style.visibility = 'visible';
            document.querySelector(".welcome_user").style.visibility = 'hidden';
           	//hide all the hidden forms
			document.getElementById('img_form').classList.add('hidden');
            document.querySelector(".select_gallery").classList.add('hidden');
            document.querySelector(".img_gallery").classList.add('hidden');
            document.querySelector("#comments").classList.add('hidden');
            document.querySelector(".comment_form").classList.add('hidden');
            document.querySelector(".gallery_title").classList.add('hidden');
		});

    	api.onImageUpdate(function(img){	
			let gallery = document.querySelector(".img_gallery");
    		if (img){
				let elmt = document.createElement('div');
				elmt.className = "img";
				elmt.id = "display_img";
				elmt.value = img._id;
	    		elmt.innerHTML=`
		           <div>${img.title} by ${img.author} (${img.date})</div>
		           <img class="gallery_img" src="/api/images/display/${img._id}" alt="${img.title}">
		           <button class="btn" id="gallery_del_btn"> Delete </button>
				`;

				let prevBtn = document.createElement('button');
				prevBtn.className = "trans_btn";
				if (!img.prev) {
					prevBtn.classList.add('hidden');
				}
				prevBtn.innerHTML = "<";
				let nextBtn = document.createElement('button');
				nextBtn.className = "trans_btn";
				if (!img.next) {
					nextBtn.classList.add('hidden');
				}
				nextBtn.innerHTML = ">";

		        prevBtn.addEventListener('click', function(){
					if(img.prev) {
						api.showNextImg(img.prev);
					}
				});

		        nextBtn.addEventListener('click', function(){
					if(img.next) {
						api.showNextImg(img.next);
					}
				});

		        elmt.querySelector('#gallery_del_btn').addEventListener('click', function(){
					api.deleteImage(img._id);
				});
				
				gallery.innerHTML = '';
				gallery.append(prevBtn);
				gallery.append(elmt);
				gallery.append(nextBtn);

    		} else {
				let elmt = document.createElement('div');
				elmt.className = "img";
				elmt.id = "display_img";
	    		elmt.innerHTML=`
		           <div class="add_img_note">No image to be displayed</div>
				`;
				gallery.innerHTML = '';
				gallery.append(elmt);
    		}
    	});

    	api.onCommentUpdate(function(commentsObj){
			document.getElementById('comments').innerHTML = '';
			if (commentsObj) {
				let displaying = document.getElementById('display_img').value;
				let comments = commentsObj.comments;
				let pg = commentsObj.page;
				// load comments only if there there are comments and the comments belongs to 
				// the current displaying image
				if (comments.length != 0 && comments[0].imageId == displaying) {
					comments.forEach(function(comment){
						let elmt = document.createElement('div');
						elmt.className = "comment";
						elmt.innerHTML=`
							<div class="user">
								<div class="comment_username">${comment.author}</div>
								<div class="comment_date">${comment.date}</div>
							</div>
							<div class="comment_content">${comment.content}</div>
							<div class="delete-icon"></div>
						`;
						elmt.querySelector(".delete-icon").addEventListener('click', function(){
							api.deleteComment(comment, pg);
						});
						document.getElementById("comments").prepend(elmt);
					});

					let pageBtns = document.createElement('div');
					pageBtns.className = "comment_btn";

					let prev = document.createElement('button');
					prev.className = "trans_btn";
					if(pg == 0) {
						prev.classList.add('hidden');
					}
					prev.id = "prev";
					prev.innerHTML= `Back`;
					prev.addEventListener('click', function(){
						api.showNextPg(comments[0].imageId, pg - 1);
					});
					pageBtns.append(prev);

					let next = document.createElement('button');
					next.className = "trans_btn"
					if(!commentsObj.hasNextPage) {
						next.classList.add('hidden');
					}
					next.id = "next";
					next.innerHTML = `Next`;
					next.addEventListener('click', function(){
						api.showNextPg(comments[0].imageId, pg + 1)
					});
					pageBtns.append(next);

					document.getElementById("comments").append(pageBtns);
				}				
			}
		});
		
        function submit(action){
            if (document.getElementsByClassName("sign_form")[0].checkValidity()){
                let username = document.getElementById("user_name").value;
                let password = document.getElementById("password").value;
                api[action](username, password);
            }
            document.getElementsByClassName("sign_form")[0].reset();
        }

        document.querySelector('#sign_in_btn').addEventListener('click', function(e){
            submit("signin");
        });

        document.querySelector('#sign_up_btn').addEventListener('click', function(e){
			submit("signup");
			alert("sign up successful!");
        });

        document.querySelector('.sign_form').addEventListener('submit', function(e){
            e.preventDefault();
        });

		document.querySelector("#gallery_username").addEventListener('change', function(){
			let selected = document.querySelector("#gallery_username").value;
			let galleryTitle = document.querySelector(".gallery_title");
			if(selected != galleryTitle.value) {
				api.selectGallery(selected);
				galleryTitle.innerHTML=`
				<div>${selected}'s gallery</div>
				`;
				galleryTitle.value = selected;
			}
		});
	});

    document.getElementById('img_form').addEventListener('submit', function(e){
    	// prevent from refreshing the page on submit
        e.preventDefault();
        // read form elements
        let title = document.getElementById("img_title").value;
        let author = document.getElementById("img_author_name").value;
        let picture = document.getElementById("img_upload").files[0];
        let username = document.getElementById('logged_in').value;
        // clean form
        document.getElementById("img_form").reset();
        api.addImage(title, author, picture, username);
    });

    document.getElementById('cmt_form').addEventListener('submit', function(e){
    	// prevent from refreshing the page on submit
        e.preventDefault();
        let content = document.getElementById("cform_content").value;
		document.getElementById("cmt_form").reset();
		let displaying = document.getElementById('display_img');
		if(displaying) {
			api.addComment(displaying.value, content);
		}
    });
}());