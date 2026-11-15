# PLAYDESK — RAGNAROK EDITION

PlayDesk-in **mövcud backend API-sinə qoşulan**, tam yenidən dizayn edilmiş React + TypeScript frontend-i.

## VS Code-da işə salın

1. `playdesk-web` qovluğunu VS Code ilə açın (**File → Open Folder**).
2. ASP.NET Core backend-in Visual Studio-da `http://localhost:5074` ünvanında işlədiyinə əmin olun.
3. VS Code terminalında yazın:

```powershell
npm install
npm run dev
```

4. Brauzerdə **http://localhost:5173** açın.
5. Əvvəl yaratdığınız PlayDesk administrator hesabı ilə daxil olun.

> Backend layihəsini silməyin və yenidən yaratmayın. Bu paket yalnız frontend yenilənməsidir.

## Nələr yenilənib?

- Qaranlıq nordik/fantastik motivli **orijinal** fon illüstrasiyası (lokal WebP asset).
- Tam yenilənmiş premium login ekranı.
- Cinematic arena dashboard, KPI kartları və maliyyə qrafiklərinin rəng sistemi.
- Animasiya ilə hərəkət edən sidebar, aktiv menyu vurğusu, səhifə keçidləri.
- Masa kartları, status effektləri, hover və düymə basılma animasiyaları.
- Modal giriş/çıxış animasiyaları, Escape ilə bağlama, overlay fon.
- Mobil/tablet/desktop adaptiv dizayn və `prefers-reduced-motion` dəstəyi.
- SignalR bağlantısı üçün status indikatoru: bağlı / yenidən qoşulur / offline.

## İşlək funksiyalar qorunub

- Login / logout və CSRF token axını.
- Müştərilərin yaradılması və axtarışı.
- Masalara canlı baxış, sessiya açmaq, ödənişi təsdiqləmək.
- Sessiyalar, gəlir hesabatları, qrafiklər, admin tənzimləmələri.
- Mövcud Vite proxy: `/api` və `/hubs` → `http://localhost:5074`.

## Komandalar

```powershell
npm run dev
npm run build
npm test
```

## Vacib qeydlər

- `.env` faylı və əlavə API konfiqurasiyası tələb olunmur — lokal proxy artıq qurulub.
- Yeni backend, migration və database dəyişiklikləri **yoxdur**.
- Bütün vizual illüstrasiyalar orijinaldır, başqa oyunun loqosu/artwork-u kopyalanmayıb.
- Bu mühitdə paket registry-si əlçatmaz olduğuna görə `npm install`/`npm run build` burada tamamlanmadı. TypeScript/TSX sintaksisi, lokal importlar və CSS strukturu yoxlanılıb; **tam runtime yoxlanışı istifadəçinin kompüterində** aparılmalıdır.
- `npm install` uğursuz olarsa terminalın tam xəta mətnini yoxlayın; Node.js 22 LTS tövsiyə olunur.

## Fayllar

- `src/App.tsx` — layout, sidebar, login, səhifə keçidləri, SignalR statusu.
- `src/styles.premium.css` — yeni vizual sistem və responsive qaydalar.
- `src/components/UI.tsx` — premium kartlar, başlıqlar, modallar.
- `src/pages/DashboardPage.tsx` — cinematic dashboard hero.
- `src/pages/TablesPage.tsx` — arena kart animasiyaları.
- `public/assets/nordic-arena.webp` — lokal orijinal ilustrasiya.

**PlayDesk / Ragnarok Edition · UI redesign only.**
