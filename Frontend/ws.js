// Global variables
let _ws, _connected = false;
let _groupMap = new Map(), _friendMap = new Map();
let _groupMsgs = [], _friendMsgs = [];
let _interacting, _inputMap = new Map();
let _messageCount = 0;
let botName, botQQ;
const _input = qs(".sendArea textarea");
const _title = qs("span.mdui-typo-title");

// Fast functions
function id(id) {
    return document.getElementById(id);
}

function qs(sel) {
    return document.querySelector(sel);
}

function qsAll(sel) {
    return document.querySelectorAll(sel);
}

function log(text) {
    console.log(text);
}

// Functions
function showModule(moduleSelector) {
    // close all modules
    qsAll(".module.shown").forEach((element) => {
        element.classList.remove("shown");
    });

    qs(moduleSelector).classList.add("shown");
    mdui.mutation();
}

function changeMenu(element) {
    qsAll(".mdui-list-item-active").forEach((ele) => {
        ele.classList.remove("mdui-list-item-active");
    });

    element.classList.add("mdui-list-item-active");

    let moduleName = element.getAttribute("data-page");
    if (moduleName == _interacting) return;
    _inputMap.set(_interacting, _input.value);

    _interacting = null;
    _title.innerText = "";

    updateMessages(moduleName);
}

function updateMessages(moduleName) {
    if (moduleName == undefined) return;

    if (!moduleName.startsWith("msg-")) {
        showModule("#" + moduleName);
        return;
    }

    // update input
    let __value = _inputMap.get(moduleName);
    _input.value = __value == undefined ? "" : __value;
    _interacting = moduleName;
    showMsgByModuleName(_interacting);
    showModule("#chatUI");
}

function showMsgByModuleName(name, doAnimatedScroll) {
    // clear container
    id("msgContainer").innerHTML = "";

    // Group
    if (name.startsWith("msg-group-")) {
        let groupId = Number(name.replace("msg-group-", ""));

        if (!groupId) {
            mdui.snackbar("聊群不存在!");
            return;
        }

        _title.innerText = _groupMap.get(groupId);

        let currentGroupMsg = getGroupMessages(groupId);
        currentGroupMsg = currentGroupMsg.slice(currentGroupMsg.length - 100, currentGroupMsg.length);

        currentGroupMsg.forEach((data) => {
            let ele = document.createElement("div");
            if (data.recalled) ele.classList.add("recalled");
            ele.classList.add("msg");
            ele.classList.add("myself-" + data.myself);
            ele.setAttribute("data-time", data.time);

            ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${data.sender.qq}&spec=100">
            <div>
                <span class="name">${data.sender.namecard}</span>
                <span class="msg">${data.message}</span>
            </div>`;
            id("msgContainer").appendChild(ele);
        });
    }

    // Friend
    if (name.startsWith("msg-friend-")) {
        let friendId = Number(name.replace("msg-friend-", ""));

        if (!friendId) {
            mdui.snackbar("好友不存在!");
            return;
        }

        _title.innerText = _friendMap.get(friendId);

        let currentFriendMessage = getFriendMessages(friendId);
        currentFriendMessage = currentFriendMessage.slice(currentFriendMessage.length - 100, currentFriendMessage.length);

        currentFriendMessage.forEach((data) => {
            let ele = document.createElement("div");
            if (data.recalled) ele.classList.add("recalled");
            ele.classList.add("msg");
            ele.classList.add("myself-" + data.myself);
            ele.setAttribute("data-time", data.time);
            ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${data.myself ? botQQ : data.friend}&spec=100">
            <div>
                <span class="name">${_friendMap.get(data.myself ? botQQ : data.friend)}</span>
                <span class="msg">${data.message}</span>
            </div>`;
            id("msgContainer").appendChild(ele);
        });
    }

    if (doAnimatedScroll) {
        id("msgScroller").scrollIntoView({ behavior: "smooth" });
    } else {
        id("msgScroller").scrollIntoView();
        setTimeout(() => { id("msgScroller").scrollIntoView(); }, 100);
    }
}

// 过滤消息
function getFriendMessages(friendQQ) {
    let _messages = [];
    _friendMsgs.forEach((msg) => {
        if (msg.friend == friendQQ) _messages.push(msg);
    });

    return _messages;
}

function getGroupMessages(groupID) {
    let _messages = [];
    _groupMsgs.forEach((msg) => {
        if (msg.group == groupID) _messages.push(msg);
    });

    return _messages;
}

