# راهنمای جامع راه‌اندازی و استقرار دولفین پلاس (Dolphin Plus) روی Ubuntu Server

این سند راهنمای گام‌به‌گام و جامع برای راه‌اندازی، پیکربندی، بازیابی پایگاه‌داده و مدیریت پروژه **Dolphin Plus** بر روی سرور لینوکس ابونتو (Ubuntu 22.04 / 24.04 LTS) می‌باشد.

---

## ۱. جدول معماری و مسیرهای سامانه (Routing Table)

کلیه ارتباطات شبکه و درخواست‌های وب از طریق کانتینر **Nginx Gateway** روی پورت استاندارد **`80`** مدیریت و توزیع می‌شوند:

| مسیر (Path) | سرویس مقصد | توضیحات و کارکرد |
| :--- | :--- | :--- |
| **`http://<SERVER_IP>/`** | **صفحه اصلی (Default)** | هدایت خودکار (HTTP 302) به پنل اپراتورها |
| **`http://<SERVER_IP>/operator/`** | **پنل اپراتورها (Django)** | کارتابل وظایف، فرم‌ها، پیگیری فرآیندها و سیستم پیشرفته اشتراک فایل |
| **`http://<SERVER_IP>/admin/`** | **React Admin Studio** | پنل جدید مدیریت با ری‌اکت ۱۹، مجهز به SPA Routing و داشبورد زنده |
| **`http://<SERVER_IP>/djangoadmin/`** | **Django Unfold Admin** | پنل مدیریت پیشرفته جنگو، مدیریت کاربران، ماژول بکاپ رمزنگاری‌شده و تنظیمات سیستم |
| **`http://<SERVER_IP>/api/`** | **Django REST API** | کلیه اندپوینت‌های REST بک‌اند مجهز به Rate-Limiting ضد Brute-Force |
| **`http://<SERVER_IP>/ws/`** | **Daphne ASGI** | وب‌سوکت‌های زنده و اعلانات با ارتقای اتوماتیک پروتکل |
| **`http://<SERVER_IP>/static/`** | **Nginx Direct Delivery** | سرو مستقیم و پرسرعت فایل‌های استاتیک و فونت‌های فارسی (YekanBakh) |
| **`http://<SERVER_IP>/media/branding/`** | **Nginx Direct Delivery** | سرو مستقیم لوگوها و فایل‌های برندینگ عمومی؛ سایر فایل‌های `/media/` برای امنیت توسط Django و پس از احراز هویت سرو می‌شوند |

---

## ۲. گام‌به‌گام راه‌اندازی سرور اوبونتو از صفر مطلق

### گام ۲.۱: آپدیت سرور و نصب Docker

دستورات زیر را برای نصب داکر و داکر کامپوز رسمی اجرا کنید:

```bash
# ۱. به‌روزرسانی پکیج‌های سیستم‌عامل
sudo apt update && sudo apt upgrade -y

# ۲. نصب ابزارهای پایه
sudo apt install -y curl git ufw ca-certificates gnupg lsb-release

# ۳. نصب داکر با اسکریپت رسمی
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# ۴. افزودن کاربر جاری به گروه داکر (جهت اجرای داکر بدون نیاز به sudo)
sudo usermod -aG docker $USER
newgrp docker

# ۵. اعتبارسنجی نصب
docker --version
docker compose version
```

---

### گام ۲.۲: کلون یا انتقال پروژه به سرور

پروژه را در مسیر موردنظر (مثلاً `/opt/dolphin-plus` یا مسیر خانگی کاربر) قرار دهید:

```bash
cd /opt
# کلون از ریپازیتوری گیت:
git clone <URL_ریپازیتوری> dolphin-plus
cd dolphin-plus
```

---

### گام ۲.۳: آماده‌سازی فایل‌های تنظیمات محیطی (`.env`)

فایل‌های محیطی ریشه و بک‌اند را از روی نمونه‌های آماده کپی کنید:

```bash
# ۱. کپی فایل کانفیگ اصلی داکر
cp .env.example .env

# ۲. کپی فایل کانفیگ بک‌اند
cp backend/.env.example backend/.env
```

