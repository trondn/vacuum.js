# vacuum.js

This is a small example program that demonstrates how you may access a
Couchbase cluster from a node.js application. Please note that the
idea with the example is to show you how to utilize a Couchbase
cluster from your node app, and not to try to create an application
you may find useful. You should also keep in mind that I'm not a
JavaScript programmer (nor do I normally use node.js), so whenever you
find yourself asking the question: "Why doesn't he just ...." you
should remind yourself that I wasn't aware of that way of doing
stuff ;-)

So what is this? It is a small "daemon" that is "monitoring" a
directory and "moves" all files you put in the directory into a
Couchbase cluster. So why do I say "monitor" with quotes? Well, it's
because the watch API in the 'fs' module is marked as unstable and
non-portable ;) To work around that we're just scanning the directory
and upload files as long as there is any. When the scan reports no
files in the directory we sleep for a specified number of milliseconds
before doing another scan.

Given that you'll move files into the spool directory with one
program, and it's read by another program there is a possibility for a
race condition. To work around that the vacuumer will ignore all files
starting with a dot. To safely instert a file into the cluster you
should:

    $ cp myfile /tmp/vacuum/.myfile
    $ mv /tmp/vacuum/.myfile /tmp/vacuum/myfile

But wait, how do I specify a key for my data? well, the vacuumer will
only accept "special" files... It has to be a JSON file, and it has to
contain a special attribute: "_id" which will be the key its stored
under.

So what happens if you try to store a file that isn't JSON? It'll be
renamed to .filename.illegal ex:

    $ cp /etc/passwd /tmp/vacuum/.passwd
    $ mv /tmp/vacuum/.passwd /tmp/vacuum/passwd
    $ ls -a /tmp/vacuum
    .		..		.passwd.illegal

And if its JSON, but without a "_id" key? It will be renamed to
.filename.unknown ex:

    $ echo '{ "foo" : "bar" }' > /tmp/vacuum/.mykey
    $ mv /tmp/vacuum/.mykey /tmp/vacuum/mykey
    $ ls -a /tmp/vacuum
    .		..		.mykey.unknown

## Requirements

In order to run the example you'll need:

* [a Couchbase cluster](http://www.couchbase.com/download)
* [node v.0.8.8 or higher](http://nodejs.org/download)
* [libcouchbase 2.0.0 beta or newer](http://packages.couchbase.com/clients/c/libcouchbase-2.0.0beta.tar.gz)

## Setup

Clone the repository:

    $ git clone git://github.com/trondn/vacuum.js.git
    $ cd vacuum.js

Install the Couchbase driver from npm:

    $ npm install couchbase

## Usage

Create a configuration file named config.json with the following content:

    {
        "hostname" : "mycluster:8091",
        "username" : "vacuum",
        "password" : "secret",
        "bucket" : "vacuum",
        "spool" : "/tmp/vacuum",
        "sleeptime" : 2000
    }

With the configuration in place you can start the vacuum program as:

    $ node vacuum.js

With the "server" running, you can start dumping files into the spool
directory, and see them appear in your Couchbase cluster :)
