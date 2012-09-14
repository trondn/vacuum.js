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
var fs = require('fs')
var cfgfile = './config.json';
if (!fs.existsSync(cfgfile)) {
    console.log('You need to create a config.json file');
    process.exit(64);
}
var config = JSON.parse(fs.readFileSync(cfgfile, 'utf-8'));

if (config.spool == undefined) {
    config.spool = '/tmp/spool';
}

if (config.sleeptime == undefined) {
    config.sleeptime = 1000;
}

if (!fs.existsSync(config.spool)) {
    console.log("Spool directory doesn't exist: %s", config.spool);
    process.exit(64);
}

// Create our connection to Couchbase!
var couchnode = require('couchbase');
var cb = new couchnode.Couchbase(config.hostname,
    config.username,
    config.password,
    config.bucket);

function set_handler(data, error, key, cas) {
    if (error) {
        console.log('Failed to store object: %s', key);
    } else {
        fs.unlink(data);
        process_next();
    }
}

function illegalfile(type, name) {
    console.log('%s JSON file: %s', type, name)
    newname = config.spool + '/.' + name + '.' + type;
    fs.renameSync(config.spool + '/' + name, newname);
    process_next();
}

function process_file(name) {
    console.log('Process file %s', name);
    fs.readFile(config.spool + '/' + name, function (err, data) {
        fullname = config.spool + '/' + name;
        if (err) {
            throw err;
        }

        // try to convert it to JSON
        obj = undefined;
        try {
            obj = JSON.parse(data, 'utf-8');
        } catch (err) {
        }

        if (obj == undefined) {
            illegalfile('illegal', name);
        } else if (obj._id == undefined) {
            illegalfile('unknown', name);
        } else {
            cb.set(obj._id, String(data), 0, undefined, set_handler, fullname);
        }
    });
}

function process_next() {
    fs.readdir(config.spool, function (error, files) {
        if (error) {
            console.log('Failed to read spool directory.. terminate');
            process.exit(1);
        }

        if (files.length > 0) {
            // I should try to figure out how to iterate over the files..
            for (var i = 0; i < files.length; ++i) {
                if (files[i][0] == '.') {
                    if (files[i] == '.dump_stats') {
                        console.log('Dump statistics not supported yet');
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

process_next();
