@echo off
echo Iniciando servidor local...
echo Acesse: http://localhost:8080
echo.
echo Pressione Ctrl+C para parar.
echo.
python -m http.server 8080
pause