> [!TIP]
> با دستور `nano .env` یا `nano backend/.env` می‌توانید تنظیمات را بازبینی کنید:
> - اطمینان حاصل کنید `GATEWAY_PORT=80` است.
> - متغیر `DJANGO_ALLOWED_HOSTS=*` باشد.
> - **مهم:** در `backend/.env` مقدار `DJANGO_DEBUG=False` باشد (در محیط production).
> - رمز عبور دیتابیس `POSTGRES_PASSWORD` را در صورت تمایل شخصی‌سازی کنید.

---

### گام ۲.۴: بیلد فرانت‌اند ری‌اکت (بدون نیاز به نصب Node.js روی هاست)

برای اینکه نیازی به نصب Node.js روی اوبونتو سرور نباشد، با کانتینر موقت داکر، فرانت‌اند را بیلد کنید:

```bash
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build:admin"
```

---

### گام ۲.۵: استارت کانتینرها

پروژه را اجرا کنید:

```bash
docker compose up -d --build
```
> [!NOTE]
> در لحظه استارت، کانتینر `dolphin-web` به‌صورت خودکار:
> 1. صبر می‌کند تا پایگاه‌داده و ردیس کاملاً آماده شوند.
> 2. تمام مایگریشن‌های دیتابیس را اعمال می‌کند.
> 3. فایل‌های استاتیک را جمع‌آوری کرده و در والیوم مشترک با Nginx قرار می‌دهد.

---

### گام ۲.۶: ساخت کاربر ادمین (Superuser)

```bash
docker exec -it dolphin-web python manage.py createsuperuser
```

---

### گام ۲.۷: تنظیم فایروال سرور (UFW)

برای برقراری امنیت و باز کردن پورت ۸۰:

```bash
sudo ufw allow 22/tcp   # دسترسی SSH
sudo ufw allow 80/tcp   # پورت ورود وب
sudo ufw --force enable
```

> [!IMPORTANT]
> **نکته امنیتی حیاتی:** Docker قوانین UFW را دور می‌زند (مستقیم با iptables کار می‌کند). به همین دلیل در `docker-compose.yml` پورت‌های PostgreSQL، Redis و Daphne فقط روی `127.0.0.1` Publish شده‌اند تا از اینترنت در دسترس نباشند. این تنظیمات را تغییر ندهید و پورت‌های داخلی را روی `0.0.0.0` باز نکنید.

اکنون سامانه از طریق آدرس `http://<IP_SERVER>` در دسترس است!

---

## ۳. راهنمای بازیابی بکاپ دیتابیس (Restore Database)

اگر از قبل فایل پشتیبان دیتابیس (مانند `dolphinplus.backup`) با فرمت باینری `pg_dump -Fc` دارید، به روش زیر می‌توانید آن را بازگردانی کنید:

### نکته فنی بسیار مهم:
سرویس `dolphin-postgres` اکنون بر روی **PostgreSQL 17** اجرا می‌شود و ایمیج بک‌اند نیز `pg_dump`/`pg_restore` نسخه ۱۷ را از مخزن رسمی PGDG نصب دارد؛ بنابراین ریستور بدون کانتینر اضافه و مستقیماً داخل کانتینر دیتابیس پروژه انجام می‌شود:

```bash
# ۱. بستن اتصالات قبلی و ساخت دیتابیس تمیز:
docker exec dolphin-postgres psql -U dolphin -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'dolphinflow' AND pid <> pg_backend_pid();"
docker exec dolphin-postgres psql -U dolphin -d postgres -c "DROP DATABASE IF EXISTS dolphinflow;"
docker exec dolphin-postgres psql -U dolphin -d postgres -c "CREATE DATABASE dolphinflow;"

# ۲. ریستور کردن مستقیم فایل بکاپ داخل کانتینر دیتابیس پروژه:
docker cp dolphinplus.backup dolphin-postgres:/tmp/dolphinplus.backup
docker exec dolphin-postgres pg_restore -U dolphin -d dolphinflow --no-owner --no-privileges /tmp/dolphinplus.backup

# ۳. اعمال خودکار مایگریشن‌های جدید پروژه روی دیتابیس ریستور شده:
docker exec dolphin-web python manage.py migrate
```

