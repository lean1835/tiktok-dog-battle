@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Can cai Node.js 22 tro len truoc khi chay Tuat Live.
 pause
 exit /b 1
)
node -e "if(Number(process.versions.node.split('.')[0])<22)process.exit(1)"
if errorlevel 1 (
 echo Node.js qua cu. Can Node.js 22 tro len.
 pause
 exit /b 1
)
node -e "for(const name of Object.keys(require('./package.json').dependencies||{}))require.resolve(name);require('./server/app.cjs')" >nul 2>nul
if errorlevel 1 (
 echo Dang cai thu vien theo package-lock.json...
 call npm ci --omit=dev
 if errorlevel 1 (
  echo Cai thu vien that bai. Kiem tra mang roi chay lai.
  pause
  exit /b 1
 )
)
node scripts\launch.cjs
if errorlevel 1 pause
