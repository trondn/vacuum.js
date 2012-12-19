/*
 *     Copyright 2012 Couchbase, Inc.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */
var fs = require("fs")
var cfgfile = "./config.json";
var config = undefined;

if (fs.existsSync(cfgfile)) {
    config = JSON.parse(fs.readFileSync(cfgfile, "utf-8"));
} else {
    config = {};
}

if (config.spool == undefined) {
    config.spool = "/tmp/spool";
}

if (config.sleeptime == undefined) {
    config.sleeptime = 1000;
}

if (!fs.existsSync(config.spool)) {
    console.log("Spool directory doesn't exist: %s", config.spool);
    process.exit(64);
}

// Create our connection to Couchbase!
var couchnode = require("couchbase");

var bucket = {};

// @todo fix the config
couchnode.connect(config, function(err, cb) {
    if (err) {
        console.log("ERROR - Failed to connect to server");
        process.exit(1);
    }

    bucket = cb;
    cb.on("error", function (message) {
        console.log("ERROR: [" + message + "]");
        process.exit(1);
    });

    process_next();
});

function illegalfile(type, name) {
    console.log("%s JSON file: %s", type, name)
    var newname = config.spool + '/.' + name + '.' + type;
    fs.renameSync(config.spool + '/' + name, newname);
    process_next();
}

function process_file(name) {
    console.log("Process file %s", name);
    fs.readFile(config.spool + '/' + name, function (err, data) {
        var fullname = config.spool + '/' + name;
        if (err) {
            throw err;
        }

        // try to convert it to JSON
        var obj = undefined;
        try {
            obj = JSON.parse(data, "utf-8");
        } catch (err) {
        }

        if (obj == undefined) {
            illegalfile("illegal", name);
        } else {
            if (obj._id == undefined) {
                obj._id = name;
            }
            bucket.set(obj._id, String(data), {}, function (error, meta) {
		if (error) {
		    console.log("Failed to store object: %s", key);
		} else {
		    fs.unlink(fullname);
		    process_next();
		}
	    });
        }
    });
}

function process_next() {
    fs.readdir(config.spool, function (error, files) {
        if (error) {
            console.log("Failed to read spool directory.. terminate");
            process.exit(1);
        }

        if (files.length > 0) {
            // I should try to figure out how to iterate over the files..
            for (var i = 0; i < files.length; ++i) {
                if (files[i][0] == '.') {
                    if (files[i] == ".dump_stats") {
                        console.log("Dump statistics not supported yet");
                    }
                } else {
                    process_file(files[i]);
                    return ;
                }
            }
        }
        // We did not process any files, reschedule a timer
        setTimeout(process_next, config.sleeptime);
    });
}
