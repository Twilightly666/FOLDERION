@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title FOLDERION - збірка інсталятора

set "APP_NAME=FOLDERION"
set "VENV=%~dp0.venv-build"
set "VPY=%VENV%\Scripts\python.exe"

for %%F in (main.py index.html script.js style.css installer.iss) do (
    if not exist "%%F" (
        echo [ПОМИЛКА] Не знайдено файл %%F поруч із цим батником.
        goto fail
    )
)

set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY (
    echo [ПОМИЛКА] Python не знайдено. Встановіть Python 3.10-3.13 з python.org і позначте "Add python.exe to PATH".
    goto fail
)
%PY% -c "import sys; raise SystemExit(sys.version_info < (3, 9))" >nul 2>&1
if errorlevel 1 (
    echo [ПОМИЛКА] Потрібен справжній Python 3.9 або новіший.
    goto fail
)

if not exist "%VPY%" (
    echo [1/4] Створюю віртуальне середовище...
    %PY% -m venv "%VENV%"
    if errorlevel 1 goto fail
)

echo [2/4] Встановлюю залежності...
"%VPY%" -m pip install --upgrade pip >nul 2>&1
"%VPY%" -m pip install --upgrade pyinstaller pywebview
if errorlevel 1 goto fail
"%VPY%" -m pip install --upgrade py7zr
if errorlevel 1 echo [УВАГА] py7zr не встановився. Формат 7z працюватиме лише за наявності 7-Zip у системі.

echo [3/4] Збираю %APP_NAME%.exe...
if exist build rmdir /s /q build
if exist dist rmdir /s /q dist
if exist %APP_NAME%.spec del /q %APP_NAME%.spec

set "ICON_ARG="
if exist "app.ico" set "ICON_ARG=--icon app.ico"
set "EXTRA="
"%VPY%" -c "import py7zr" >nul 2>&1
if not errorlevel 1 set "EXTRA=--collect-all py7zr"

"%VPY%" -m PyInstaller --noconfirm --clean --onedir --windowed --name %APP_NAME% %ICON_ARG% %EXTRA% ^
    --add-data "index.html;." --add-data "script.js;." --add-data "style.css;." ^
    --collect-all webview --collect-all pythonnet --collect-all clr_loader ^
    main.py
if errorlevel 1 goto fail
if not exist "dist\%APP_NAME%\%APP_NAME%.exe" goto fail

echo.
echo Програму зібрано: dist\%APP_NAME%\%APP_NAME%.exe
echo.
echo [4/4] Збираю інсталятор Inno Setup...

set "ISCC="
if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"
if exist "%LocalAppData%\Programs\Inno Setup 6\ISCC.exe" set "ISCC=%LocalAppData%\Programs\Inno Setup 6\ISCC.exe"
if not defined ISCC (
    echo [УВАГА] Inno Setup 6 не знайдено, інсталятор не створено.
    echo Встановіть його з jrsoftware.org/isdl.php і запустіть цей батник ще раз.
    echo Готову програму без інсталятора можна взяти в папці dist\%APP_NAME%.
    goto done
)

"%ISCC%" "installer.iss"
if errorlevel 1 goto fail

echo.
echo Готово. Інсталятор лежить у папці installer.
goto done

:fail
echo.
echo [ПОМИЛКА] Збірку перервано. Подивіться повідомлення вище.
pause
exit /b 1

:done
echo.
pause
exit /b 0
