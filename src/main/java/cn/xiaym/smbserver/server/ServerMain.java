package cn.xiaym.smbserver.server;

import cn.xiaym.simplemiraibot.BotMain;
import cn.xiaym.simplemiraibot.utils.Logger;
import cn.xiaym.smbserver.PluginMain;
import net.mamoe.mirai.Bot;
import net.mamoe.mirai.contact.*;
import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONArray;
import org.json.JSONObject;

import java.net.InetSocketAddress;

public class ServerMain extends WebSocketServer {
    private final boolean print;

    public ServerMain(boolean print) {
        super(new InetSocketAddress(8484));
        this.print = print;
        setConnectionLostTimeout(100);
        setReuseAddr(true);
    }

    public void onOpen(WebSocket webSocket, ClientHandshake clientHandshake) {
        if (print) Logger.info("[SMBServer] 连接: " + webSocket.getRemoteSocketAddress());
    }

    public void onClose(WebSocket webSocket, int i, String s, boolean b) {
        if (print) Logger.info("[SMBServer] 退出: " + webSocket.getRemoteSocketAddress());
    }

    public void onMessage(WebSocket webSocket, String s) {
        try {
            JSONObject jsonObject = new JSONObject(s);
            String op = jsonObject.getString("operation");

            switch (op) {
                case "getBotInfo" -> {
                    // 返回响应
                    JSONObject ret = new JSONObject();
                    ret.put("type", "BotInfoResponse");

                    // Bot 信息
                    Bot bot = BotMain.getBot();
                    JSONObject botInfo = new JSONObject();
                    botInfo.put("qq", bot.getId());
                    botInfo.put("name",  bot.getNick());

                    // Bot 聊群、好友列表
                    JSONArray friendList = new JSONArray();
                    for (Friend friend : bot.getFriends()) {
                        JSONObject friendObj = new JSONObject();
                        friendObj.put("qq", friend.getId());
                        friendObj.put("name", friend.getNick());

                        friendList.put(friendObj);
                    }
                    botInfo.put("friendList", friendList);

                    JSONArray groupList = new JSONArray();
                    for (Group group : bot.getGroups().stream().filter(group -> group.getMembers().size() > 0).toList()) {
                        JSONObject groupObj = new JSONObject();
                        groupObj.put("id", group.getId());
                        groupObj.put("name", group.getName());

                        groupList.put(groupObj);
                    }
                    botInfo.put("groupList", groupList);

                    ret.put("response", botInfo);

                    webSocket.send(ret.toString());
                }
                case "syncMessage" -> {
                    JSONObject ret = new JSONObject();
                    ret.put("type", "SyncMessageResponse");
                    ret.put("response", PluginMain.getCache());

                    webSocket.send(ret.toString());
                }
                case "sendMessage" -> {
                    JSONObject ret = new JSONObject();
                    ret.put("type", "SendMessageResponse");
                    ret.put("error", false);

                    if (!jsonObject.has("type") || !jsonObject.has("target") || !jsonObject.has("message")) {
                        ret.put("error", true);
                        webSocket.send(ret.toString());
                        break;
                    }

                    try {
                        String type = jsonObject.getString("type");
                        long target = jsonObject.getLong("target");
                        String message = jsonObject.getString("message");

                        switch (type) {
                            case "group" -> {
                                Group group = BotMain.getBot().getGroupOrFail(target);
                                group.sendMessage(message);
                            }
                            case "friend" -> {
                                Friend friend = BotMain.getBot().getFriendOrFail(target);
                                friend.sendMessage(message);
                            }
                            default -> throw new IllegalArgumentException("No such type.");
                        }
                    } catch(Exception ex) {
                        ret.put("error", true);
                        webSocket.send(ret.toString());
                        break;
                    }

                    webSocket.send(ret.toString());
                }
            }
        } catch(Exception e) {
            e.printStackTrace();
        }
    }

    public void onError(WebSocket webSocket, Exception e) {
        if (print) Logger.info("[SMBServer] 客户端 (IP 地址为: " + webSocket.getRemoteSocketAddress() + ") 导致了错误!");
        e.printStackTrace();
    }

    public void onStart() {
        Logger.info("[SMBServer] 启动成功! 正在监听8484端口.");
    }
}
