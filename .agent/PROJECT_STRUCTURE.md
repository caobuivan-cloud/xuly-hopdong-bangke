# Project Structure - Xu ly hop dong - bang ke

> Tạo ngày: 2026-06-19
> Cập nhật gần nhất: 2026-06-19
> Mục đích: Lưu snapshot cấu trúc codebase để AI có thể onboard và resume nhanh.

---

## 1. Snapshot cây thư mục

```text
[root]/
|-- .agent/
|   |-- skills/
|-- assets/
|-- src/
|   |-- utils/
|       |-- fastImport.ts
|-- De bai xu ly hop dong bang ke.md
|-- google_apps_script.js
|-- index.html
|-- package.json
|-- tsconfig.json
|-- vite.config.ts
```

## 2. Entry Points

| Loại | File/Path | Vai trò | Ghi chú |
|------|-----------|---------|---------|
| Frontend | `index.html` / `src/` | Bootstrap ứng dụng React bằng Vite | |

## 3. Services / Modules chính

| Module/Service | Path | Trách nhiệm | Phụ thuộc chính |
|----------------|------|-------------|------------------|
| Fast Excel Export Helper | `src/utils/fastImport.ts` | Ánh xạ cấu trúc dữ liệu 36 cột chuẩn FAST cho các luồng xuất dữ liệu | |

## 4. Config / Infra quan trọng

| File | Nhóm | Ý nghĩa | Lưu ý khi chỉnh sửa |
|------|------|---------|---------------------|
| `package.json` | Build/Deps | Định nghĩa dự án Node, các dependency | Có dependencies như xlsx, motion, lucide-react |
| `vite.config.ts` | Build | Cấu hình Vite, bao gồm alias | `hmr` và `watch` được điều khiển bằng `DISABLE_HMR` |
| `tsconfig.json` | Type/Build| Cấu hình TypeScript | |

## 5. Commands

| Mục đích | Lệnh | Điều kiện | Ghi chú |
|----------|------|-----------|---------|
| Chạy local | `npm run dev` | | Chạy Vite dev server ở port 3000 |
| Build | `npm run build` | | Build ứng dụng ra thư mục dist |
| Xóa build | `npm run clean` | | Xóa `dist` và `server.js` |
| Lint | `npm run lint` | | Chạy tsc |

## 6. Luồng đọc nhanh cho AI

- Khi bắt đầu: Đọc file `De bai xu ly hop dong bang ke.md` để hiểu logic và quy trình kinh doanh.

## 7. Ghi chú từ lần quét đầu

- Package manager: npm
- Kiểu repo: single app (Vite + React)
- Điểm dễ nhầm: Project không có thư mục `.git` (Chưa khởi tạo Git).
