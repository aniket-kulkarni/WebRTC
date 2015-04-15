define(["jquery","foundation"],function($) {

	var socket;

	var myInfo = {};

	var keys = {};	
	var session,publisher;

	function init() {

		window.customeKeys = keys;

		$(document).foundation();
		socket = io();
		_bindEvents();
	}

	function _bindEvents() {

		$("#enter-room").on("click",enterRoom);
		$(document).on("click",".make-video-call",openConnectingToVideoCall);
		$(document).on("click",".make-audio-call",openConnectingToAudioCall);
		$(document).on("click","#reject-call",rejectCall);
		$(document).on("click","#accept-call",acceptCall);
		$(document).on("click","#end-call",endCall);
		$(document).on("click","#start-recording",startRecording);
		$(document).on("click","#stop-recording",stopRecording);
		$(document).on("click","#play-video",playRecording);
		$(document).on("click","#return-menu",returnToMainMenu);
		$(document).on("click",".make-text-chat",sendInvitationForTextChat);
		$(document).on("keypress","#post-chat",handlePostChatKeypress);


		socket.on("first-member",displayNoOtherMemebersToChat);
		socket.on("new-member",displayNewMember);
		socket.on("member-disconnected",handleDisconnect);
		socket.on("keys-generated",storeKeys);
		socket.on("receive-video-call",confirmVideoCall);
		socket.on("receive-audio-call",confirmAudioCall);
		socket.on("receive-text-chat",openTextChatDialog);
		socket.on("call-rejected",showCallRejection);
		socket.on("video-call-accepted",showVideoCallOnAccept);
		socket.on("audio-call-accepted",showAudioCallOnAccept);
	}

	function handlePostChatKeypress(e) {

		var keyCode = e.keyCode || e.which;

		if(keyCode === 13) {
			var val = $("#post-chat").val();
			$("#post-chat").val("");
			postChat(val);
		}
	}

	function postChat(text) {
		var str = '<p> <b>' + myInfo.nickName +'</b>: '+ text+'</p>';
		$("#chat1").find(".chats").append(str);

		var jsonstr = JSON.stringify({ data:text, nickName : myInfo.nickName });
		session.signal({data:jsonstr}, handlePostTextChatError);
	}

	function receiveChat(event) {

		if(event.from.connectionId != session.connection.connectionId) {
			var dataObj = JSON.parse(event.data);
			var str = '<p> <b>' + dataObj.nickName +'</b>: '+ dataObj.data+'</p>';
			$("#chat1").find(".chats").append(str);
		}
		
	}

	function handlePostTextChatError(error) {
        if (error) {
          alert("Error posting message\n"+error.message);
        } else {
          console.log("signal sent.");
        }
    }

	function sendInvitationForTextChat(e) {

		var caller = myInfo.nickName,
			callee = $(e.target).closest(".member").attr("data-name"),
			roomName = myInfo.roomName;


		session.connect(keys["token"]);	
		openTextChatDialog();
		socket.emit("make-text-chat",{roomName : roomName,caller :caller,callee :callee});
	}

	function openTextChatDialog() {
		session.connect(keys["token"]);	
		$("#text-wrap").removeClass("hide");
	}

	function returnToMainMenu() {
		$("#media").addClass("hide");
		$("#members-wrap").removeClass("hide");
	}

	function startRecording() {

		$("#stop-recording").removeClass("hide");
		$("#start-recording").addClass("hide");
		socket.emit("start-recording");
	}

	function stopRecording() {

		$("#stop-recording").addClass("hide");
		$("#start-recording").addClass("hide");
		socket.emit("stop-recording");
	}

	function playRecording() {
		$("#video-history")[0].play();
	}

	function endCall() {
		session.disconnect();
		socket.emit("call-ended",handleCallEnd);
	}

	function handleCallEnd(isRecorded,url) {

		$("#video-call").addClass("hide");
		$("#video-history-wrap").removeClass("hide")

		if(!isRecorded) {
			$("#play-video").addClass("hide")
			$("#video-history").addClass("hide")
		}
		else {
			$("#video-history").attr("src",url);
		}
	}

	function acceptCall() {

		var isVideo = $("#media-modal").data("isVideo");

		$("#media-modal").foundation('reveal', 'close');
		$("#members-wrap").addClass("hide");
		$("#media").removeClass("hide");
		
		var accepter = myInfo.nickName,
			accepted = $("#media-modal").data("caller"),
			roomName = myInfo.roomName,
			replacementElementId,options = {};

		if(isVideo) {
			$("#video-wrap").removeClass("hide");
			replacementElementId = "my-video";
			options = {publishAudio:true, publishVideo:true}	
			socket.emit("video-call-accepted",{accepter : accepter,accepted :accepted,roomName : roomName});
		} else {
			$("#audio-wrap").removeClass("hide");	
			replacementElementId = "my-audio";	
			options = {videoSource: null};	
			socket.emit("audio-call-accepted",{accepter : accepter,accepted :accepted,roomName : roomName});
		}

		session.connect(keys["token"], function(error) {
		   publisher = OT.initPublisher(replacementElementId,options);
		   session.publish(publisher);
		});
	}

	function showVideoCallOnAccept() {

		$("#media-modal").foundation('reveal', 'close');
		$("#members-wrap").addClass("hide");
		$("#media").removeClass("hide");
		$("#video-wrap").removeClass("hide");

		session.connect(keys["token"], function(error) {
		   publisher = OT.initPublisher('my-video');
		   session.publish(publisher);
		});

	}

	function showAudioCallOnAccept() {

		$("#media-modal").foundation('reveal', 'close');
		$("#members-wrap").addClass("hide");
		$("#media").removeClass("hide");
		$("#audio-wrap").removeClass("hide");

		session.connect(keys["token"], function(error) {
		   publisher = OT.initPublisher('my-audio',{videoSource: null});
		   session.publish(publisher);
		});

	}

	function showCallRejection(rejecter) {
		$("#media-modal").foundation('reveal', 'close');
		$("#media-modal").html('<p>' + rejecter + ' has rejected your call </p>');

		$(document).on('closed.fndtn.reveal', '[data-reveal]', function () {
			$(document).off('closed.fndtn.reveal');
		  	$("#media-modal").foundation('reveal', 'open');
		});
	}

	function confirmVideoCall(caller) {
		$("#media-modal").data("isVideo",true);
		confirmCall(caller,"video");
	}

	function confirmAudioCall(caller) {
		$("#media-modal").data("isVideo",false);
		confirmCall(caller,"audio");	
	}

	function confirmCall(caller,str) {

		$("#media-modal").data("caller",caller);
		var str = '<p>'+ caller +' is inviting you for a '+ str +' call </p><br>';
		str += '<a href="#" id="accept-call" class="button tiny"> Accept </a>';
		str += '<a href="#" id="reject-call" class="button tiny"> Reject </a>';
	
		$("#media-modal").html(str);
		$("#media-modal").foundation('reveal', 'open');
	}

	function rejectCall() {

		var isVideo = $("#media-modal").data("isVideo");

		var rejecter = myInfo.nickName,
			rejected = $("#media-modal").data("caller"),
			roomName = myInfo.roomName;

		$("#media-modal").foundation('reveal', 'close');

		socket.emit("call-rejected",{rejecter : rejecter,rejected :rejected,roomName : roomName});	
	}

	function storeKeys(data) {
		keys["sessionId"] = data.sessionId;
		keys["token"] = data.token;
		keys["apiKey"] = data.apiKey;
		session = OT.initSession(data.apiKey,data.sessionId);

		_bindSessionEvents();

		
	}

	function _bindSessionEvents() {

		session.on('streamCreated', function(event) {
		  session.subscribe(event.stream,"their-video",{height : 400,width : 600});
		});

		session.on('connectionDestroyed', function(event) {
		      session.disconnect();
		      socket.emit("call-ended",handleCallEnd);
		});

		session.on("signal",receiveChat);

	}

	function handleDisconnect(nickName) {
		$("[data-name='"+nickName+"']").remove();
	}

	function displayNameAlreadyTaken(nickName) {
		$("#index").removeClass("hide");
		$("#members-wrap").addClass("hide");
	}	

	function displayNoOtherMemebersToChat() {
		$("#index").addClass("hide");
		$("#members-wrap").removeClass("hide");
	}

	function displayNewMember(nickName) {
		$("#index").addClass("hide");
		$("#members-wrap").removeClass("hide");
		$("#no-members").addClass("hide");

		var str = "<li class='member' data-name="+ nickName +"><span class='nick-name'>"+ nickName +"</span>";
		str += '<span class="call-type make-video-call">video call</span> |' + '<span class="call-type make-audio-call">audio call</span>';
		str += ' | <span class="call-type make-text-chat">text chat</span></li>';
		$("#member-list").append(str)
	}

	function openConnectingToVideoCall(e) {
		openConnectingToCall(e,true);
	}

	function openConnectingToAudioCall(e) {
		openConnectingToCall(e,false);
	}

	function openConnectingToCall(e,isVideoCall) {

		$("#media-modal").html("<p> Connecting your call. Please Wait..</p>")
		$("#media-modal").foundation('reveal', 'open');

		var caller = myInfo.nickName,
			callee = $(e.target).closest(".member").attr("data-name"),
			roomName = myInfo.roomName;

		if(isVideoCall) {
			socket.emit("make-video-call",{roomName : roomName,caller :caller,callee :callee});
		}	
		else {
			socket.emit("make-audio-call",{roomName : roomName,caller :caller,callee :callee});
		}
	}

	function enterRoom() {

		var roomName = $("#room-name").val(),
			nickName = $("#nick-name").val();

		if(roomName.trim().length === 3) {
			$("#index").find(".error-text").html("Room Name should be atleast three letters");
		}
		else if(nickName.trim().length === 3) {
			$("#index").find(".error-text").html("Nick Name should be atleast three letters");
		}
		else {
			myInfo.roomName = roomName;
			myInfo.nickName = nickName;

			$("#my-nick-name").html(nickName);
			$("#index").find(".error-text").html("");	
			socket.emit("enter-room",{roomName : roomName,nickName : nickName},function(err) {
				$("#index").removeClass("hide");
				$("#members-wrap").addClass("hide");
				$("#index").find(".error-text").html(err);	
			});
		}

	}

	return {
		init : init
	}

});