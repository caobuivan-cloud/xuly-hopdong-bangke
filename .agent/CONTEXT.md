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

### Changelog
| File | Mô tả |
|------|------|
| [changelog/CHANGELOG-FE.md](./changelog/CHANGELOG-FE.md) | Thay đổi frontend, UI, UX, client-side flow |

### Testing
| File | Mô tả |
|------|------|
| [testing/master-data-search.md](./testing/master-data-search.md) | Kịch bản kiểm thử tính năng tìm kiếm Master Data |
| [testing/excel-import-export-refactor.md](./testing/excel-import-export-refactor.md) | Kịch bản kiểm thử bộ nạp & xuất Excel FAST |
| [testing/google-sheets-sync.md](./testing/google-sheets-sync.md) | Kịch bản kiểm thử tích hợp đồng bộ dữ liệu Google Sheets |
| [testing/activity-logging.md](./testing/activity-logging.md) | Kịch bản kiểm thử ghi nhật ký hoạt động người dùng |

### Agent Skills
| Skill | Mô tả |
|------|------|
| [skills/README.md](./skills/README.md) | Tổng quan skill pack và flow chuẩn |
| [skills/project-init/SKILL.md](./skills/project-init/SKILL.md) | Chuẩn hóa, bổ sung, hoặc audit bộ `.agent/` |
| [skills/codebase-audit/SKILL.md](./skills/codebase-audit/SKILL.md) | Audit codebase để tìm bug logic, bottleneck hiệu năng và chạy test |
| [skills/feature-plan/SKILL.md](./skills/feature-plan/SKILL.md) | Lập kế hoạch cho feature mới |
| [skills/feature-review/SKILL.md](./skills/feature-review/SKILL.md) | Review plan về kiến trúc, bảo mật, logic và rollout |
| [skills/spawn-agent-review/SKILL.md](./skills/spawn-agent-review/SKILL.md) | Review plan bằng subagents qua spawn_agent |
| [skills/expert-rebuttal/SKILL.md](./skills/expert-rebuttal/SKILL.md) | Phản biện có bằng chứng các findings từ expert review bên ngoài |
| [skills/expert-rebuttal-codex/SKILL.md](./skills/expert-rebuttal-codex/SKILL.md) | Sinh findings có bằng chứng từ review của Codex Desktop |
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
