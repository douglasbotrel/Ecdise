@echo off
REM Executa a consulta automatica do SIGLA (usado pelo Agendador de Tarefas do Windows)
REM O proprio script grava o historico em sigla_checker.log; aqui fica so a saida da ultima execucao.
cd /d "%~dp0"
py sigla_checker.py > ultima_execucao.txt 2>&1