function connectToServer() {
    closeConnection();

    _ws = new WebSocket("ws://127.0.0.1:8484");

    _ws.addEventListener("error", () => {
        if (!_connected) {
            mdui.snackbar({
                message: "SMBServer 连接失败!",
                buttonText: '重试',
                onButtonClick: () => {
                    connectToServer();
                },
                timeout: 0,
                closeOnOutsideClick: false
            });
            return;
        }

        mdui.snackbar("WebSocket 发生错误!", {
            timeout: 2000
        });
    });

    _ws.addEventListener("open", () => {
        _connected = true;

        mdui.snackbar("WebSocket 连接建立成功!", {
            timeout: 2000
        });

        showModule("#mainMenu");

        // 同步机器人信息和最近消息
        _ws.send(JSON.stringify({ operation: "getBotInfo" }));
        _ws.send(JSON.stringify({ operation: "syncMessage" }));
    });

    _ws.addEventListener("close", () => {
        if (_connected) {
            // 自动重连
            log("====== 重新连接 ======");
            connectToServer();
        } else {
            mdui.snackbar("WebSocket 连接已经断开!", {
                timeout: 2000
            });
        }

        _interacting = null;
        _connected = false;
    });

    _ws.addEventListener("message", (event) => {
        let messageData = JSON.parse(event.data);
        log(messageData);
        switch (messageData.type) {
            case "BotInfoResponse":
                botInfoHandler(messageData);
                break;

            case "SyncMessageResponse":
                syncMessageHandler(messageData);
                break;

            case "SendMessageResponse":
                mdui.snackbar(messageData.error ? "发送失败!" : "发送成功!", {
                    timeout: 2000
                });
                break;

            case "msg.group":
                _messageCount++;

                messageData.sender.namecard = escapeHTML(messageData.sender.namecard);
                messageData.message = escapeHTML(messageData.message);

                _groupMsgs.push({
                    myself: messageData.sender.qq == botQQ,
                    group: messageData.group,
                    sender: messageData.sender,
                    time: messageData.time,
                    message: messageData.message
                });

                if (_interacting != "msg-group-" + messageData.group) return;

                let ele = document.createElement("div");
                ele.classList.add("msg");
                ele.classList.add("myself-" + (messageData.sender.qq == botQQ));
                ele.setAttribute("data-time", messageData.time);
                ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${messageData.sender.qq}&spec=100">
                    <div>
                        <span class="name">${messageData.sender.namecard}</span>
                        <span class="msg">${messageData.message}</span>
                    </div>`;

                id("msgContainer").appendChild(ele);
                id("msgScroller").scrollIntoView({ behavior: "smooth" });
                break;

            case "msg.friend":
                _messageCount++;

                messageData.message = escapeHTML(messageData.message);

                _friendMsgs.push({
                    myself: false,
                    friend: messageData.sender,
                    time: messageData.time,
                    message: messageData.message
                });

                if (_interacting != "msg-friend-" + messageData.sender) return;

                let friendEle = document.createElement("div");
                friendEle.classList.add("msg");
                friendEle.classList.add("myself-false");
                friendEle.setAttribute("data-time", messageData.time);
                friendEle.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${messageData.sender}&spec=100">
                    <div>
                        <span class="name">${_friendMap.get(messageData.sender)}</span>
                        <span class="msg">${messageData.message}</span>
                    </div>`;

                id("msgContainer").appendChild(friendEle);
                id("msgScroller").scrollIntoView({ behavior: "smooth" });
                break;

            case "msg.to.friend":
                _messageCount++;

                messageData.message = escapeHTML(messageData.message);

                _friendMsgs.push({
                    myself: true,
                    friend: messageData.target,
                    time: messageData.time,
                    message: messageData.message
                });

                if (_interacting != "msg-friend-" + messageData.target) return;

                let toFriendEle = document.createElement("div");
                toFriendEle.classList.add("msg");
                toFriendEle.classList.add("myself-true");
                toFriendEle.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${botQQ}&spec=100">
                    <div>
                        <span class="name">${_friendMap.get(botQQ)}</span>
                        <span class="msg">${messageData.message}</span>
                    </div>`;

                id("msgContainer").appendChild(toFriendEle);
                id("msgScroller").scrollIntoView({ behavior: "smooth" });
                break;

            case "messageRecall":
                let _time = messageData.response.time;
                let _type = messageData.response.type;

                switch (_type) {
                    case "group":
                        for (let i = 0; i < _groupMsgs.length; i++) {
                            if (_groupMsgs[i].time == _time) {
                                let obj = _groupMsgs[i];
                                obj.recalled = true;

                                _groupMsgs[i] = obj;
                                qs("[data-time=\"" + _time + "\"]").classList.add("recalled");
                            }
                        }
                        break;
                    case "friend":
                        _friendMsgs.forEach((msg) => {
                            for (let i = 0; i < _friendMsgs.length; i++) {
                                if (_friendMsgs[i].time == _time) {
                                    let obj = _friendMsgs[i];
                                    obj.recalled = true;
    
                                    _friendMsgs[i] = obj;
                                    qs("[data-time=\"" + _time + "\"]").classList.add("recalled");
                                }
                            }
                        });
                        break;
                }
                break;
        }
    });
}

function botInfoHandler(messageData) {
    log("Bot 信息已更新.");

    botName = messageData.response.name;
    botQQ = messageData.response.qq;

    // update info
    id("qqNick").innerText = botName;
    id("qqNumber").innerText = botQQ;
    id("groupCount").innerText = messageData.response.groupList.length;
    id("friendCount").innerText = messageData.response.friendList.length;

    _groupMap.clear();
    _friendMap.clear();

    id("groupList").innerHTML = "";
    id("friendList").innerHTML = "";

    messageData.response.groupList.forEach((group) => {
        _groupMap.set(group.id, escapeHTML(group.name));

        let ele = document.createElement("div");
        ele.className = "mdui-list-item mdui-ripple";
        ele.setAttribute("data-page", "msg-group-" + group.id);
        ele.innerHTML = '\
                        <div class="mdui-list-item-avatar">\
                            <img src="http://p.qlogo.cn/gh/' + group.id + "/" + group.id + '/100" />\
                        </div>\
                        <div class="mdui-list-item-content mdui-text-truncate">' + escapeHTML(group.name) + '</div>';

        id("groupList").appendChild(ele);
    });

    messageData.response.friendList.forEach((friend) => {
        _friendMap.set(friend.qq, escapeHTML(friend.name));

        let ele = document.createElement("div");
        ele.className = "mdui-list-item mdui-ripple";
        ele.setAttribute("data-page", "msg-friend-" + friend.qq);
        ele.innerHTML = '\
                        <div class="mdui-list-item-avatar">\
                            <img src="http://q2.qlogo.cn/headimg_dl?dst_uin=' + friend.qq + '&spec=100">\
                        </div>\
                        <div class="mdui-list-item-content mdui-text-truncate">' + escapeHTML(friend.name) + '</div>';

        id("friendList").appendChild(ele);
    });

    if (_interacting) changeMenu(qs("[data-page=" + _interacting + "]"));
}

function syncMessageHandler(messageData) {
    _messageCount = 0;
    _groupMsgs = [];
    _friendMsgs = [];

    log("成功同步 " + messageData.response.length + " 个消息.");

    messageData.response.forEach((msg) => {
        _messageCount++;

        if (msg.type === "group") {
            msg.sender.namecard = escapeHTML(msg.sender.namecard);
            msg.message = escapeHTML(msg.message);

            _groupMsgs.push({
                myself: msg.sender.qq == botQQ,
                group: msg.group,
                sender: msg.sender,
                time: msg.time,
                message: msg.message,
                recalled: Boolean(msg.recalled)
            });
            return;
        }

        if (msg.type === "friend") {
            msg.message = escapeHTML(msg.message);

            _friendMsgs.push({
                myself: msg.sender == botQQ,
                friend: (msg.sender == botQQ) ? msg.target : msg.sender,
                time: msg.time,
                message: msg.message,
                recalled: Boolean(msg.recalled)
            });
            return;
        }
    });

    updateMessages();
}

function sendMessage() {
    let _list = _interacting.split("-");
    let type = _list[1];
    let target = Number(_list[2]);
    let message = _input.value;

    _ws.send(JSON.stringify({
        operation: "sendMessage",
        type: type,
        target: target,
        message: message
    }));

    _input.value = "";
}

function escapeHTML(html) {
    let ele = document.createElement("div");
    ele.appendChild(document.createTextNode(html));
    return ele.innerHTML;
}

/* Connection */
function closeConnection() {
    if (_ws) _ws.close();
    _ws = null;
}

function startConnection() {
    showModule("#connecting");
    connectToServer();
}

// Runnable codes
window.addEventListener("click", (event) => {
    let target = event.target;

    if (target.hasAttribute("data-page")) {
        changeMenu(target);
        return;
    }

    if (target.parentNode.hasAttribute && target.parentNode.hasAttribute("data-page")) {
        changeMenu(target.parentNode);
        return;
    }
});

window.addEventListener("keydown", (event) => {
    if (!_interacting || !_interacting.startsWith("msg-")) return;
    if (event.ctrlKey && event.key == "Enter") sendMessage();
});

qs("#chatUI button").onclick = sendMessage;

setInterval(() => {
    // update info
    id("msgCount").innerText = _messageCount;
    id("groupMsgCount").innerText = _groupMsgs.length;
}, 10);

// 每分钟同步一次机器人信息
setInterval(() => {
    if (_connected) _ws.send(JSON.stringify({ operation: "getBotInfo" }));
}, 60000);

startConnection();