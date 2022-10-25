/* eslint-disable import/newline-after-import */
/* eslint-disable prettier/prettier */
const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const http = require('http').Server(app);

const jwt = require('jsonwebtoken');

const port = process.env.PORT || 3100;
const port2 = process.env.PORT || 3300;
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:3000"
  },
});

const client = require('./connection.js');
const db = require('./queries');
app.use(cors());

// eslint-disable-next-line import/extensions
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static(__dirname));

client.connect();

app.get('/users', db.getUsers);
app.get('/channels', db.getChannels);
app.post('/channelByName', db.channelByName);
app.post('/userRow', db.getUserRow);
app.post('/addUserToChannel', db.addUserToChannel);
app.post('/updateUserImg', db.updateUserImg);
app.post('/updateChannel', db.updateChannel);
app.post('/deleteChannel', db.deleteChannel);
app.post('/updateColor', db.updateColor);
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.post('/addUser', db.addUser);

let users = [];
const channels = {
  current: '1'
}
/* 
{
  1: [users]
  cid2: [users del canal 2]
}
 */
io.on('connection', (socket) => {
  socket.on('chat message', (msgInfo) => {
    const { room } = msgInfo;
    io.to(room.name_channel).emit('chat message', msgInfo); // Send to all users in room, including sender
    console.log(room, msgInfo);
  });

  socket.on('general room', (msgInfo) => {
    io.emit('general room', msgInfo);
  });

  socket.on('user registered', (isUserAdded) => {
    io.emit('user registered', isUserAdded);
  });

  socket.on("newUser", data => {
    console.log('🟢: A user Online');
    users.push(data);
    db.updateUserState(data, 'true'); 
    io.emit("newUserResponse", data.email);
  })

  socket.on("reconnect", data => {
    console.log('🟡: user reconnect');
    users.push(data);
    db.updateUserState(data, 'true'); 
    io.emit("newUserResponse", socket.id);
  })

  socket.on('disconnect', () => {
    const presentUser = users.find(user => user.socketID === socket.id);
    console.log('🔥: A user disconnected', presentUser, socket.id);
    db.updateUserState(presentUser, 'false');
    // users = users.filter(user =>user.socketID !== socket.id);   
    io.emit("newUserResponse", presentUser.email)
    socket.disconnect()
  });

  socket.on('logOut', () => {
    console.log(users, 'logout')
    const presentUser = users.find(user => user.socketID === socket.id);
    console.log('🔥: LogOut', presentUser, socket.id);
    db.updateUserState(presentUser, 'false');
    io.emit("newUserResponse", presentUser.email)
    socket.disconnect()
  });

  /* 
{
  current: '1'
  1: [users]
  cid2: [users del canal 2]
}
'3': [
    {
      email: 'user1@gmail.com',
      uid: 1,
      user_name: 'user1',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGF0YSI6eyJlbWFpbCI6InVzZXIxQGdtYWlsLmNvbSIsInBhc3N3b3JkIjoidXNlcjEifSwiaWF0IjoxNjY2Mjc2MDM3LCJleHAiOjE2NjYzNjI0Mzd9.g_kkn-_5n-WKFOV8_tZGjYw1tzi9bWyjHO3vGScHxYI'
    },
    {
      email: 'user2@gmail.com',
      uid: 2,
      user_name: 'user2',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGF0YSI6eyJlbWFpbCI6InVzZXIyQGdtYWlsLmNvbSIsInBhc3N3b3JkIjoidXNlcjIifSwiaWF0IjoxNjY2Mjc2NzQxLCJleHAiOjE2NjYzNjMxNDF9.lCN1HsAwJKpgPUJIwPtx0JV7UdKjW3L1DI6yRQ8vUmA'
    },
    {
      email: 'user2@gmail.com',
      uid: 2,
      user_name: 'user2',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyRGF0YSI6eyJlbWFpbCI6InVzZXIyQGdtYWlsLmNvbSIsInBhc3N3b3JkIjoidXNlcjIifSwiaWF0IjoxNjY2Mjc2NzQxLCJleHAiOjE2NjYzNjMxNDF9.lCN1HsAwJKpgPUJIwPtx0JV7UdKjW3L1DI6yRQ8vUmA'
    }
  ]
 */
  socket.on('joinChannel', (userInChannelInfo) => {
    const { channelInfo, userSession} = userInChannelInfo
    socket.join(channelInfo.name_channel);
    const {cid} = channelInfo
    console.log(channels[cid], userSession);
    channels.current = cid
    if(channels[cid]) {
      console.log('prep', channels[cid]);
      channels[cid] = [...channels[cid]].concat(userSession)
      channels[cid] = channels[cid].filter((channel, index, channelArr) =>
      index === channelArr.findIndex((c) => (
        c.email === channel.email
      )));
      // channels[cid].forEach(channel => {
      //   console.log('prep', channel.email, user.email);
      //   if(channel.email !== user.email){
      //     console.log('post', channels[cid]);

      //   }
      // })
      console.log('post', channels[cid]);
    } 
    else channels[cid] = [].concat(userSession)
    // socket.broadcast.to(channelInfo.name_channel).emit('joinChannel', channels[cid]);
    io.to(channelInfo.name_channel).emit('usersInRoom', {
      current: cid,
      [cid]: channels[cid]
    });
    // io.emit("usersInRoom", channels);
    console.log('my', channels);
  });
});

http.listen(port2, () => {
  console.log(`listening on: ${port2}`);
});

app.post("/login", (req , res) => {
  const infoUserLogin = req.body;
  db.verifyUserLogged(infoUserLogin, res)
});

// Authorization: Bearer <token>
function verifyToken(req, res, next){
  const bearerHeader =  req.headers.authorization;
  if(typeof bearerHeader !== 'undefined'){
       const bearerToken = bearerHeader.split(" ")[1];
       req.token  = bearerToken;
       next();
  }else{
      res.sendStatus(403).send();
  }
}
app.post("/addChannel", verifyToken, db.addChannel);