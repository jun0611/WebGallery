/*jshint esversion: 6 */ 
(function(){
    "use strict";
    window.addEventListener('load', function(){
    	//toggle hide and show on add image form
    	//https://www.w3schools.com/howto/tryit.asp?filename=tryhow_js_toggle_hide_show
    	let toggle_btn = document.getElementById('add_img_btn');
    	function toggle(){
    		let add_img_form = document.getElementById('img_form');
			if (add_img_form.style.display === "none") {
				add_img_form.style.display = "block";
			} else {
				add_img_form.style.display = "none";
			}
    	}
    	toggle_btn.onclick = toggle;

	    api.onSignUp(function(usernames){
	    	if (usernames.length !== 0){
	    		document.querySelector("#gallery_username").innerHTML = "";
	            usernames.forEach(function(username){
	                let elmt = document.createElement('option');
	                elmt.value = username._id;
	                elmt.innerHTML= username._id;
	                document.querySelector("#gallery_username").prepend(elmt);
	            });
        	}
	    });

    	//sign in
        api.onUserUpdate(function(username){
            document.querySelector(".login_form").style.visibility = (username)? 'hidden' : 'visible';
            document.querySelector(".welcome_user").style.visibility = (username)? 'visible' : 'hidden';
            if (username){
	           	//show all the hidden forms
	            document.querySelector("#add_img_btn").classList.remove('hidden');
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
            }
        });

        function submit(){
            console.log(document.getElementsByClassName("sign_form")[0].checkValidity());
            if (document.getElementsByClassName("sign_form")[0].checkValidity()){
                let username = document.getElementById("user_name").value;
                let password =document.getElementById("password").value;
                let action =document.querySelector("form [name=action]").value;
                api[action](username, password);
            }
            document.getElementsByClassName("sign_form")[0].reset();
        }

        document.querySelector('#sign_in_btn').addEventListener('click', function(e){
            document.querySelector("form [name=action]").value = 'signin';
            submit();
        });

        document.querySelector('#sign_up_btn').addEventListener('click', function(e){
            document.querySelector("form [name=action]").value = 'signup';
            submit();
        });

        document.querySelector('.sign_form').addEventListener('submit', function(e){
            e.preventDefault();
        });

        //sign out
        document.querySelector('#sign_out_btn').addEventListener('click', function(e){
            api.signout();
           	//hide all the hidden forms
            document.querySelector("#add_img_btn").classList.add('hidden');
            document.querySelector(".select_gallery").classList.add('hidden');
            document.querySelector(".img_gallery").classList.add('hidden');
            document.querySelector("#comments").classList.add('hidden');
            document.querySelector(".comment_form").classList.add('hidden');
            document.querySelector(".gallery_title").classList.add('hidden');
            document.getElementById('img_form').style.display = "none";
        });

    	api.onImageUpdate(function(img){
    		if (img){
    			document.querySelector(".gallery_title").innerHTML=`
		           <div>${img.owner}'s gallery</div>
	    		`;
	    		let elmt = document.getElementById('display_img');
	    		elmt.innerHTML = '';
	    		elmt.innerHTML=`
		           <div>${img.title} by ${img.author} (${img.date})</div>
		           <img class="gallery_img" src="/api/images/display/${img._id}" alt="${img.title}">
		           <button class="btn" id="gallery_del_btn"> Delete </button>
	    		`;
	    		//next img button
		        let next_img_btn = document.getElementById('next_img');
		        function next_img(){
		        	if(img !== null && img.next !== null){
		        		api.lock = 0;
		        		api.showNextImg(img.next);
		        	}
		        }
		        next_img_btn.onclick = next_img;
		        //prev img button
		        let prev_img_btn = document.getElementById('prev_img');
		        function prev_img(){
		        	if(img !== null && img.prev !== null){
		        		api.lock = 0;
		        		api.showNextImg(img.prev);
		        	}
		        }
		        prev_img_btn.onclick = prev_img;
		        //delete button function
		        let del_btn = document.getElementById('gallery_del_btn');
		        function del(){
		        	if(img !== null){
		        		api.lock = 0;
		        		api.deleteImage(img._id);
		        	}
		        }
		        del_btn.onclick = del;
    		} else {
    			let elmt = document.getElementById('display_img');
	    		elmt.innerHTML = '';
	    		elmt.innerHTML=`
		           <div class="add_img_note">Add an image!</div>
	    		`;
    		}
    		api.lock = 1;
    	});

    	api.onCommentUpdate(function(cmts){
    		document.getElementById('comments').innerHTML = '';
    		if (cmts !== null && cmts.length != 0) {
				cmts.forEach(function(cmt){
				    let elmt = document.createElement('div');
				    elmt.className = "comment";
				    elmt.innerHTML=`
				        <div class="user">
				            <div class="comment_username">${cmt.author}</div>
				            <div class="comment_date">${cmt.date}</div>
				        </div>
				        <div class="comment_content">${cmt.content}</div>
				        <div class="delete-icon"></div>
				    `;
				    let del_cmt_btn = elmt.getElementsByClassName("delete-icon")[0];
	                function del_cmt(){
	                	api.getDisplayImage(function(err, cur_img){
				            if (err) console.log(err);
				            if (cur_img !== null) {
				            	api.deleteComment(cmt._id, cur_img.owner);
				            }
				        }); 
	                }
	                del_cmt_btn.onclick = del_cmt;
				    document.getElementById("comments").prepend(elmt);
	    		});
	    		let btns = document.createElement('div');
	    		btns.className = "comment_btn";
	    		btns.innerHTML=`
		    		<button class="trans_btn" id="prev"> Prev </button>
		            <button class="trans_btn" id="next"> Next </button>
		        `;
		        document.getElementById("comments").append(btns);
		        //add function to btns
		   		let next_cmt_btn = document.getElementById('next');
		        function next(){
		        	if(cmts.length !== 0){
		        		api.showNextPg(cmts[0].imageId, "next");
		        	}
		        }
		        next_cmt_btn.onclick = next;
		        let prev_cmt_btn = document.getElementById('prev');
		        function prev(){
		        	if(cmts.length !== 0){
		        		api.showNextPg(cmts[0].imageId, "prev");
		        	}
		        }
		        prev_cmt_btn.onclick = prev;
			}
		});
    });

    //choose gallery
    document.querySelector('#select_gallery_btn').addEventListener('click', function(e){
    	api.selectGallery(document.getElementById("gallery_username").value);
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
        // read form elements
        let content = document.getElementById("cform_content").value;
        // clean form
        document.getElementById("cmt_form").reset();
		api.getDisplayImage(function(err, cur_img){
            if (err) console.log(err);
            if (cur_img !== null) api.addComment(cur_img._id, content);
        });
    });
}());