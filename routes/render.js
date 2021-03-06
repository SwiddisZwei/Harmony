const config = require("../config.json");
const {User} = require("../conf/mongo_conf");
const userdb = require("../db/userdb");

let allowed;

exports.index = (req, res) => {
    res.render("index", {
        title: "Home",
        config: config,
    });
};

exports.login = (req, res) => {
    let dat = {
        title: "Login",
        config: config,
        invalid: (Object.keys(req.query).length > 0 && req.query.invalid.length >= 0)
    };
    res.render("login", dat);
};

exports.signUp = (req, res) => {
    res.render("create", {
        title: "Sign Up",
        config: config,
    });
};

exports.rooms = (req, res) => {
    if (!req.session.user) {
        res.redirect("/login");
        return;
    }
    User.findOne(
        {
            username: req.session.user.username,
        },
        (err, user) => {
            if (err) {
                res.json(err);
                return;
            }
            if (!user) {
                res.redirect("/login");
                return;
            }
            res.render("room", {
                title: "Room",
                users: user,
                //The user should exist and be passed into the render
                // Since this should be an authenticated end-point, this works.
                // TestUser1's password is testing123
                // Other accounts should be able to be created using the sign up page.
                username: user.username,
                avatar: user.avatar,
                theme: user.theme,
                id: user._id 
            });
        }
    );
};

exports.checkAccess = (req, res) => {
    if (req.body.username == "" || req.body.password == null) {
        res.redirect("/login?invalid");
        return;
    }

    let userName = req.body.username;
    let userPassword = req.body.password;
    console.log("Attempting to authenticate user " + userName);

    userdb.authenticateUser(userName, userPassword, (err, user) => {
        if (err) {
            if (
                err.message == "Invalid credentials" ||
                err.message == "User not found"
            ) {
                res.redirect("/login?invalid");
                return;
            }
        }

        console.log("User authenticated!");
        req.session.user = {
            isAuthenticated: true,
            username: req.body.username,
            theme: req.body.theme
        };
        allowed = userName;
        res.redirect("/app");
    });
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/");
        }
    });
};

exports.delete = function (req, res) {
    userdb.deleteUser(req.params.id, (err, user) => {
        if(err) return console.error(err);
        console.log("Deleted user: " + user.username);
        req.session.destroy();
        res.json({success: true});
    });
};