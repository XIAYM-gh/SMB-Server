package cn.xiaym.smbserver.listeners;

import cn.xiaym.smbserver.PluginMain;
import net.mamoe.mirai.event.EventHandler;
import net.mamoe.mirai.event.ListenerHost;
import net.mamoe.mirai.event.events.MessageRecallEvent;
import org.java_websocket.WebSocket;
import org.json.JSONArray;
import org.json.JSONObject;

public class RecallListener implements ListenerHost {
    @EventHandler
    public void onRecall(MessageRecallEvent event) {
        JSONArray cache = PluginMain.getCache();
        JSONObject jsonObject = new JSONObject();
        jsonObject.put("type", "messageRecall");
        JSONObject response = new JSONObject();

        for (int i = 0; i < cache.length(); i++) {
            Object obj = cache.get(i);

            if (obj instanceof JSONObject _jsonObject
                    && _jsonObject.getLong("time") == event.getMessageTime()) {
                _jsonObject.put("recalled", true);
                PluginMain.getCache().put(i, _jsonObject);

                response.put("type", event instanceof MessageRecallEvent.GroupRecall ? "group" : "friend");
                response.put("time", event.getMessageTime());
            }
        }

        jsonObject.put("response", response);

        for (WebSocket webSocket : PluginMain.getConnections()) webSocket.send(jsonObject.toString());
    }
}
