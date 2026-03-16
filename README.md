# admin-web — Giao diện quản trị hệ thống phát hiện vi phạm

> **Frontend** — Next.js 16 + React 19 + TypeScript + Tailwind CSS
> Giao diện web để upload video, xem kết quả phát hiện AI real-time, quản lý người dùng và file.

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Yêu cầu cài đặt](#2-yêu-cầu-cài-đặt)
3. [Cách chạy dự án](#3-cách-chạy-dự-án)
4. [Tổ chức thư mục (giải thích chi tiết)](#4-tổ-chức-thư-mục)
5. [Các trang (Pages)](#5-các-trang-pages)
6. [Các luồng chức năng chính](#6-các-luồng-chức-năng-chính)
7. [Xác thực (Auth)](#7-xác-thực-auth)
8. [Kết nối với Backend](#8-kết-nối-với-backend)
9. [Các component quan trọng](#9-các-component-quan-trọng)

---

## 1. Tổng quan hệ thống

`admin-web` là phần **Frontend** (giao diện người dùng). Nó chạy trên trình duyệt và giao tiếp với backend `3soc` qua:
- **HTTP REST API** — đăng nhập, upload file, quản lý user
- **WebSocket** — gửi frame video, nhận kết quả detect real-time
- **SSE (Server-Sent Events)** — nhận thông báo vi phạm từ server

```
Trình duyệt
    │
    ├── HTTP API  →  http://localhost:8000/api
    ├── WebSocket →  ws://localhost:8000/realtime
    └── SSE       →  http://localhost:8000/file-stream/{id}
                          │
                          ▼
                    Backend 3soc (port 8000)
```

---

## 2. Yêu cầu cài đặt

| Phần mềm | Phiên bản | Ghi chú |
|----------|-----------|---------|
| Node.js | 18+ | Bắt buộc |
| npm / yarn / pnpm | Mới nhất | Để cài package |
| Backend `3soc` | — | Phải đang chạy ở port 8000 |

**Thư viện chính:**

| Thư viện | Mục đích |
|----------|----------|
| `next` 16 | Framework React (App Router) |
| `react` 19 | Thư viện UI |
| `typescript` | Kiểu dữ liệu tĩnh |
| `tailwindcss` v4 | CSS utility-first |
| `@radix-ui/*` | Các component UI primitive (shadcn/ui) |
| `lucide-react` | Bộ icon |
| `react-hook-form` + `zod` | Quản lý form + validation |
| `sonner` | Thông báo toast |
| `recharts` | Biểu đồ (nếu dùng) |

---

## 3. Cách chạy dự án

```bash
# Bước 1: Vào thư mục dự án
cd admin-web

# Bước 2: Cài thư viện
npm install

# Bước 3: Cấu hình API URL (nếu backend không chạy ở localhost:8000)
# Tạo file .env.local và thêm:
# NEXT_PUBLIC_API_URL=http://localhost:8000/api

# Bước 4: Chạy ở chế độ phát triển
npm run dev
```

Mở trình duyệt: **http://localhost:3000**

Đăng nhập bằng:
- Username: `admin` / Password: `admin123` (quyền admin)
- Username: `user` / Password: `user123` (quyền thường)

---

## 4. Tổ chức thư mục

```
admin-web/
│
├── app/                          ← Các trang web (Next.js App Router)
│   ├── api.ts                    ← API Client: tất cả hàm gọi API backend ở đây
│   ├── globals.css               ← CSS toàn cục
│   ├── layout.tsx                ← Layout gốc: bọc TopBar + Provider cho tất cả trang
│   ├── page.tsx                  ← Trang chủ "/" — phát hiện real-time
│   │
│   ├── login/
│   │   └── page.tsx              ← Trang đăng nhập
│   │
│   ├── files/
│   │   └── page.tsx              ← Trang quản lý file video đã upload
│   │
│   ├── settings/
│   │   └── page.tsx              ← Trang cài đặt tài khoản + đổi mật khẩu
│   │
│   └── users/
│       └── page.tsx              ← Trang quản lý user (chỉ Admin)
│
├── components/                   ← Các component tái sử dụng
│   ├── TopBar.tsx                ← Thanh điều hướng trên cùng
│   ├── CanvasOverlay.tsx         ← Canvas vẽ bounding box lên video
│   ├── DetectionModal.tsx        ← Modal hiển thị kết quả vi phạm
│   ├── topbar.css
│   └── ui/                       ← ~40 component UI từ shadcn/ui
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── table.tsx
│       └── ...
│
├── contexts/
│   └── AuthContext.tsx           ← Lưu trạng thái đăng nhập (user, token)
│                                    Chia sẻ cho toàn bộ ứng dụng qua React Context
│
├── hooks/                        ← Custom React hooks
│   ├── useRealtimeDetection.ts   ← Hook quản lý WebSocket, gửi frame, nhận kết quả
│   ├── useViolationSSE.ts        ← Hook lắng nghe SSE vi phạm từ server
│   └── use-toast.ts              ← Hook hiển thị thông báo toast
│
├── lib/                          ← Thư viện tiện ích
│   ├── WebSocketClient.ts        ← Class quản lý kết nối WebSocket
│   ├── imageUtils.ts             ← Hàm vẽ bounding box lên canvas
│   └── utils.ts                  ← Merge Tailwind class (cn())
│
├── public/                        ← File tĩnh (ảnh, icon)
├── next.config.mjs               ← Cấu hình Next.js
├── package.json                  ← Thông tin dự án + thư viện
└── tsconfig.json                 ← Cấu hình TypeScript
```

### Giải thích luồng đọc code cho người mới

> **Muốn hiểu trang nào làm gì?** → Đọc file trong `app/*/page.tsx`
> **Muốn hiểu gọi API thế nào?** → Đọc `app/api.ts`
> **Muốn hiểu auth hoạt động thế nào?** → Đọc `contexts/AuthContext.tsx`
> **Muốn hiểu WebSocket hoạt động thế nào?** → Đọc `hooks/useRealtimeDetection.ts` + `lib/WebSocketClient.ts`
> **Muốn hiểu SSE hoạt động thế nào?** → Đọc `hooks/useViolationSSE.ts`
> **Muốn hiểu vẽ bounding box thế nào?** → Đọc `components/CanvasOverlay.tsx` + `lib/imageUtils.ts`

---

## 5. Các trang (Pages)

### `/login` — Trang đăng nhập
- Nhập username + password
- Gọi `POST /api/users/login`
- Lưu token vào `localStorage`
- Chuyển hướng về trang chủ `/`

---

### `/` — Trang chủ (Phát hiện real-time)
Đây là trang chức năng chính:
- Chọn file video hoặc ảnh từ máy tính
- Nếu là **ảnh**: detect ngay → hiển thị bounding box
- Nếu là **video**: upload lên server → mở WebSocket → gửi frame liên tục → nhận bounding box → vẽ lên video
- Phần dưới trang: lưới thumbnail các frame vi phạm đã phát hiện
- Click vào thumbnail → video nhảy đến thời điểm đó

---

### `/files` — Trang quản lý file
- Hiển thị danh sách video đã upload (phân trang, sắp xếp)
- Mỗi video có: tên file, dung lượng, thời lượng, người upload, ngày tạo
- Các thao tác:
  - **Xem**: mở video trong tab mới
  - **Scan**: chạy AI detect trên video → hiện kết quả trong DetectionModal
  - **Xoá**: xoá file khỏi server và database
- Admin thấy tất cả file, user thường chỉ thấy file của mình

---

### `/users` — Trang quản lý user *(Chỉ Admin)*
- Danh sách tất cả user (phân trang, sắp xếp)
- Tạo user mới
- Sửa thông tin (username, email, mật khẩu, role, trạng thái)
- Xoá user

---

### `/settings` — Trang cài đặt
- **Tab Tài khoản**: xem thông tin bản thân (chỉ đọc)
- **Tab Mật khẩu**: đổi mật khẩu (nhập mật khẩu cũ + mới)
- **Tab Hệ thống** *(chỉ Admin)*: cấu hình khoảng thời gian gửi frame, theme
- Nút đăng xuất

---

## 6. Các luồng chức năng chính

### Luồng 1: Detect video real-time (Trang chủ)

```
[Người dùng] Chọn file video từ máy tính
    │
    ▼
[app/page.tsx] Gọi apiClient.uploadFile(file, videoId)
               → POST /api/files/upload (multipart)
               → Backend lưu file, tạo record DB
    │
    ▼
[useRealtimeDetection hook] Khởi tạo WebSocketClient
               → Kết nối ws://localhost:8000/realtime
    │
    ▼
[Vòng lặp 200ms] Video đang phát:
    1. Capture frame hiện tại → canvas.toDataURL('image/jpeg')
    2. Encode base64
    3. Gửi qua WebSocket:
       { type: "frame", frameData: "data:...", timestamp: 1250, videoId: "..." }
    │
    ▼
[Backend] Chạy 3 model YOLO → trả về:
    { type: "detection", timestamp: 1250, boxes: [...] }
    │
    ▼
[CanvasOverlay component] Nhận boxes → vẽ hình chữ nhật màu lên video
    - co3soc → Đỏ
    - duongluoibo → Xanh lá
    - vnmap → Xanh dương
    │
    ▼
[useViolationSSE hook] Lắng nghe SSE: GET /file-stream/{videoId}
    Khi server lưu vi phạm → nhận event → thêm thumbnail vào danh sách
    │
    ▼
[Người dùng] Click thumbnail → video.currentTime = timestamp → nhảy đến frame vi phạm
```

---

### Luồng 2: Detect ảnh tĩnh (Trang chủ)

```
[Người dùng] Chọn file ảnh (.jpg, .png...)
    │
    ▼
[app/page.tsx] Gọi apiClient.detectImage(file)
               → POST /api/files/detect-image
    │
    ▼
[Backend] Chạy 3 model YOLO trên ảnh
          Trả về: { detections: [...], filename: "..." }
    │
    ▼
[lib/imageUtils.ts] drawBoundingBoxes(canvas, imageUrl, boxes)
    Vẽ bounding box lên canvas đặt chồng lên ảnh
```

---

### Luồng 3: Scan video đã upload (Trang Files)

```
[Người dùng] Bấm "Scan" trên file video
    │
    ▼
[app/files/page.tsx] Mở EventSource → GET /api/files/{id}/detect-stream
    │
    ▼
[Backend] Stream SSE:
    event 1: { type: "init", detection_id: "..." }
    event 2: { type: "metadata", total_frames: 500, fps: 30 }
    event 3: { type: "violation", data: { frame_number, timestamp, image_path, detections } }
    ...
    event N: { type: "complete", total_violations: 5 }
    │
    ▼
[DetectionModal component] Hiển thị:
    - Lưới ảnh thumbnail các frame vi phạm
    - Click vào frame → xem ảnh lớn với bounding box + bảng detection
```

---

### Luồng 4: Đăng nhập / Đăng xuất

```
ĐĂNG NHẬP:
[/login page] Nhập username + password → submit form
    → apiClient.login({ username, password })
    → POST /api/users/login
    → Backend trả: { access_token, token_type, user }
    → AuthContext.login() lưu token vào state + localStorage
    → Chuyển hướng về "/"

ĐĂNG XUẤT:
[/settings page] Bấm "Đăng xuất"
    → AuthContext.logout()
    → Xoá token khỏi state + localStorage
    → Chuyển hướng về "/login"

TỰ ĐỘNG PHỤC HỒI:
[AuthContext useEffect] Khi trang load:
    → Đọc token từ localStorage
    → Nếu có → apiClient.setToken(token) → người dùng không cần đăng nhập lại
```

---

### Luồng 5: Quản lý user (Admin)

```
[/users page] Load danh sách:
    → GET /api/users?page=1&page_size=10
    → Hiển thị bảng có phân trang

[Tạo user mới]:
    → Mở dialog → nhập thông tin → POST /api/users/register

[Sửa user]:
    → Mở dialog → sửa → PUT /api/users/{id}

[Xoá user]:
    → Xác nhận → DELETE /api/users/{id}
```

---

## 7. Xác thực (Auth)

**Token lưu ở đâu?** → `localStorage` với key `access_token`

**Làm sao token được gửi?** → `ApiClient` tự đọc token từ localStorage và gắn vào header:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**File liên quan:**
- `contexts/AuthContext.tsx` — quản lý state: `user`, `token`, `isAuthenticated`
- `app/api.ts` — class `ApiClient`, phương thức `getHeaders()` tự động thêm token

**Phân quyền trong UI:**
- `TopBar.tsx` gọi `GET /api/users/me` để biết role
- Menu "Quản lý User" chỉ hiển thị nếu `role === "admin"`
- Trang `/users` nếu không phải admin → backend trả 403

---

## 8. Kết nối với Backend

Tất cả kết nối với backend được cấu hình qua biến môi trường:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Nếu không đặt → mặc định `http://localhost:8000/api`.

### Tổng hợp các endpoint được gọi

| Hook / Component | Giao thức | Endpoint |
|------------------|-----------|----------|
| `apiClient.login()` | HTTP POST | `/api/users/login` |
| `apiClient.uploadFile()` | HTTP POST | `/api/files/upload` |
| `apiClient.getFiles()` | HTTP GET | `/api/files` |
| `apiClient.deleteFile()` | HTTP DELETE | `/api/files/{id}` |
| `apiClient.detectImage()` | HTTP POST | `/api/files/detect-image` |
| `apiClient.getUsers()` | HTTP GET | `/api/users` |
| `apiClient.updateUser()` | HTTP PUT | `/api/users/{id}` |
| `apiClient.deleteUser()` | HTTP DELETE | `/api/users/{id}` |
| `useRealtimeDetection` | **WebSocket** | `ws://localhost:8000/realtime` |
| `useViolationSSE` | **SSE** | `/file-stream/{videoId}` |
| `files/page.tsx` | **SSE** | `/api/files/{id}/detect-stream` |

---

## 9. Các component quan trọng

### `components/TopBar.tsx`
Thanh điều hướng trên cùng:
- Logo + tên hệ thống
- Menu: Trang chủ, Files, Users (chỉ admin), Settings
- Gọi `GET /api/users/me` để kiểm tra role mỗi khi render

---

### `components/CanvasOverlay.tsx`
Vẽ bounding box lên video đang phát:
- Nhận mảng `boxes: DetectionBox[]`
- Dùng HTML5 Canvas API vẽ hình chữ nhật + label + độ tin cậy
- Màu sắc theo loại vi phạm (đỏ/xanh lá/xanh dương)
- Tự resize theo kích thước video

---

### `components/DetectionModal.tsx`
Hiển thị kết quả detect từ video đã upload:
- Lưới ảnh thumbnail các frame vi phạm
- Click vào frame → modal to hơn hiển thị:
  - Ảnh frame đầy đủ với bounding box
  - Bảng chi tiết: frame số, timestamp, loại vi phạm, độ tin cậy

---

### `hooks/useRealtimeDetection.ts`
Custom hook quản lý toàn bộ detect real-time:
- Tạo và giữ kết nối WebSocket
- Set interval 200ms để capture + gửi frame
- Nhận và parse kết quả detection
- Trả về: `{ boxes, isConnected, frameCount, ... }`

---

### `hooks/useViolationSSE.ts`
Custom hook lắng nghe SSE vi phạm:
- Tạo `EventSource` kết nối `/file-stream/{videoId}`
- Parse event JSON
- Cập nhật danh sách violations

---

### `lib/WebSocketClient.ts`
Class đóng gói kết nối WebSocket:
- `connect(url)` — kết nối, tự reconnect nếu đứt
- `sendFrame(frameData, timestamp, videoId)` — gửi frame
- `onMessage(callback)` — đăng ký nhận kết quả
- `disconnect()` — ngắt kết nối

---

### `lib/imageUtils.ts`
Tiện ích vẽ bounding box lên canvas:
- `drawBoundingBoxes(canvas, imageUrl, boxes)` — vẽ ảnh + boxes
- Dùng cho trang chủ khi detect ảnh tĩnh và trong DetectionModal

---

### `app/api.ts` — ApiClient
Class singleton chứa tất cả hàm gọi API:
- Tự đọc/lưu token từ `localStorage`
- Tự gắn `Authorization: Bearer ...` vào mọi request
- Dùng `fetch` API của trình duyệt
- Export instance: `export const apiClient = new ApiClient()`
