/*

This is just a basic layout for Mongo that can be included and utilized using code similar to the following.

Everything should be preconfigured to connect to an online Mongo cluster. If you copy the
provided connection URI to MongoDB Compass, you should be able to connect and view documents on the DB.

const {User, Message, Room} = require('../conf/mongo_conf');

new User({
    avatar: '',
    username: 'test',
    password: 'test',
    joined_rooms: []
}).save((err, user) => {
    if(err) {
        console.error(err);
        return;
    }
    console.log("saved new user");
});
 */

const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

mongoose.connect(
    "mongodb+srv://admin:Ydp4ZCmttqp2zPj@harmony-main.784cu.mongodb.net/data?authSource=admin&retryWrites=true&w=majority",
    {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    }
);

let userSchema = mongoose.Schema({
    username: String,
    password: String,
    joined_rooms: [String],
    avatar: String,
    theme: String
});

let roomSchema = mongoose.Schema({
    room_id: String,
    room_title: String,
    password: String,
    nicknames: [
        {
            name: String,
            nick: String,
        },
    ],
    roomAvatar: String,
    members: Array,
    owner: String,
    is_dm: Boolean
});

roomSchema.methods.getNickname = function (username) {
    for (let obj of this.nicknames) {
        if (obj.name == username) {
            return obj.nick;
        }
    }
    return;
};
roomSchema.methods.setNickname = function (username, nickname, callback) {
    if (nickname) {
        let set = false;
        for (let obj of this.nicknames) {
            if (obj.name == username) {
                obj.nick = nickname;
                set = true;
            }
        }
        if (!set) {
            this.nicknames.push({name: username, nick: nickname});
        }
    } else {
        let index = 0;
        for (let i = 0; i < this.nicknames.length; i++) {
            let user = this.nicknames[i];
            if (user.name == username) {
                index = i;
                break;
            }
        }
        this.nicknames.splice(index, 1);
    }
    this.save(callback);
}
/**
 * Attempts to get the messages for the room.
 * @param callback - callback(err, messages)
 */
roomSchema.methods.getMessages = async function (callback) {
    mongoose.model("message")
        .find(
            {room: this.room_id},
            null,
            {sort: {timestamp: -1}},
            (err, messages) => {
                if (err) {
                    console.error("Could not find messages for room '" + room + "'");
                    console.error(err);
                    callback(err);
                    return;
                }
                let tmp = [];
                mongoose.model("users").find({}, (err, users) => {
                    if (err) {
                        console.error("Could not get users from database!");
                        return;
                    }

                    let getUser = (username) => {
                        for (let user of users) {
                            if (user.username == username) return user;
                        }
                        return {};
                    };

                    if (messages) {
                        for (let mess of messages) {
                            let tmpMessage = {
                                room: mess.room,
                                content: mess.content,
                                sender: mess.sender,
                                avatar: getUser(mess.sender).avatar,
                                is_file: mess.is_file,
                                timestamp: mess.timestamp,
                            };
                            let user = mess.sender;
                            let nick = this.getNickname(user);
                            if (nick) {
                                tmpMessage.nickname = nick;
                            }
                            tmp.push(tmpMessage);
                        }
                    }
                    callback(err, tmp);
                });
            }
        );
};

let messageSchema = mongoose.Schema({
    room: String,
    content: String,
    sender: String,
    is_file: Boolean,
    timestamp: Date,
});

exports.User = mongoose.model("users", userSchema);
exports.Room = mongoose.model("rooms", roomSchema);
exports.Message = mongoose.model("message", messageSchema);

let mdb = mongoose.connection;
mdb.on("error", console.error.bind(console, "connection error"));
mdb.once("open", (callback) => {
    console.log("Connected to Mongo!");
});
