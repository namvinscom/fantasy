# Namvinscom Fantasy 2026/27

Ứng dụng hỗ trợ quản lý đội Fantasy Premier League — phân tích, tối ưu, theo dõi rank.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Recharts |
| Backend | Python 3.13, FastAPI, SQLAlchemy 2.0 |
| Database | SQLite (migration-ready for PostgreSQL) |
| Data | FPL Public API (fantasy.premierleague.com/api) |

## Cài đặt

### 1. Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
```

## Chạy app

### Cách nhanh nhất (Windows)
```
Double-click start.bat
```

### Chạy thủ công

**Backend:**
```bash
cd backend
.\venv\Scripts\activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Frontend:**
```bash
cd frontend
npm run dev
```

## URLs

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:8000
- **API Docs:** http://localhost:8000/docs
- **API ReDoc:** http://localhost:8000/redoc

## First-time Setup

1. Mở http://localhost:3000
2. Click **"Sync FPL Data"** trong sidebar để tải dữ liệu từ FPL API
3. Sau khi sync xong: vào **Players** để xem danh sách cầu thủ
4. Vào **My Team** → Setup Squad để nhập đội hình
5. Sau khi có squad: các trang Transfer, Captain, Simulator sẽ hoạt động

## FPL API Endpoints dùng

| Endpoint | Dữ liệu |
|----------|---------|
| `bootstrap-static/` | Players, teams, GW events, xG/xA |
| `fixtures/` | Lịch thi đấu, FDR |
| `event/{gw}/live/` | Live GW stats |
| `element-summary/{id}/` | Lịch sử cầu thủ |
| `entry/{id}/event/{gw}/picks/` | Squad (bán-public) |

## Tính năng

- ✅ Player Database — filter, sort, search toàn bộ cầu thủ
- ✅ FPL Score — 0-100 scoring engine với 8 metrics
- ✅ BUY/HOLD/SELL/WATCH recommendations
- ✅ Transfer Optimizer — tìm best transfer
- ✅ -4 Hit Calculator — tính có nên take hit không
- ✅ Captain Optimizer — top 5 captain picks
- ✅ Starting XI Optimizer — đề xuất formation tối ưu
- ✅ Fixture Analysis — FDR heatmap + swing alerts
- ✅ Chip Planner — theo dõi chip status
- ✅ What-if Simulator — thử bất kỳ transfer nào
- ✅ Sync FPL Data — cập nhật từ FPL API official

## Notes

- Ứng dụng **chỉ phân tích**, không tự động submit lên FPL
- Mọi quyết định do người dùng xác nhận
- Data cache 1 giờ để tránh spam FPL API
- SQLite → dễ dàng migrate sang PostgreSQL sau
