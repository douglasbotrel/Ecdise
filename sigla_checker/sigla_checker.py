#!/usr/bin/env python3
"""
sigla_checker.py
================
Consulta automática de processos ambientais no SIGLA (SEMA-MA).
Roda diariamente (via Agendador de Tarefas do Windows ou cron).

Fluxo:
  1. Busca na API Ecdise os projetos em acompanhamento com credenciais SIGLA
  2. Para cada projeto: faz login no SIGLA, navega até o processo, extrai o status
  3. Envia o resultado de volta para a API Ecdise
  4. Se o status mudou, a API cria uma notificação automática no sistema

Configuração:
  Copie .env.example para .env e preencha as variáveis.
"""

import os
import sys
import json
import logging
import requests
from datetime import datetime
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# ──────────────────────────────────────────────
# Configuração
# ──────────────────────────────────────────────
load_dotenv()

ECDISE_API_URL  = os.getenv('ECDISE_API_URL', 'https://ecdise.vercel.app')
SIGLA_BOT_TOKEN = os.getenv('SIGLA_BOT_TOKEN', '')
SIGLA_BASE_URL  = 'https://sigla.sema.ma.gov.br/sigla'
HEADLESS        = os.getenv('HEADLESS', 'true').lower() == 'true'
LOG_FILE        = os.getenv('LOG_FILE', 'sigla_checker.log')

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ──────────────────────────────────────────────
# Helpers de API Ecdise
# ──────────────────────────────────────────────

def _headers():
    return {
        'Authorization': f'Bearer {SIGLA_BOT_TOKEN}',
        'Content-Type':  'application/json',
    }


def buscar_projetos() -> list[dict]:
    """Busca projetos em acompanhamento com credenciais SIGLA."""
    url = f'{ECDISE_API_URL}/api/sigla/projetos'
    try:
        resp = requests.get(url, headers=_headers(), timeout=30)
        resp.raise_for_status()
        data = resp.json()
        projetos = data.get('projetos', [])
        log.info(f'{len(projetos)} projeto(s) para verificar.')
        return projetos
    except Exception as e:
        log.error(f'Erro ao buscar projetos da API Ecdise: {e}')
        return []


def enviar_status(projeto_id: str, protocolo: str, status_novo: str | None, erro: str | None = None):
    """Envia o resultado da consulta para a API Ecdise."""
    url  = f'{ECDISE_API_URL}/api/sigla/status'
    body = {
        'projetoId': projeto_id,
        'protocolo': protocolo,
        'statusNovo': status_novo,
        'erro': erro,
    }
    try:
        resp = requests.post(url, headers=_headers(), json=body, timeout=30)
        resp.raise_for_status()
        resultado = resp.json()
        if resultado.get('mudou'):
            log.info(f'  ✔ Status mudou: "{resultado["statusAnterior"]}" → "{resultado["statusNovo"]}"')
        else:
            log.info(f'  ✔ Status inalterado: "{status_novo}"')
    except Exception as e:
        log.error(f'  ✖ Erro ao enviar status para Ecdise: {e}')

# ──────────────────────────────────────────────
# Consulta no SIGLA via Playwright
# ──────────────────────────────────────────────

