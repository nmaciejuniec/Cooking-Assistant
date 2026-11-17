package com.nmaciejuniec.cookingassistant;

import android.content.Context;
import android.net.nsd.NsdManager;
import android.net.nsd.NsdServiceInfo;
import android.net.wifi.WifiManager;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedInputStream;
import java.io.BufferedOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.LinkedList;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Home Wi-Fi sync: announces this device with Android's NsdManager (Bonjour), finds the other devices of the same
 * household network and moves already-encrypted messages over TCP. The web page encrypts and decrypts everything.
 */
@CapacitorPlugin(name = "LanSync")
public class LanSyncPlugin extends Plugin {
    private static final String TYPE = "_cookassist._tcp";
    private static final int MAX_FRAME = 64 * 1024 * 1024;

    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Map<String, Socket> pending = new ConcurrentHashMap<>();
    private final LinkedList<NsdServiceInfo> resolveQueue = new LinkedList<>();
    private boolean resolving = false;

    private NsdManager nsd;
    private ServerSocket server;
    private WifiManager.MulticastLock lock;
    private NsdManager.RegistrationListener regListener;
    private NsdManager.DiscoveryListener discListener;
    private String netId = "";
    private String deviceId = "";

    @PluginMethod
    public void start(PluginCall call) {
        netId = call.getString("netId", "");
        deviceId = call.getString("deviceId", "");
        stopAll();
        try {
            Context ctx = getContext();
            nsd = (NsdManager) ctx.getSystemService(Context.NSD_SERVICE);
            WifiManager wifi = (WifiManager) ctx.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if (wifi != null) {
                lock = wifi.createMulticastLock("cookingassistant");
                lock.setReferenceCounted(false);
                lock.acquire();
            }
            server = new ServerSocket(0);
            final ServerSocket srv = server;
            pool.submit(() -> acceptLoop(srv));

            NsdServiceInfo info = new NsdServiceInfo();
            info.setServiceName("ca-" + deviceId);
            info.setServiceType(TYPE);
            info.setPort(server.getLocalPort());
            info.setAttribute("n", netId);
            info.setAttribute("d", deviceId);
            info.setAttribute("v", "1");
            regListener = new NsdManager.RegistrationListener() {
                @Override public void onRegistrationFailed(NsdServiceInfo s, int e) { }
                @Override public void onUnregistrationFailed(NsdServiceInfo s, int e) { }
                @Override public void onServiceRegistered(NsdServiceInfo s) { }
                @Override public void onServiceUnregistered(NsdServiceInfo s) { }
            };
            nsd.registerService(info, NsdManager.PROTOCOL_DNS_SD, regListener);

            discListener = new NsdManager.DiscoveryListener() {
                @Override public void onStartDiscoveryFailed(String t, int e) { }
                @Override public void onStopDiscoveryFailed(String t, int e) { }
                @Override public void onDiscoveryStarted(String t) { }
                @Override public void onDiscoveryStopped(String t) { }
                @Override public void onServiceFound(NsdServiceInfo s) {
                    if (s.getServiceName() != null && s.getServiceName().equals("ca-" + deviceId)) return;
                    enqueue(s);
                }
                @Override public void onServiceLost(NsdServiceInfo s) { }
            };
            nsd.discoverServices(TYPE, NsdManager.PROTOCOL_DNS_SD, discListener);

            JSObject r = new JSObject();
            r.put("port", server.getLocalPort());
            call.resolve(r);
        } catch (Exception e) {
            stopAll();
            call.reject("start failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        stopAll();
        call.resolve();
    }

    @PluginMethod
    public void request(PluginCall call) {
        final String host = call.getString("host");
        final Integer port = call.getInt("port");
        final String data = call.getString("data", "");
        if (host == null || port == null) { call.reject("host and port needed"); return; }
        pool.submit(() -> {
            try (Socket s = new Socket()) {
                s.connect(new InetSocketAddress(host, port), 6000);
                s.setSoTimeout(90000);
                writeFrame(s.getOutputStream(), data);
                String res = readFrame(s.getInputStream());
                JSObject o = new JSObject();
                o.put("data", res);
                call.resolve(o);
            } catch (Exception e) {
                call.reject("request failed: " + e.getMessage());
            }
        });
    }

    @PluginMethod
    public void reply(PluginCall call) {
        final String id = call.getString("id");
        final String data = call.getString("data", "");
        final Socket s = id == null ? null : pending.remove(id);
        call.resolve();
        if (s == null) return;
        pool.submit(() -> {
            try {
                if (data != null && !data.isEmpty()) writeFrame(s.getOutputStream(), data);
            } catch (IOException ignored) {
            } finally {
                try { s.close(); } catch (IOException ignored) { }
            }
        });
    }

    private void acceptLoop(ServerSocket srv) {
        while (!srv.isClosed()) {
            try {
                final Socket s = srv.accept();
                pool.submit(() -> handle(s));
            } catch (IOException e) {
                if (srv.isClosed()) return;
            }
        }
    }

    private void handle(Socket s) {
        try {
            s.setSoTimeout(30000);
            String data = readFrame(s.getInputStream());
            final String id = UUID.randomUUID().toString();
            pending.put(id, s);
            JSObject o = new JSObject();
            o.put("id", id);
            o.put("data", data);
            notifyListeners("request", o);
            pool.submit(() -> {
                try { Thread.sleep(90000); } catch (InterruptedException ignored) { }
                Socket left = pending.remove(id);
                if (left != null) try { left.close(); } catch (IOException ignored) { }
            });
        } catch (Exception e) {
            try { s.close(); } catch (IOException ignored) { }
        }
    }

    private synchronized void enqueue(NsdServiceInfo s) {
        resolveQueue.add(s);
        if (!resolving) resolveNext();
    }

    private synchronized void resolveNext() {
        final NsdServiceInfo s = resolveQueue.poll();
        if (s == null || nsd == null) { resolving = false; return; }
        resolving = true;
        try {
            nsd.resolveService(s, new NsdManager.ResolveListener() {
                @Override public void onResolveFailed(NsdServiceInfo i, int err) { resolveNext(); }
                @Override public void onServiceResolved(NsdServiceInfo i) { report(i); resolveNext(); }
            });
        } catch (Exception e) {
            resolving = false;
        }
    }

    private void report(NsdServiceInfo i) {
        Map<String, byte[]> a = i.getAttributes();
        String n = a != null && a.get("n") != null ? new String(a.get("n"), StandardCharsets.UTF_8) : "";
        String d = a != null && a.get("d") != null ? new String(a.get("d"), StandardCharsets.UTF_8) : "";
        if (!netId.equals(n) || d.isEmpty() || d.equals(deviceId) || i.getHost() == null) return;
        JSObject o = new JSObject();
        o.put("deviceId", d);
        o.put("host", i.getHost().getHostAddress());
        o.put("port", i.getPort());
        notifyListeners("peer", o);
    }

    private void stopAll() {
        try { if (nsd != null && discListener != null) nsd.stopServiceDiscovery(discListener); } catch (Exception ignored) { }
        try { if (nsd != null && regListener != null) nsd.unregisterService(regListener); } catch (Exception ignored) { }
        discListener = null;
        regListener = null;
        try { if (server != null) server.close(); } catch (Exception ignored) { }
        server = null;
        try { if (lock != null && lock.isHeld()) lock.release(); } catch (Exception ignored) { }
        synchronized (this) { resolveQueue.clear(); resolving = false; }
    }

    @Override
    protected void handleOnDestroy() {
        stopAll();
    }

    static String readFrame(InputStream in) throws IOException {
        DataInputStream d = new DataInputStream(new BufferedInputStream(in));
        int n = d.readInt();
        if (n < 0 || n > MAX_FRAME) throw new IOException("frame size");
        byte[] b = new byte[n];
        d.readFully(b);
        return new String(b, StandardCharsets.UTF_8);
    }

    static void writeFrame(OutputStream out, String s) throws IOException {
        byte[] b = s.getBytes(StandardCharsets.UTF_8);
        DataOutputStream d = new DataOutputStream(new BufferedOutputStream(out));
        d.writeInt(b.length);
        d.write(b);
        d.flush();
    }
}
