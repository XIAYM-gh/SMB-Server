// Global variables
let _ws, _connected = false;
let _groupMap = new Map(), _friendMap = new Map();
let _groupMsgs = [], _friendMsgs = [];
let _interacting, _inputMap = new Map();
let _messageCount = 0;
let __botInfoCache;
let botName, botQQ;
const _input = document.querySelector(".sendArea textarea");
const _title = document.querySelector("span.mdui-typo-title");

// Functions
function showModule(moduleSelector) {
    // close all modules
    document.querySelectorAll(".module.shown").forEach((element) => {
        element.classList.remove("shown");
    });

    document.querySelector(moduleSelector).classList.add("shown");
    mdui.mutation();
}

function changeMenu(element) {
    document.querySelectorAll(".mdui-list-item-active").forEach((ele) => {
        ele.classList.remove("mdui-list-item-active");
    });

    element.classList.add("mdui-list-item-active");

    let moduleName = element.getAttribute("data-page");
    if (moduleName == _interacting) return;
    _inputMap.set(_interacting, _input.value);

    _interacting = null;
    _title.innerText = "";

    if (moduleName.startsWith("msg-")) {
        let __value = _inputMap.get(moduleName);
        _input.value = __value == undefined ? "" : __value;
        _interacting = moduleName;
        moduleName = "chatUI";
        showMsgByModuleName(_interacting);
    }

    showModule("#" + moduleName);
}

function showMsgByModuleName(name, doAnimatedScroll) {
    // clear container
    document.getElementById("msgContainer").innerHTML = "";

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
            ele.classList.add("msg");
            ele.classList.add("myself-" + data.myself);
            ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${data.sender.qq}&spec=100">
            <div>
                <span class="name">${data.sender.namecard}</span>
                <span class="msg">${data.message}</span>
            </div>`;
            document.getElementById("msgContainer").appendChild(ele);
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
            ele.classList.add("msg");
            ele.classList.add("myself-" + data.myself);
            ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${data.myself ? botQQ : data.friend}&spec=100">
            <div>
                <span class="name">${_friendMap.get(data.myself ? botQQ : data.friend)}</span>
                <span class="msg">${data.message}</span>
            </div>`;
            document.getElementById("msgContainer").appendChild(ele);
        });
    }

    if (doAnimatedScroll) {
        document.getElementById("msgScroller").scrollIntoView({ behavior: "smooth" });
    } else {
        document.getElementById("msgScroller").scrollIntoView();
        setTimeout(() => { document.getElementById("msgScroller").scrollIntoView(); }, 100);
    }
}

function log(text) {
    console.log(text);
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
        try {
            let messageData = JSON.parse(event.data);
            switch (messageData.type) {
                case "BotInfoResponse":
                    if (__botInfoCache === messageData) return;
                    __botInfoCache = JSON.stringify(messageData);
                    log("Bot 信息已更新.");

                    botName = messageData.response.name;
                    botQQ = messageData.response.qq;

                    // update info
                    document.getElementById("qqNick").innerText = botName;
                    document.getElementById("qqNumber").innerText = botQQ;
                    document.getElementById("groupCount").innerText = messageData.response.groupList.length;
                    document.getElementById("friendCount").innerText = messageData.response.friendList.length;

                    _groupMap.clear();
                    _friendMap.clear();

                    document.getElementById("groupList").innerHTML = "";
                    document.getElementById("friendList").innerHTML = "";

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

                        document.getElementById("groupList").appendChild(ele);
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

                        document.getElementById("friendList").appendChild(ele);
                    });

                    if (_interacting) changeMenu(document.querySelector("[data-page=" + _interacting + "]"));
                    break;

                case "SyncMessageResponse":
                    _messageCount = 0;
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
                                message: msg.message
                            });
                            return;
                        }

                        if (msg.type === "friend") {
                            msg.message = escapeHTML(msg.message);

                            _friendMsgs.push({
                                myself: msg.sender == botQQ,
                                friend: (msg.sender == botQQ) ? msg.target : msg.sender,
                                time: msg.time,
                                message: msg.message
                            });
                            return;
                        }
                    });
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
                    ele.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${messageData.sender.qq}&spec=100">
                    <div>
                        <span class="name">${messageData.sender.namecard}</span>
                        <span class="msg">${messageData.message}</span>
                    </div>`;

                    document.getElementById("msgContainer").appendChild(ele);
                    document.getElementById("msgScroller").scrollIntoView({ behavior: "smooth" });
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
                    friendEle.innerHTML = `<img class="avatar" src="//q2.qlogo.cn/headimg_dl?dst_uin=${messageData.sender}&spec=100">
                    <div>
                        <span class="name">${_friendMap.get(messageData.sender)}</span>
                        <span class="msg">${messageData.message}</span>
                    </div>`;

                    document.getElementById("msgContainer").appendChild(friendEle);
                    document.getElementById("msgScroller").scrollIntoView({ behavior: "smooth" });
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

                    document.getElementById("msgContainer").appendChild(toFriendEle);
                    document.getElementById("msgScroller").scrollIntoView({ behavior: "smooth" });
                    break;
            }
        } catch (e) {
            console.warn("Failed to parse data:\n" + event.data);
            console.warn("Exception:\n" + e);
        }
    });
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

document.querySelector("#chatUI button").onclick = sendMessage;

setInterval(() => {
    // update info
    document.getElementById("msgCount").innerText = _messageCount;
    document.getElementById("groupMsgCount").innerText = _groupMsgs.length;
}, 10);

// 每分钟同步一次机器人信息
setInterval(() => {
    if (_connected) _ws.send(JSON.stringify({ operation: "getBotInfo" }));
}, 60000);

startConnection();