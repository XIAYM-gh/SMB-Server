package cn.xiaym.smbserver;

import cn.xiaym.simplemiraibot.BotMain;
import cn.xiaym.simplemiraibot.plugins.JavaPlugin;
import cn.xiaym.simplemiraibot.utils.Logger;
import cn.xiaym.smbserver.listeners.ChatListener;
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
    private static JSONArray cache;
    private static final Timer timer = new Timer(true);

    public void onEnable() {
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
        File pluginDir = new File("plugins", "smbserver");
        if (!pluginDir.exists() && !pluginDir.mkdirs()) Logger.err("[SMBServer] 数据文件夹创建失败!");

        File cacheFile = new File(pluginDir, "chat_cache.json");
        try {
            if (!cacheFile.exists()) {
                if (!cacheFile.createNewFile()) Logger.err("[SMBServer] 缓存文件创建失败!");
                Files.write(cacheFile.toPath(), "[]".getBytes());
            }

            cache = new JSONArray(Files.readString(cacheFile.toPath()));
        } catch (IOException | JSONException e) {
            cache = new JSONArray();
            Logger.err("[SMBServer] 缓存文件读取失败!");
            e.printStackTrace();
        }
    }

    private static void saveCache() {
        int maxCache = Math.min(cache.length(), 1000);
        Logger.info("[SMBServer] 正在保存 " + maxCache + " 条消息，总共 " + cache.length() + " 条.");

        try {
            JSONArray output = new JSONArray();

            for (int i = cache.length() - maxCache; i < cache.length(); i++) {
                output.put(cache.get(i));
            }

            Files.writeString(Paths.get("plugins/smbserver/chat_cache.json"), output.toString());
            Logger.info("[SMBServer] 缓存写入完成!");
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
