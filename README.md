## Roadmap

1. **MVP**：上傳 → 建立 job → Queue → Node Worker ffmpeg → R2 → 前端可播
    - Auth：mock userId
    - DB：只需 `jobs` table
2. **進度追蹤**：Queue 狀態顯示 + job retry
3. **多媒體擴充**：Remotion template / timeline 編輯
4. **SaaS 化**：
    - 加入 **Google OAuth2**（取代 mock auth）
    - Stripe payment、使用者配額
    - DB：增加 `accounts` table 與 job 關聯
5. **監控 & 優化**：OpenTelemetry trace、效能優化