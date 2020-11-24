/*
    SOCKET AND SERVER COMMUNICATION SCRIPT
*/
const rooms_container = document.getElementById("rooms_container");
const messages_container = document.getElementById("display_messages_container");
const message_box = document.getElementById("my_message");
const modal = document.getElementById("room_modal");
const create_modal = document.getElementById("create_room_modal");
const join_modal = document.getElementById("join_room_modal");

let username = document.getElementById("username_label").innerText;
let currentRoomId; //Is assigned whenever in renderRoomContent() is called (meaning onLoad or when clicking on bubble) 

async function fetchUser(username){
    let response = await fetch(`/user/${username}`);
    let data = await response.text();
    return JSON.parse(data).data;
};

//Does not include messages
async function fetchRoomData(roomid){
    let response = await fetch(`/room/${roomid}`);
    let data = await response.text();
    console.log(JSON.parse(data));
};

async function fetchRoomMessages(roomid){
    let response = await fetch(`/messages/${roomid}`);
    let data = await response.text();
    return JSON.parse(data).data;
};

window.onload = function(){
    fetchUser(username).then(function(user){
        console.log(user);
        if(user.joined_rooms.length > 0){
            renderRoomList();
            //Currently when first loading in, will just load the first room in the list
            renderRoomContent(user.joined_rooms[0]);
        }
    });
};

const socket = io.connect(document.location.host, {query: `username=${username}`});

//Standard Communication Functions
const sendMessage = () => {
    if(message_box.value.length > 2000){
        //TODO: Display to user message is to long! 
        console.log("Message To Long!");
        return;
    }
    console.log("Sending message: " + message_box.value);
    socket.emit('message', {username: username, message: message_box.value, room_id: currentRoomId});
    message_box.value = "";
    return false;
};

socket.on('message', msg => {
    console.log(msg);
    //for now if msg recieved is from currentroomid display
    if(msg.room_id == currentRoomId){
        messages_container.innerHTML += "<span class='message_box'>" + 
                                        "<span class='avatar'></span>" +
                                        "<span class='name'>" + msg.username +  "</span>" + 
                                        "<span class='message'>" + msg.message + "</span>" + 
                                     "</span>";
        //TODO make scroll to bottom every message only when already scrolled down 
    messages_container.scrollTop = messages_container.scrollHeight;
    }
});

const createRoom = () => {
    const room_id = document.getElementById("create_id").value;
    const room_title = document.getElementById("create_title").value;
    const password = document.getElementById("create_password").value;
    const nickname = document.getElementById("create_nicknames").value;

    const room = {
        room_id: room_id,
        room_title: room_title,
        password: password,
        nicknames: [{name: username, nick: nickname}]
    };

    fetch('/room', {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify(room)
    })
    .then(response => {
        console.log(response.status);
        if(response.status === 204){
            console.log("CREATED ROOM SUCCESSFULLy!");
            //TODO Quick Fix so you don't have to manually join the room after making it
            document.getElementById("join_id").value = room_id;
            document.getElementById("join_password").value = password;
            joinRoom();
            closeModals();
        }
    });
};

const joinRoom = () => {
    const room_id = document.getElementById("join_id").value;
    const password = document.getElementById("join_password").value;

    fetch(`/room/authorize/${room_id}`, {
        headers: new Headers({
            "Authorization": "Basic " + btoa(username + ":" + password)
        }),
    })
    .then(response => {
        if(response.status === 200){
            console.log("JOINED ROOM: " + room_id);
            renderRoomList();
            renderRoomContent(room_id);
            closeModals();
        }

    });
};

//Render Functions
const renderRoomContent = (roomid) => {
    if(currentRoomId === roomid){
        return;
    }
    console.log("RENDERING ROOM: " + roomid);
    messages_container.innerHTML = "";
    fetchRoomMessages(roomid).then(function(messages){
        currentRoomId = roomid;
        document.getElementById("room_id").value = currentRoomId;
        //Currently the messages array is backwards so will do it this way
        for(let i = messages.length - 1; i >= 0; i--){
            messages_container.innerHTML += "<span class='message_box'>" + 
                                                "<span class='avatar'></span>" +
                                                "<span class='name'>" + messages[i].sender +  "</span>" + 
                                                "<span class='message'>" + messages[i].content + "</span>" + 
                                            "</span>";
        }
    });
};

const renderRoomList = () => {
    rooms_container.innerHTML = "";

    fetchUser(username).then(function(user){
        console.log(user);
        for(let i = 0; i < user.joined_rooms.length; i++){
            rooms_container.innerHTML += `<span class='room' id='${user.joined_rooms[i]}' style='text-align:center' onclick='renderRoomContent("${user.joined_rooms[i]}");'>${user.joined_rooms[i]}</span>`;
        }
    });
};
const makeRoomClickable = (roomElementId) => {
    document.getElementById(roomElementId).addEventListener("click", console.log(roomElementId));
};



//Assign Buttons Functions
document.getElementById("send_message_button").addEventListener("click", sendMessage);
document.getElementById("create_room_button").addEventListener("click", createRoom);
document.getElementById("join_room_button").addEventListener("click", joinRoom);