def consultar_sigla(page, login: str, senha: str, protocolo: str) -> str:
    """
    Faz login no SIGLA e retorna o status do processo.

    ⚠️  Os seletores abaixo foram definidos com base na estrutura comum de sistemas SEMA.
        Se o SIGLA mudar a interface, ajuste os seletores aqui.
        Use o Playwright Inspector para inspecionar: playwright codegen https://sigla.sema.ma.gov.br/sigla/
    """

    # ── 1. Página de login ──────────────────────────────────────
    log.info(f'  → Navegando para o SIGLA...')
    page.goto(SIGLA_BASE_URL, wait_until='domcontentloaded', timeout=60_000)

    # Aguarda campo de login aparecer
    # Tenta o seletor mais comum primeiro; ajuste se necessário
    try:
        page.wait_for_selector('input[name="username"], input[name="cpf"], #username, #cpf', timeout=15_000)
    except PlaywrightTimeout:
        raise Exception('Página de login não carregou — verifique a URL do SIGLA')

    # Preenche CPF/login
    login_input = page.locator('input[name="username"], input[name="cpf"], #username, #cpf').first
    login_input.fill(login)

    # Preenche senha
    senha_input = page.locator('input[type="password"], input[name="password"], #password, #senha').first
    senha_input.fill(senha)

    # Clica em entrar
    page.locator('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Acessar")').first.click()

    # Aguarda redirecionamento pós-login
    try:
        page.wait_for_url(lambda url: '/sigla/' in url and 'login' not in url.lower(), timeout=20_000)
    except PlaywrightTimeout:
        # Verifica se há mensagem de erro na página
        page_text = page.inner_text('body')
        if 'inválid' in page_text.lower() or 'incorret' in page_text.lower():
            raise Exception(f'Credenciais inválidas para login "{login}"')
        raise Exception('Timeout após tentativa de login')

    log.info(f'  → Login OK. Buscando protocolo {protocolo}...')

    # ── 2. Navegação para consulta de processo ───────────────────
    # Tenta navegar diretamente para a URL de consulta (padrão SEMA-MA)
    # Se não funcionar, faça a navegação pelo menu
    try:
        # Tenta URL direta de consulta por número de processo
        page.goto(f'{SIGLA_BASE_URL}/consultarProcesso', wait_until='domcontentloaded', timeout=15_000)
    except Exception:
        # Alternativa: menu lateral
        page.locator('a:has-text("Consultar"), a:has-text("Processo"), a:has-text("Acompanhar")').first.click()
        page.wait_for_load_state('domcontentloaded', timeout=15_000)

    # ── 3. Preenche número do processo ───────────────────────────
    try:
        page.wait_for_selector('input[name*="processo"], input[name*="protocolo"], input[placeholder*="processo"], input[placeholder*="protocolo"]', timeout=15_000)
    except PlaywrightTimeout:
        raise Exception('Campo de busca de processo não encontrado')

    campo_processo = page.locator(
        'input[name*="processo"], input[name*="protocolo"], input[placeholder*="processo"], input[placeholder*="protocolo"]'
    ).first
    campo_processo.fill(protocolo)

    # Clica em pesquisar/consultar
    page.locator(
        'button:has-text("Pesquisar"), button:has-text("Consultar"), button:has-text("Buscar"), button[type="submit"]'
    ).first.click()

    # Aguarda resultado
    page.wait_for_load_state('domcontentloaded', timeout=20_000)

    # ── 4. Extrai o status/situação ───────────────────────────────
    # Tenta encontrar células de "Situação" / "Status" na tabela de resultados
    status_texto = None

    # Padrão 1: tabela com cabeçalho "Situação"
    situacao_cell = page.locator('td:near(:text("Situação")), td:near(:text("Status")), td:near(:text("Situacao"))').first
    if situacao_cell.is_visible():
        status_texto = situacao_cell.inner_text().strip()

    # Padrão 2: label + valor (formulário de detalhe)
    if not status_texto:
        status_cell = page.locator('span:near(:text("Situação")), span:near(:text("Status"))').first
        if status_cell.is_visible():
            status_texto = status_cell.inner_text().strip()

    # Padrão 3: busca por texto que inclua "Em Análise", "Deferido", etc.
    if not status_texto:
        # Pega o texto completo da página e extrai status por heurística
        body = page.inner_text('body')
        for keyword in ['Em Análise', 'Deferido', 'Indeferido', 'Arquivado', 'Em Vistoria',
                        'Aguardando', 'Complementação', 'Emitido', 'Cancelado', 'Pendente']:
            if keyword.lower() in body.lower():
                status_texto = keyword
                break

    if not status_texto:
        raise Exception('Não foi possível extrair o status do processo na página do SIGLA')

    return status_texto


def fazer_logout(page):
    """Faz logout do SIGLA para não deixar sessão aberta."""
    try:
        page.locator('a:has-text("Sair"), a:has-text("Logout"), button:has-text("Sair")').first.click(timeout=5_000)
        page.wait_for_load_state('domcontentloaded', timeout=10_000)
    except Exception:
        pass  # Logout opcional — não interrompe o fluxo


# ──────────────────────────────────────────────
# Execução principal
# ──────────────────────────────────────────────

def main():
    if not SIGLA_BOT_TOKEN:
        log.error('SIGLA_BOT_TOKEN não definido no .env — abortando.')
        sys.exit(1)

    inicio = datetime.now()
    log.info(f'=== Início da consulta SIGLA — {inicio.strftime("%d/%m/%Y %H:%M")} ===')

    projetos = buscar_projetos()
    if not projetos:
        log.info('Nenhum projeto para consultar.')
        return

    sucesso = 0
    falha   = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=HEADLESS)
        context = browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            locale='pt-BR',
            timezone_id='America/Fortaleza',
        )

        for proj in projetos:
            projeto_id = proj['id']
            protocolo  = proj['protocolo']
            login      = proj['login']
            senha      = proj['senha']
            codigo     = proj['codigo']

            log.info(f'--- Projeto {codigo} | Protocolo: {protocolo} ---')

            page = context.new_page()
            try:
                status = consultar_sigla(page, login, senha, protocolo)
                log.info(f'  ✔ Status obtido: "{status}"')
                enviar_status(projeto_id, protocolo, status)
                sucesso += 1

                # Logout antes de fechar (libera sessão no SIGLA)
                fazer_logout(page)

            except Exception as e:
                erro_msg = str(e)
                log.error(f'  ✖ Erro: {erro_msg}')
                enviar_status(projeto_id, protocolo, None, erro=erro_msg)
                falha += 1

            finally:
                page.close()

        browser.close()

    fim = datetime.now()
    duracao = (fim - inicio).seconds
    log.info(f'=== Fim — {sucesso} OK, {falha} erro(s), {duracao}s ===')


if __name__ == '__main__':
    main()
