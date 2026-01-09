@echo off
REM Скрипт запуска WeatherTgBot (Telegram бот, бэкенд, фронтенд)
REM Использование: start.bat

echo ========================================
echo   WeatherTgBot - Запуск всех сервисов
echo ========================================
echo.

REM Проверка наличия pnpm
where pnpm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Ошибка: pnpm не найден. Установите pnpm: npm install -g pnpm
    pause
    exit /b 1
)

REM Проверка наличия .env файла
if not exist "packages\backend\.env" if not exist ".env" (
    echo Предупреждение: Файл .env не найден. Убедитесь, что он настроен.
)

REM Проверка и генерация Prisma клиента
echo [1/4] Проверка Prisma клиента...
set PRISMA_FOUND=0
for /d %%d in ("node_modules\.pnpm\@prisma+client*") do (
    if exist "%%d\node_modules\@prisma\client\index.js" (
        set PRISMA_FOUND=1
        goto :prisma_check_done
    )
)
:prisma_check_done
if %PRISMA_FOUND%==0 (
    echo   Prisma клиент не найден. Генерация...
    cd packages\backend
    call pnpm prisma:generate
    if errorlevel 1 (
        echo Ошибка: Не удалось сгенерировать Prisma клиент.
        cd ..\..
        pause
        exit /b 1
    )
    cd ..\..
    echo   Prisma клиент успешно сгенерирован.
) else (
    echo   Prisma клиент найден.
)

REM Проверка и создание базы данных
echo [2/4] Проверка базы данных...
if not exist "packages\backend\prisma\*.db" (
    echo   База данных не найдена. Выполнение миграций...
    cd packages\backend
    REM Устанавливаем DATABASE_URL по умолчанию, если не задан
    if "%DATABASE_URL%"=="" set DATABASE_URL=file:./prisma/dev.db
    call pnpm prisma migrate deploy
    if errorlevel 1 (
        echo   Попытка выполнить dev миграции...
        call pnpm prisma migrate dev --name init
        if errorlevel 1 (
            echo Ошибка: Не удалось выполнить миграции базы данных.
            cd ..\..
            pause
            exit /b 1
        )
    )
    cd ..\..
    echo   База данных успешно создана.
) else (
    echo   База данных найдена.
)

echo.
echo Запуск компонентов...
echo.

REM Запуск Telegram бота (бэкенд) в новом окне
echo [3/4] Запуск Telegram бота (бэкенд)...
start "Telegram Bot (Backend)" cmd /k "cd /d %~dp0packages\backend && pnpm dev"

timeout /t 2 /nobreak >nul

REM Запуск фронтенда (Mini App) в новом окне
echo [4/4] Запуск фронтенда (Mini App)...
start "Frontend (Mini App)" cmd /k "cd /d %~dp0apps\miniapp && pnpm dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo   Все сервисы запущены!
echo ========================================
echo.
echo Компоненты:
echo   • Telegram бот (бэкенд): запущен
echo   • Фронтенд (Mini App): запущен
echo.
echo Для остановки закройте окна командной строки
echo.
pause