> [!IMPORTANT]
> **سازگاری کامل:** پس از ریستور، دستور `manage.py migrate` به‌صورت هوشمند تغییرات جدید شامل سیستم پیشرفته اشتراک فایل (`workflow.0070` تا `0076`) و مایگریشن‌های تکمیلی اکانت را بدون از دست رفتن اطلاعات روی دیتابیس قبلی اعمال می‌کند.

---

## ۴. دستورات پرکاربرد مدیریت و مانیتورینگ روزمره

### مشاهده وضعیت و لاگ‌ها:
```bash
# نمایش وضعیت لحظه‌ای کانتینرها
docker compose ps

# مشاهده لاگ زنده کل سامانه
docker compose logs -f

# مشاهده لاگ اختصاصی بک‌اند
docker compose logs -f web

# مشاهده لاگ اختصاصی وب‌سرور انجین‌ایکس
docker compose logs -f gateway
```

### متوقف‌سازی و ریستارت:
```bash
# ریستارت سریع سرویس‌های وب و سلری
docker compose restart web celery_worker celery_beat

# ریستارت کامل کل پروژه
docker compose restart

# خاموش کردن کامل سرویس‌ها
docker compose down
```

### آپدیت و دیپلوی مداوم تغییرات جدید (پیشنهادی برای سرور شرکت):
از آنجا که سرور شرکت محدودیت دسترسی مستقیم به GitHub/PyPI/Docker Hub دارد، اسکریپت [`deploy.sh`](./deploy.sh) کل فرآیند دیپلوی امن از سیستم شما به VPS را در یک دستور انجام می‌دهد:

```bash
# ۱. فقط یک بار در سیستم خودتان فایل تنظیمات را بسازید (این فایل در git ذخیره نمی‌شود):
cp .deploy.env.example .deploy.env
# سپس داخل .deploy.env مقادیر DEPLOY_HOST، DEPLOY_PORT و DEPLOY_USER را پر کنید.

# ۲. در هر تغییر کد (بک‌اند، فرانت‌اند یا Nginx) فقط این دستور را بزنید:
./deploy.sh
```

**گزینه‌های پرکاربرد `./deploy.sh`:**
- فقط تغییر بک‌اند/Nginx دارید و نیازی به بیلد مجدد React نیست:
  ```bash
  ./deploy.sh --skip-frontend
  ```
- هم‌زمان کامیت‌ها را روی GitHub هم Push کند و بعد روی VPS دیپلوی بگیرد:
  ```bash
  ./deploy.sh --git-push
  ```
- پکیج پایتونی جدید به `backend/requirements/base.txt` اضافه شده یا `Dockerfile` تغییر کرده:
  ```bash
  ./deploy.sh --rebuild-image
  ```
- پیش‌نمایش تغییرات قبل از اعمال روی سرور (بدون تغییر روی VPS):
  ```bash
  ./deploy.sh --dry-run
  ```

> [!NOTE]
> اسکریپت `deploy.sh` فایل‌های محیطی `.env` سرور، دیتابیس، فایل‌های آپلودشده (`media`) و بکاپ‌های سرور را دست‌نخورده نگه می‌دارد، فرانت‌اند را تمیز بیلد می‌کند، مایگریشن‌ها و `collectstatic` را اعمال کرده و در پایان تمام اندپوینت‌ها را خودکار تست (Smoke Test) می‌کند.

### آپدیت روی سرورهای دارای اینترنت آزاد (مستقیم از Git):
```bash
# ۱. دریافت آخرین تغییرات
git pull

# ۲. بیلد مجدد فرانت‌اند (در صورت وجود تغییرات در UI)
docker run --rm -v "$(pwd)/frontend:/app" -w /app node:20-alpine sh -c "npm install && npm run build"

# ۳. اعمال و بروزرسانی کانتینرها بدون قطعی دیتابیس
docker compose up -d --build
```

### ایجاد بکاپ دستی جدید از دیتابیس:
```bash
docker exec dolphin-postgres pg_dump -U dolphin -F c -b -v -f /tmp/backup_$(date +%Y%m%d).backup dolphinflow
docker cp dolphin-postgres:/tmp/backup_$(date +%Y%m%d).backup ./
```
