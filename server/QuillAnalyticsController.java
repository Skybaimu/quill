/**
 * Quill 启动统计接口 (Spring Boot Controller)
 * 
 * 使用方法：
 *   1. 把这个文件放到你的 controller 包下
 *   2. 确保有 /api/quill-ping 的路由
 *   3. 访问 /api/quill-stats 查看统计
 * 
 * 请求格式：
 *   GET /api/quill-ping?id=uuid&v=0.1.0&p=win&t=timestamp
 */

package com.example.controller;

import org.springframework.web.bind.annotation.*;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.LocalDate;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@RestController
public class QuillAnalyticsController {

    // 内存存储（重启会清，正式项目建议存数据库）
    private final List<Map<String, String>> uniqueUsers = new CopyOnWriteArrayList<>();
    private final Map<String, Map<String, Object>> dailyStats = new ConcurrentHashMap<>();
    private long totalPings = 0;

    /** 接收启动统计 */
    @GetMapping("/api/quill-ping")
    public void ping(
            @RequestParam(required = false) String id,
            @RequestParam(required = false, name = "v") String version,
            @RequestParam(required = false, name = "p") String platform,
            @RequestParam(required = false, name = "t") String timestamp,
            HttpServletResponse response) throws IOException {

        if (id == null || id.isEmpty()) {
            response.setStatus(400);
            return;
        }

        totalPings++;

        // 去重用户
        boolean exists = uniqueUsers.stream().anyMatch(u -> id.equals(u.get("id")));
        if (!exists) {
            Map<String, String> user = new HashMap<>();
            user.put("id", id);
            user.put("platform", platform != null ? platform : "unknown");
            user.put("version", version != null ? version : "unknown");
            user.put("firstSeen", Instant.now().toString());
            uniqueUsers.add(user);
        }

        // 每日统计
        String today = LocalDate.now().toString();
        dailyStats.computeIfAbsent(today, k -> {
            Map<String, Object> day = new ConcurrentHashMap<>();
            day.put("pings", 0L);
            day.put("users", new CopyOnWriteArrayList<String>());
            return day;
        });
        Map<String, Object> day = dailyStats.get(today);
        day.put("pings", ((long) day.get("pings")) + 1);
        @SuppressWarnings("unchecked")
        List<String> dayUsers = (List<String>) day.get("users");
        if (!dayUsers.contains(id)) {
            dayUsers.add(id);
        }

        // 返回 1x1 透明 GIF（兼容 sendBeacon）
        byte[] pixel = Base64.getDecoder().decode("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7");
        response.setContentType("image/gif");
        response.setHeader("Cache-Control", "no-store");
        response.getOutputStream().write(pixel);
    }

    /** 查看统计面板 */
    @GetMapping("/api/quill-stats")
    public Map<String, Object> stats() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("总请求数", totalPings);
        result.put("去重用户数", uniqueUsers.size());

        String today = LocalDate.now().toString();
        Map<String, Object> todayData = dailyStats.getOrDefault(today, Map.of("pings", 0L, "users", List.of()));
        result.put("今日请求数", todayData.get("pings"));
        @SuppressWarnings("unchecked")
        List<String> todayUsers = (List<String>) todayData.get("users");
        result.put("今日活跃用户", todayUsers != null ? todayUsers.size() : 0);

        // 平台分布
        Map<String, Long> platformDist = new LinkedHashMap<>();
        uniqueUsers.forEach(u -> platformDist.merge(u.get("platform"), 1L, Long::sum));
        result.put("平台分布", platformDist);

        // 版本分布
        Map<String, Long> versionDist = new LinkedHashMap<>();
        uniqueUsers.forEach(u -> versionDist.merge(u.get("version"), 1L, Long::sum));
        result.put("版本分布", versionDist);

        return result;
    }
}
