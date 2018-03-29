//依赖模块
var express = require('express');
var path = require('path');
var IO = require('socket.io');
var router = express.Router();

var app = express();
var server = require('http').Server(app);
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// 创建socket服务
var socketIO = IO(server);
// 房间用户名单
var roomInfo = {};

socketIO.on('connection', function (socket) {
  // 获取请求建立socket连接的url
  // 如: http://localhost:3000/room/room_1, roomID为room_1
  var url = socket.request.headers.referer;
  var obj = { intoTime : formatTime(new Date()) };

  var splited = url.split('/');
  obj.roomID = splited[splited.length - 1];   // 获取房间ID
  obj.user = '';

  socket.on('join', function (userName) {
    if(!userName){
      var date = new Date();
      obj.user = +date;
    }else{
      obj.user = userName;      
    }
    // 将用户昵称加入房间名单中
    if (!roomInfo[obj.roomID]) {
      roomInfo[obj.roomID] = [];
    }
    roomInfo[obj.roomID].push(obj.user);

    socket.join(obj.roomID);
    // 通知房间内人员
    socketIO.to(obj.roomID).emit('sys', obj.user + ' 加入了房间 '+ obj.intoTime , 'add', roomInfo[obj.roomID]);  
    console.log(obj.user + '加入了' + obj.roomID + '时间' + obj.intoTime );
  });

  socket.on('leave', function () {
    socket.emit('disconnect');
    //socket.broadcast.emit('disconnect');与上效果一样，只是该方法是除去自己能看到;
  });

  //监听出退事件
  socket.on('disconnect', function () {
    // 从房间名单中移除
    var index = roomInfo[obj.roomID].indexOf(obj.user);
    if (index !== -1) {
      roomInfo[obj.roomID].splice(index, 1);
    }

    socket.leave(obj.roomID); 
    socketIO.to(obj.roomID).emit('sys', obj.user + ' 退出了房间 '+ formatTime(new Date()) , 'remove' , roomInfo[obj.roomID]);
    console.log(obj.user + '退出了' + obj.roomID + '时间' + formatTime(new Date()) );
  });


  socket.on('message', function (msg) {
    if(msg) obj.state = 1;
    // 验证如果用户不在房间内则不给发送
    if (roomInfo[obj.roomID].indexOf(obj.user) === -1) {  
      return false;
    }
    socketIO.to(obj.roomID).emit('msg', obj, msg);
  });

});

// 路由配置
router.get('/room/:roomID', function (req, res) {
  var roomID = req.params.roomID;
  res.render('room', {
    roomID: roomID,
    users: roomInfo[roomID]
  });
});

app.use('/', router);

server.listen(3000, function () {
  console.log('server listening on port 3000');
});

function formatTime(time){
  var year  = time.getFullYear() ,
    month = time.getMonth() + 1 ,
    day   = time.getUTCDate() ,
    hours = time.getHours() ,
    minutes = time.getMinutes() ,
    seconds = time.getSeconds() ;
  return year + '/' + month + '/' + day + ' '+ hours + ':' + minutes + ':' + seconds ;
}