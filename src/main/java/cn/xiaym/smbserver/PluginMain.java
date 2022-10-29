package cn.xiaym.smbserver;

import cn.xiaym.simplemiraibot.BotMain;
import cn.xiaym.simplemiraibot.plugins.JavaPlugin;
import cn.xiaym.simplemiraibot.utils.Logger;
import cn.xiaym.smbserver.listeners.ChatListener;
import cn.xiaym.smbserver.listeners.RecallListener;
import cn.xiaym.smbserver.server.ServerMain;
import org.java_websocket.WebSocket;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Collection;
import java.util.Timer;
import java.util.TimerTask;

public class PluginMain extends JavaPlugin {
    private static ServerMain serverMain;
    private static JavaPlugin pluginMain;
    private static final JSONArray cache = new JSONArray();
    private static final Timer timer = new Timer(true);

    public void onEnable() {
        pluginMain = this;

        Logger.info("[SMBServer] 正在初始化 SMB 服务器!");
        serverMain = new ServerMain(BotMain.useDebug());

        new Thread(() -> {
            try {
                serverMain.start();
            } catch(RuntimeException e) {
                Logger.err("[SMBServer] 服务器启动失败!");
            }
        }).start();

        readCache();
        Logger.info("[SMBServer] 从缓存文件读取了 " + cache.length() + " 条消息.");

        // Auto save cache
        timer.schedule(new TimerTask() {
            @Override
            public void run() {
                saveCache();
            }
        }, 10 * 60 * 1000, 10 * 60 * 1000);

        BotMain.getBot().getEventChannel().registerListenerHost(new ChatListener());
        BotMain.getBot().getEventChannel().registerListenerHost(new RecallListener());
    }

    public void onShutdown() {
        Logger.info("[SMBServer] 正在停止服务器...");

        try {
            serverMain.stop();
        } catch (InterruptedException ignored) {}

        Logger.info("[SMBServer] 正在完成聊天记录缓存，请稍后...");
        saveCache();
    }

    private static void readCache() {
        cache.clear();
        JSONArray array;

        File pluginDir = pluginMain.getDataFolder();

        File cacheFile = new File(pluginDir, "chat_cache.json");
        try {
            if (!cacheFile.exists()) {
                if (!cacheFile.createNewFile()) Logger.err("[SMBServer] 缓存文件创建失败!");
                Files.write(cacheFile.toPath(), "[]".getBytes());
            }

            array = new JSONArray(Files.readString(cacheFile.toPath()));
        } catch (IOException | JSONException e) {
            array = new JSONArray();
            Logger.err("[SMBServer] 缓存文件读取失败!");
            e.printStackTrace();
        }

        for (Object obj : array)
            if (obj instanceof JSONObject jsonObject) {
                switch (jsonObject.getString("type")) {
                    case "friend" -> {
                        JSONObject friendObj = new JSONObject();
                        if (!jsonObject.has("sender")
                                || !jsonObject.has("time")
                                || !jsonObject.has("message")
                                || !jsonObject.has("target")) continue;
                        boolean recalled = jsonObject.has("recalled") && jsonObject.getBoolean("recalled");

                        friendObj.put("type", "friend");
                        friendObj.put("sender", jsonObject.getLong("sender"));
                        friendObj.put("time", jsonObject.getLong("time"));
                        friendObj.put("message", jsonObject.getString("message"));
                        friendObj.put("target", jsonObject.getLong("target"));
                        friendObj.put("recalled", recalled);

                        cache.put(friendObj);
                    }

                    case "group" -> {
                        JSONObject groupObj = new JSONObject();
                        if (!jsonObject.has("sender")
                                || !jsonObject.has("time")
                                || !jsonObject.has("message")
                                || !jsonObject.has("group")) continue;
                        boolean recalled = jsonObject.has("recalled") && jsonObject.getBoolean("recalled");

                        groupObj.put("type", "group");
                        groupObj.put("sender", jsonObject.getJSONObject("sender"));
                        groupObj.put("time", jsonObject.getLong("time"));
                        groupObj.put("message", jsonObject.getString("message"));
                        groupObj.put("group", jsonObject.getLong("group"));
                        groupObj.put("recalled", recalled);

                        cache.put(groupObj);
                    }
                }
            }
    }

    private static void saveCache() {
        int maxCache = Math.min(cache.length(), 1000);

        try {
            JSONArray output = new JSONArray();

            for (int i = cache.length() - maxCache; i < cache.length(); i++) {
                output.put(cache.get(i));
            }

            Files.writeString(Paths.get("plugins/smbserver/chat_cache.json"), output.toString());
            Logger.info("[SMBServer] 缓存写入完成, 已写入 " + output.length() + " 条消息!");
        } catch(Exception e) {
            Logger.err("[SMBServer] 缓存写入失败!");
            e.printStackTrace();
        }
    }

    public static JSONArray getCache() {
        return cache;
    }

    public static void newCache(JSONObject msgCache) {
        cache.put(msgCache);
    }

    public static Collection<WebSocket> getConnections() {
        return serverMain.getConnections();
    }
}
