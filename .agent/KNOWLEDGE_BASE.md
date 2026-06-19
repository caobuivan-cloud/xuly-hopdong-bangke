# .agent/KNOWLEDGE_BASE.md - Bộ脑 của dự án Xu ly hop dong - bang ke

Lưu trữ những **quyết định kiến trúc** quan trọng và **lý do chiến lược** của dự án.

> ⚠️ **QUY TẮC GHI:**
> - Chỉ ghi quyết định kiến trúc và lý do chiến lược (high-level decisions)
> - Tuyệt đối tránh liệt kê tính năng, changelog chi tiết, hoặc mô tả cấu hình thuần túy
> - Mỗi dòng phải trả lời được câu hỏi: "Tại sao chúng ta quyết định làm vậy?"
>
> **Ví dụ đúng:** "Dùng monorepo workspace để chia sẻ package và thống nhất quy trình build giữa frontend và backend."
> **Ví dụ sai:** "Thêm tính năng login bằng Firebase." (đây là changelog, không phải knowledge)

---

## Initial Decisions From Repo Scan

> Ghi từ `1-3` quyết định ban đầu nếu có đủ bằng chứng từ codebase, config, hoặc repo scan.
> Nếu chưa đủ bằng chứng, để trống phần này và nêu rõ trong báo cáo init thay vì bịa decision.

- 2026-06-19 [Dùng React và Vite]. Why: Frontend stack chính được chọn để phát triển ứng dụng xử lý hợp đồng, tối ưu hóa tốc độ khởi động và bundle bằng Vite.
- 2026-06-19 [Tắt HMR trong AI Studio]. Why: Biến môi trường `DISABLE_HMR` được cấu hình trong `vite.config.ts` để ngăn file watcher reload ứng dụng liên tục trong quá trình AI tự động chỉnh sửa code.

---

## Ongoing Decisions

- [2026-06-19] [Khởi tạo bộ tài liệu Agent]. Why: Chuẩn hóa không gian `.agent` để AI context dễ dàng nạp và theo dõi được vòng đời dự án.
