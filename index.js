let app = require('express')();
let http = require('http').createServer(app);
let io = require('socket.io')(http);
let usernameMap = new Map();
let onlineUserList = [];
let chatLog = [];

// Sends the HTML file from the server
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {

    // Generates random username
    while(true) {
        let randomUser = 'User' + Math.round(Math.random() * 100).toString();
        if (onlineUserList.includes(randomUser) === false) {
            io.sockets.connected[socket.id].emit('new user', { user: randomUser, log: chatLog, onlineUsers: onlineUserList });
            break;
        }
    }

    // Adds new user to the online user list
    socket.on('online user', function(newUser) {
        usernameMap.set(socket.id, {username: newUser, color: '#000000'});
        onlineUserList.push(newUser);
        io.emit('online users', onlineUserList);

        console.log('a user connected: ' + socket.id + ' username: ' + usernameMap.get(socket.id).username);
    });

    // Retrieves the message entered in by the user and checks if the user typed in a command or a regular message.
    socket.on('chat message', function(msg) {
        let date = new Date();
        let timestamp = date.getHours() + ":" + (date.getMinutes()<10?'0':'') + date.getMinutes();
        let user = usernameMap.get(socket.id);
        let messageContent = { time: timestamp, username: user.username, color: user.color, message: msg, clientID: socket.id }
        changeCommandCheck(msg, messageContent);
    });

    // Removes the disconnected user from the online user list
    socket.on('disconnect', function() {
        let username = usernameMap.get(socket.id).username;
        let usernameIndex = onlineUserList.indexOf(username);
        console.log('user disconnected: ' + socket.id + ' username: ' + username);
        for (let i = 0; i < onlineUserList.length; i++) {
            if (i === usernameIndex) {
                onlineUserList.splice(i,1);
            }
        }

        usernameMap.delete(socket.id);
        io.emit('user disconnected', onlineUserList);
    });

    // Checks if the message that the user typed was a command or a regular message
    function changeCommandCheck(msg, messageContent) {
        if (msg.startsWith('/')) {
            let changeCommand = msg.split(" ");

            // Checks if it's a username change command
            if (changeCommand[0] === '/nick') {
                if (checkExistingUsername(changeCommand[1]) === false) {
                    if (changeCommand[1] !== undefined && changeCommand[1] !== '') {
                        let currentUsername = usernameMap.get(socket.id).username;
                        let currentUserColor = usernameMap.get(socket.id).color;

                        onlineUserList[onlineUserList.indexOf(usernameMap.get(socket.id).username)] = changeCommand[1];
                        io.emit('online users', onlineUserList);

                        usernameMap.set(socket.id, { username: changeCommand[1], color: currentUserColor });
                        io.sockets.connected[socket.id].emit('username changed', changeCommand[1]);
                        io.sockets.connected[socket.id].emit('update message', 'Your username changed from ' + currentUsername + ' to ' + changeCommand[1]);
                    }
                    else {
                        io.sockets.connected[socket.id].emit('error message', "Invalid username! Please choose another username");
                    }
                }
                else {
                    io.sockets.connected[socket.id].emit('error message', "Invalid username! Username already exists");
                }
            }

            // Checks if it's a username color change command
            else if (changeCommand[0] === "/nickcolor") {
                if (changeCommand[1] !== undefined && changeCommand[1] !== '' && checkValidColor(changeCommand[1]) === true) {
                    let currentUsername = usernameMap.get(socket.id).username;
                    let currentColor = usernameMap.get(socket.id).color;

                    usernameMap.set(socket.id, { username: currentUsername, color: '#' + changeCommand[1] });
                    io.sockets.connected[socket.id].emit('update message', 'Your username color changed from ' + currentColor.substring(1) + ' to ' + changeCommand[1]);
                }
                else {
                    io.sockets.connected[socket.id].emit('error message', "Invalid color! Color does not exist (format must be RRGGBB)");
                }
            }
            else {
                io.sockets.connected[socket.id].emit('error message', "Invalid command! Command entered does not exist");
            }
        }
        else {
            io.emit('chat message', messageContent);
            chatLog.push(messageContent);
        }
    }

    // Checks if a username exists in the chat or not
    function checkExistingUsername(username) {
        for (let i = 0; i < onlineUserList.length; i++) {
            if (onlineUserList[i] === username) {
                return true;
            }
        }
        return false;
    }

    // Verifies if a color is valid or not
    function checkValidColor(color) {
        let RegExp = /(^[0-9A-Fa-f]{6}$)|(^[0-9A-F]{3}$)/i;
        return RegExp.test(color);
    }
});

// Set the server to listen on port 3000
http.listen(3000, function() {
    console.log('listening on *:3000');
});
