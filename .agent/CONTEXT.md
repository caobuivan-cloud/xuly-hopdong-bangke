# Xu ly hop dong - bang ke - Context for AI Assistants

---

## 1. Project Overview

- **Tên dự án**: Xu ly hop dong - bang ke
- **Repo**: Local workspace
- **Trạng thái**: Bootstrap

### Tech Stack
- Frontend: React 19, Vite 6, TailwindCSS 4, TypeScript
- Backend: Express (optional/development)
- Database: N/A (hoặc dùng file xlsx/json)
- Auth: N/A
- Infrastructure: Vite local dev server

---

## 2. `.agent/` Directory Navigation

### Core Maps
| File | Mô tả |
|------|------|
| [CONTEXT.md](./CONTEXT.md) | Bản đồ nhanh để onboard và resume |
| [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md) | Quyết định kiến trúc và lý do chiến lược |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | Snapshot cấu trúc thư mục, entry points, services và commands |

### Architecture
| File | Mô tả |
|------|------|
| [architecture/MASTER.md](./architecture/MASTER.md) | Kiến trúc tổng thể và các boundary chính |

### Changelog
| File | Mô tả |
|------|------|
| [changelog/CHANGELOG-FE.md](./changelog/CHANGELOG-FE.md) | Thay đổi frontend, UI, UX, client-side flow |
| [changelog/CHANGELOG-BE.md](./changelog/CHANGELOG-BE.md) | Thay đổi backend, API, service, worker |
| [changelog/CHANGELOG-DB.md](./changelog/CHANGELOG-DB.md) | Thay đổi schema, migration, query, dữ liệu |

### Agent Skills
| Skill | Mô tả |
|------|------|
| [skills/README.md](./skills/README.md) | Tổng quan skill pack và flow chuẩn |
| [skills/project-init/SKILL.md](./skills/project-init/SKILL.md) | Chuẩn hóa, bổ sung, hoặc audit bộ `.agent/` |
| [skills/feature-plan/SKILL.md](./skills/feature-plan/SKILL.md) | Lập kế hoạch cho feature mới |
| [skills/feature-review/SKILL.md](./skills/feature-review/SKILL.md) | Review plan về kiến trúc, bảo mật, logic và rollout |
| [skills/feature-coordinator/SKILL.md](./skills/feature-coordinator/SKILL.md) | Triển khai feature theo phase và checklist |
| [skills/update-docs/SKILL.md](./skills/update-docs/SKILL.md) | Cập nhật docs sau khi code thay đổi |
| [skills/check-issue/SKILL.md](./skills/check-issue/SKILL.md) | Điều tra root cause của bug hoặc sự cố |
| [skills/docs-hygiene/SKILL.md](./skills/docs-hygiene/SKILL.md) | Rà soát sức khỏe hệ thống tài liệu và read-path |
| [skills/git-sync/SKILL.md](./skills/git-sync/SKILL.md) | Đồng bộ Git sau khi đã chốt docs và commit message |

---

## 3. Critical Files

| File | Mức độ | Ghi chú |
|------|------|---------|
| [package.json](../package.json) | CRITICAL | Định nghĩa dependencies và scripts chạy dự án. |
| [vite.config.ts](../vite.config.ts) | CRITICAL | Cấu hình Vite, plugin React và Tailwind. |

---

## 4. Quick Commands

```powershell
# Development
npm run dev

# Build
npm run build

# Preview
npm run preview
```

---

*Last updated: 2026-06-19 | v1.0*
