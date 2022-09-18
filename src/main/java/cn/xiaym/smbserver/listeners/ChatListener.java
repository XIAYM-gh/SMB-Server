package cn.xiaym.smbserver.listeners;

import cn.xiaym.smbserver.PluginMain;
import net.mamoe.mirai.event.EventHandler;
import net.mamoe.mirai.event.ListenerHost;
import net.mamoe.mirai.event.events.*;
import org.java_websocket.WebSocket;
import org.json.JSONException;
import org.json.JSONObject;

public class ChatListener implements ListenerHost {

    /* Group */
    @EventHandler
    public void onGroupMessage(GroupMessageEvent event) throws JSONException {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("type", "msg.group");
        jsonObject.put("message", event.getMessage().contentToString());
        jsonObject.put("time", event.getTime());
        jsonObject.put("group", event.getGroup().getId());

        JSONObject sender = new JSONObject();
        sender.put("qq", event.getSender().getId());

        String namecard = event.getSender().getNameCard();
        sender.put("namecard", namecard.isBlank() ? event.getSender().getNick() : namecard);

        jsonObject.put("sender", sender);

        // mkCache
        JSONObject cache = new JSONObject();
        cache.put("type", "group");
        cache.put("time", event.getTime());
        cache.put("group", event.getGroup().getId());
        cache.put("sender", sender);
        cache.put("message", event.getMessage().contentToString());
        PluginMain.newCache(cache);

        for (WebSocket socket : PluginMain.getConnections()) socket.send(jsonObject.toString());
    }

    @EventHandler
    public void onBotGroupMessage(GroupMessagePostSendEvent event) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("type", "msg.group");
        jsonObject.put("message", event.getMessage().contentToString());
        jsonObject.put("time", System.currentTimeMillis() / 1000L);
        jsonObject.put("group", event.getTarget().getId());
        JSONObject sender = new JSONObject();
        sender.put("qq", event.getBot().getId());
        sender.put("namecard", event.getBot().getNick());
        jsonObject.put("sender", sender);

        // mkCache
        JSONObject cache = new JSONObject();
        cache.put("type", "group");
        cache.put("time", System.currentTimeMillis() / 1000L);
        cache.put("group", event.getTarget().getId());
        cache.put("sender", sender);
        cache.put("message", event.getMessage().contentToString());
        PluginMain.newCache(cache);

        for (WebSocket socket : PluginMain.getConnections()) socket.send(jsonObject.toString());
    }

    /* Friend */
    @EventHandler
    public void onFriendMessage(FriendMessageEvent event) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("type", "msg.friend");
        jsonObject.put("message", event.getMessage().contentToString());
        jsonObject.put("time", event.getTime());
        jsonObject.put("sender", event.getSender().getId());

        // mkCache
        JSONObject cache = new JSONObject();
        cache.put("type", "friend");
        cache.put("time", event.getTime());
        cache.put("sender", event.getSender().getId());
        cache.put("target", event.getBot().getId());
        cache.put("message", event.getMessage().contentToString());
        PluginMain.newCache(cache);

        for (WebSocket socket : PluginMain.getConnections()) socket.send(jsonObject.toString());
    }

    @EventHandler
    public void onBotSendFriendMessage(FriendMessagePostSendEvent event) {
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("type", "msg.to.friend");
        jsonObject.put("message", event.getMessage().contentToString());
        jsonObject.put("time", System.currentTimeMillis() / 1000L);
        jsonObject.put("target", event.getTarget().getId());

        // mkCache
        JSONObject cache = new JSONObject();
        cache.put("type", "friend");
        cache.put("time", System.currentTimeMillis() / 1000L);
        cache.put("sender", event.getBot().getId());
        cache.put("target", event.getTarget().getId());
        cache.put("message", event.getMessage().contentToString());
        PluginMain.newCache(cache);

        for (WebSocket socket : PluginMain.getConnections()) socket.send(jsonObject.toString());
    }
}
