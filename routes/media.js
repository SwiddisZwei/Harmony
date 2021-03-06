const path = require("path");
const fs = require("fs");
const db = require("../db/roomdb.js");
const {Message} = require("../conf/mongo_conf");
const image_formats = [".png", ".jpg", ".gif"];
const crypto = require("crypto");

// Based on https://stackoverflow.com/a/15773267
// Expects multi-part post body, with the file
// contained in the "file" field and sender information
// contained in "source"
exports.uploadMedia = (req, res) => {
    const data = {
        sender: req.body.sender,
        room_id: req.body.room_id,
    };

    const temp_path = req.file.path;
    const storage_name = randomFileName(
        path.extname(req.file.originalname).toLowerCase()
    );
    const target_path = path.join(__dirname, "../public/uploads/" + storage_name);

    fs.rename(temp_path, target_path, (err) => {
        if (err) buildResponse(res, err);

        let url = `/media/${storage_name}::${path.basename(req.file.originalname)}`;
        buildResponse(res, undefined, url);
    });
};

exports.getMedia = (req, res) => {
    let file_name = req.params.file_name;
    if (image_formats.includes(path.extname(file_name).toLowerCase())) {
        return res.sendFile(path.resolve("./public/uploads/" + file_name));
    } else {
        getFileName("/media/" + file_name).then((name) => {
            return res.download(path.resolve("./public/uploads/" + file_name), name);
        });
    }
};

const getFileName = async (url) => {
    let name = undefined;
    await Message.findOne(
        {
            is_file: true,
            content: {
                $regex: `^${url}`,
            },
        },
        (err, message) => {
            if (err) {
                console.error(err);
                return;
            }
            if (message) {
                name = message.content.split("::")[1];
            }
        }
    );

    return name;
};

const buildResponse = (res, err, fname) => {
    let response;
    if (err) {
        response = {
            timestamp: new Date().toISOString(),
            status: 500,
            path: "/media",
            error: err.message,
        };
    } else {
        response = {
            timestamp: new Date().toISOString(),
            status: 200,
            path: fname,
        };
    }
    res.json(response);
};

const fid_magnitude = 10;
const randomFileName = (ext) => {
    let fname;
    do {
        let id = crypto.randomBytes(10).toString("hex");
        fname =
            ('0'.repeat(fid_magnitude) + id).substr(-fid_magnitude) + fid_magnitude;
    } while (fs.existsSync('/public/uploads/' + fname));
    return fname + ext;
}