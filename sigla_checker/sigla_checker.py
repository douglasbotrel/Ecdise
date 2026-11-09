#!/usr/bin/env python3
"""
sigla_checker.py
================
Consulta automática de processos ambientais no SIGLA (SEMA-MA).
Roda diariamente via Agendador de Tarefas do Windows.

Fluxo:
  1. Busca na API Ecdise os projetos em acompanhamento com credenciais SIGLA
  2. Confere se o SIGLA está no ar (se não estiver, encerra sem gerar erros)
  3. Para cada projeto: faz login no SIGLA com o CPF do cliente, CONFERE se o
     login entrou, navega até a lista de requerimentos, encontra a linha pelo
     Nº do processo (percorrendo as páginas da lista) e lê o status + ícone
     (Em exigência ⚠️ ou Sem pendências ✅)
  4. Envia o resultado de volta para a API Ecdise
  5. Se o status mudou, a API gera notificação automática no sistema

Quando algo falha, o print e o HTML da tela ficam em sigla_checker/falhas/
— é exatamente o que o robô estava vendo naquele momento.

Uso:
  py sigla_checker.py                 # verifica todos e grava no Ecdise
  py sigla_checker.py --teste         # verifica todos, NÃO grava nada no Ecdise
  py sigla_checker.py --ver           # abre o navegador na tela (depuração)
  py sigla_checker.py --id <ID>       # só um projeto
"""

import os
import re
import sys
import time
import logging
import argparse
from pathlib import Path
from datetime import datetime

import requests
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

# ──────────────────────────────────────────────
# Configuração
# ──────────────────────────────────────────────
PASTA = Path(__file__).resolve().parent
load_dotenv(PASTA / '.env')

ECDISE_API_URL  = os.getenv('ECDISE_API_URL', 'https://ecdise.vercel.app').rstrip('/')
SIGLA_BOT_TOKEN = os.getenv('SIGLA_BOT_TOKEN', '')
SIGLA_BASE_URL  = 'https://sigla.sema.ma.gov.br/sigla/'
HEADLESS        = os.getenv('HEADLESS', 'true').lower() == 'true'
LOG_FILE        = os.getenv('LOG_FILE', 'sigla_checker.log')
PASTA_FALHAS    = PASTA / 'falhas'

TENTATIVAS_POR_PROJETO = 2   # 1ª tentativa + 1 nova tentativa em caso de falha do site
PAUSA_ENTRE_TENTATIVAS = 10  # segundos
LIMITE_FALHAS_SEGUIDAS = 3   # falhas de site seguidas → SIGLA instável, encerra a rodada
MAX_PAGINAS_LISTA      = 20

# Console do Windows não aceita emoji por padrão — evita erro de encoding no log
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

_log_path = Path(LOG_FILE)
if not _log_path.is_absolute():
    _log_path = PASTA / _log_path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler(_log_path, encoding='utf-8'),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)


class LoginRecusado(Exception):
    """O SIGLA recusou o CPF/senha. Não adianta tentar de novo (e pode bloquear a conta)."""


class ProcessoNaoEncontrado(Exception):
    """Entrou e leu a lista, mas o Nº do processo não está lá (dado do Ecdise a conferir)."""


class SiglaIndisponivel(Exception):
    """O SIGLA não respondeu (fora do ar, lento demais)."""


# ──────────────────────────────────────────────
# Mapeamento tipo de serviço → função de navegação
# Chave: substring do tipoServico no Ecdise (lower-case)
# Só é usado quando o projeto NÃO tem o "Caminho de verificação no SIGLA"
# definido no Ecdise (o recomendado é sempre definir).
# ──────────────────────────────────────────────
TIPO_SERVICO_MAP = {
    # ⚠️ ORDEM IMPORTA: chaves mais específicas primeiro ('laur' antes de 'lau',
    # 'luar' antes de 'lar' — "regularização" contém 'lar').
    'laur':          'recursos_florestais',
    'luar':          'recursos_florestais',
    'florestal':     'recursos_florestais',
    'floresta':      'recursos_florestais',

    'hidrico':       'recursos_hidricos',
    'hídrico':       'recursos_hidricos',
    'hidrica':       'recursos_hidricos',
    'hídrica':       'recursos_hidricos',
    'outorga':       'recursos_hidricos',
    'osi':           'recursos_hidricos',
    'inexigibilidade': 'recursos_hidricos',

    'licenciamento': 'licenciamento_ambiental',
    'lar':           'licenciamento_ambiental',
    'lau':           'licenciamento_ambiental',
    'urbana':        'licenciamento_ambiental',
}


def detectar_tipo(tipo_servico: str) -> str:
    ts = (tipo_servico or '').lower()
    for chave, funcao in TIPO_SERVICO_MAP.items():
        if chave in ts:
            return funcao
    return 'licenciamento_ambiental'  # fallback


# ──────────────────────────────────────────────
# API Ecdise
# ──────────────────────────────────────────────

def _headers():
    return {
        'Authorization': f'Bearer {SIGLA_BOT_TOKEN}',
        'Content-Type':  'application/json',
    }


def buscar_projetos() -> list:
    url = f'{ECDISE_API_URL}/api/sigla/projetos'
    for tentativa in range(1, 4):
        try:
            resp = requests.get(url, headers=_headers(), timeout=30)
            resp.raise_for_status()
            projetos = resp.json().get('projetos', [])
            log.info(f'{len(projetos)} projeto(s) para verificar.')
            return projetos
        except Exception as e:
            log.error(f'Erro ao buscar projetos da API Ecdise (tentativa {tentativa}/3): {e}')
            time.sleep(10)
    return []


def enviar_status(projeto_id: str, protocolo: str, status_novo: str | None,
                  erro: str | None = None, teste: bool = False):
    if teste:
        log.info('  (modo teste — nada foi gravado no Ecdise)')
        return
    url  = f'{ECDISE_API_URL}/api/sigla/status'
    body = {'projetoId': projeto_id, 'protocolo': protocolo, 'statusNovo': status_novo, 'erro': erro}
    try:
        resp = requests.post(url, headers=_headers(), json=body, timeout=30)
        resp.raise_for_status()
        r = resp.json()
        if status_novo is None:
            log.info(f'  ✔ Erro registrado no Ecdise (status anterior mantido: "{r.get("statusAnterior")}")')
        elif r.get('mudou'):
            log.info(f'  ✔ Status mudou: "{r["statusAnterior"]}" → "{r["statusNovo"]}"')
        else:
            log.info(f'  ✔ Status inalterado: "{status_novo}"')
    except Exception as e:
        log.error(f'  ✖ Erro ao enviar status para Ecdise: {e}')


# ──────────────────────────────────────────────
# Evidências de falha (print + HTML da tela)
# ──────────────────────────────────────────────

def salvar_evidencia(page, codigo: str, motivo: str):
    try:
        PASTA_FALHAS.mkdir(exist_ok=True)
        nome = f'{datetime.now():%Y-%m-%d_%H%M%S}_{re.sub(r"[^A-Za-z0-9_-]", "", codigo)}'
        page.screenshot(path=str(PASTA_FALHAS / f'{nome}.png'), full_page=True)
        (PASTA_FALHAS / f'{nome}.html').write_text(
            f'<!-- {motivo} | URL: {page.url} -->\n' + page.content(), encoding='utf-8')
        log.info(f'  → Print da tela salvo em falhas\\{nome}.png')
    except Exception as e:
        log.warning(f'  → Não foi possível salvar o print da falha: {e}')


# ──────────────────────────────────────────────
# Menu do SIGLA
# ──────────────────────────────────────────────

def menu(page, nome: str):
    """
    Item do menu SIGLA. O codegen ora grava como 'cell' ora como 'row'
    dependendo do clique — aceita qualquer um dos dois.
    """
    return (page.get_by_role('cell', name=nome, exact=True)
                .or_(page.get_by_role('row', name=nome, exact=True))
                .first)


def clicar_menu(page, nome: str):
    item = menu(page, nome)
    try:
        item.wait_for(state='visible', timeout=20_000)
    except PlaywrightTimeout:
        raise Exception(f'Item de menu "{nome}" não apareceu na tela')
    item.click()
    page.wait_for_load_state('domcontentloaded', timeout=15_000)


# ──────────────────────────────────────────────
# Login / Logout
# ──────────────────────────────────────────────

def abrir_sigla(page):
    try:
        page.goto(SIGLA_BASE_URL, wait_until='domcontentloaded', timeout=60_000)
    except Exception as e:
        raise SiglaIndisponivel(f'SIGLA não abriu: {str(e).splitlines()[0]}')


def ler_mensagens_da_tela(page) -> str:
    """Junta as mensagens de erro/aviso visíveis (ex: 'Senha inválida')."""
    textos = []
    seletor = ('.rf-msgs, .rf-msg, .rf-msgs-sum, .rf-msgs-det, .ui-messages, '
               '[class*="erro"], [class*="error"], [class*="msg"]')
    try:
        for el in page.locator(seletor).all()[:10]:
            if el.is_visible():
                t = ' '.join(el.inner_text().split())
                if t and t not in textos:
                    textos.append(t)
    except Exception:
        pass
    return ' / '.join(textos)[:300]


def fazer_login(page, login: str, senha: str):
    """
    Login com CPF + senha via Módulo Empreendedor.

    ⚠️ Histórico:
      - 2026-07: a página inicial tem outra caixa de login ("Acesso à área
        restrita"). O caminho certo é clicar em "Módulo Empreendedor" primeiro.
      - 2026-08: o prefixo dos IDs (j_idt37, j_idt41...) é gerado pelo JSF e
        muda sozinho. Por isso usamos "termina com" (:cpf, :senha).
      - 2026-11: a tela do Empreendedor passou a ter DOIS campos terminando em
        ":cpf" (j_idt41:cpf e j_idt53:cpf, de formulários diferentes). O
        Playwright se recusava a preencher ("strict mode violation"). Agora
        procuramos o CPF só dentro do formulário que também tem o campo senha.
    """
    log.info('  → Abrindo SIGLA...')
    abrir_sigla(page)

    try:
        page.get_by_role('cell', name='Módulo Empreendedor', exact=True).click(timeout=30_000)
    except PlaywrightTimeout:
        raise SiglaIndisponivel('Botão "Módulo Empreendedor" não apareceu (site lento ou mudou)')

    form = page.locator('form').filter(has=page.locator('[id$=":senha"]')).first
    try:
        form.wait_for(state='visible', timeout=30_000)
    except PlaywrightTimeout:
        raise SiglaIndisponivel('Formulário de login do Empreendedor não apareceu')

    # ⚠️ 2026-11: o clique em "Módulo Empreendedor" remonta a tela por AJAX.
    # Se preenchermos antes disso terminar, os campos são trocados por novos
    # (vazios) e o SIGLA responde "CPF: o valor é necessário". Por isso: espera
    # a tela assentar, preenche e CONFERE que os valores ficaram nos campos.
    try:
        page.wait_for_load_state('networkidle', timeout=15_000)
    except PlaywrightTimeout:
        pass
    campo_cpf   = form.locator('input[name$=":cpf"]').first
    campo_senha = form.locator('[id$=":senha"]').first
    so_digitos  = lambda s: re.sub(r'\D', '', s or '')
    for _ in range(4):
        campo_cpf.fill(login)
        campo_senha.fill(senha)
        time.sleep(1)
        if so_digitos(campo_cpf.input_value()) == so_digitos(login) and campo_senha.input_value() == senha:
            break
    else:
        raise Exception('Não foi possível preencher CPF/senha (a tela de login ficou se remontando)')
    form.get_by_role('button', name='Acessar').click()

    # Confere se entrou de verdade: o menu "Requerimentos" só existe na área logada.
    try:
        menu(page, 'Requerimentos').wait_for(state='visible', timeout=30_000)
    except PlaywrightTimeout:
        mensagem = ler_mensagens_da_tela(page)
        ainda_no_login = False
        try:
            ainda_no_login = page.locator('[id$=":senha"]').first.is_visible()
        except Exception:
            pass
        if ainda_no_login and 'valor é necessário' in mensagem:
            # Campos chegaram vazios no SIGLA — falha do robô, não da senha: pode tentar de novo
            raise Exception(f'O SIGLA recebeu o login vazio ({mensagem})')
        if ainda_no_login:
            raise LoginRecusado('Login recusado pelo SIGLA'
                                + (f': {mensagem}' if mensagem else ' (continuou na tela de login)')
                                + ' — confira CPF/senha do cliente no Ecdise')
        raise Exception('Após o login, o menu "Requerimentos" não apareceu'
                        + (f' — mensagem na tela: {mensagem}' if mensagem else ''))

    # O menu pode terminar de montar por AJAX depois do carregamento
    try:
        page.wait_for_load_state('networkidle', timeout=10_000)
    except PlaywrightTimeout:
        pass
    log.info('  → Login OK (área do Empreendedor aberta).')


def fazer_logout(page):
    try:
        menu(page, 'Sair').click(timeout=5_000)
        page.wait_for_load_state('domcontentloaded', timeout=10_000)
    except Exception:
        pass  # Logout é opcional — o contexto do navegador é descartado de qualquer jeito


# ──────────────────────────────────────────────
# Leitura da tabela de requerimentos
# ──────────────────────────────────────────────

def extrair_status_da_linha(row, termo: str) -> str | None:
    """
    Dado um elemento <tr> e o termo buscado, extrai o texto de status e o ícone.
    Retorna a string de resultado ou None se a linha não contiver o termo.
    """
    row_text = row.inner_text()
    if termo not in row_text:
        return None

    cells = row.locator('td').all()
    if len(cells) < 2:
        return None

    # Procura a célula com o número do processo e pega o status (coluna anterior)
    status_texto = ''
    for i, cell in enumerate(cells):
        if termo in cell.inner_text().strip():
            if i >= 1:
                status_texto = cells[i - 1].inner_text().strip()
            break

    # Fallback: 4ª coluna (posição mais comum do Status)
    if not status_texto and len(cells) > 3:
        status_texto = cells[3].inner_text().strip()

    em_exigencia = row.get_by_role('img', name='Em exigência').count() > 0
    return f'{status_texto} | {"🔴 Em exigência" if em_exigencia else "✅ Sem pendências"}'


def _procurar_na_pagina(page, termos: list[str]) -> tuple[str | None, list]:
    rows = page.locator('tr:has(td.rf-dt-c)').all()
    for termo in termos:
        for row in rows:
            resultado = extrair_status_da_linha(row, termo)
            if resultado is not None:
                if termo != termos[0]:
                    log.info(f'  → Encontrado via busca parcial ("{termo}")')
                return resultado, rows
    return None, rows


def _proxima_pagina(page) -> bool:
    """Avança a paginação da tabela (RichFaces). Retorna False se não houver próxima."""
    botao = page.locator('.rf-ds-btn-next:not(.rf-ds-dis)').first
    if botao.count() == 0:
        return False
    primeira_antes = page.locator('tr:has(td.rf-dt-c)').first.inner_text()
    botao.click()
    # A troca de página é AJAX — espera o conteúdo da tabela mudar
    for _ in range(40):
        time.sleep(0.25)
        try:
            if page.locator('tr:has(td.rf-dt-c)').first.inner_text() != primeira_antes:
                return True
        except Exception:
            pass
    return False


def extrair_status_da_lista(page, num_processo: str) -> str:
    """
    Lê a tabela de requerimentos e encontra a linha pelo Nº do processo.

    Estratégia de busca (em ordem):
      1. Número completo: ex "25110049202/2025"
      2. Sem sufixo /ANO: ex "25110049202"  (fallback se SIGLA omite o ano)
    Se a lista tiver várias páginas, percorre todas.

    Lógica de ícone (validada em 2026-07):
      - Ícone vermelho, alt="Em exigência" → pendência aberta
      - Ícone verde (qualquer outro alt)   → sem pendências
    """
    # Espera a tabela de RESULTADOS (classe rf-dt-c), não o menu (que também é tabela).
    try:
        # state='attached': a linha "sem dados" (rf-dt-nd) existe mas fica invisível (altura zero)
        page.wait_for_selector('td.rf-dt-c, .rf-dt-nd', state='attached', timeout=20_000)
    except PlaywrightTimeout:
        raise Exception('Tabela de requerimentos não carregou (site lento)')
    if page.locator('td.rf-dt-c').count() == 0:
        raise ProcessoNaoEncontrado('A lista de requerimentos desta seção está vazia para este CPF')

    num_completo = num_processo.strip()
    num_base     = num_completo.split('/')[0].strip()
    termos       = [num_completo] + ([num_base] if num_base and num_base != num_completo else [])

    rows = []
    for pagina in range(1, MAX_PAGINAS_LISTA + 1):
        resultado, rows = _procurar_na_pagina(page, termos)
        if resultado is not None:
            if pagina > 1:
                log.info(f'  → Encontrado na página {pagina} da lista')
            log.info(f'  → Resultado: {resultado}')
            return resultado
        if not _proxima_pagina(page):
            break

    log.warning(f'  → Processo não encontrado. {len(rows)} linha(s) na última página lida:')
    for row in rows[:8]:
        texto = row.inner_text().strip().replace('\n', ' | ').replace('\t', ' ')
        if texto:
            log.warning(f'      {texto[:120]}')

    raise ProcessoNaoEncontrado(
        f'Nº do processo "{num_processo}" não encontrado na lista de requerimentos. '
        f'Confira o número e o "Caminho de verificação no SIGLA" cadastrados no Ecdise.'
    )


# ──────────────────────────────────────────────
# Caminhos de navegação por tipo de serviço
# ──────────────────────────────────────────────

def navegar_licenciamento_ambiental(page, num_processo: str) -> str:
    """Requerimentos → Licenciamento ambiental → Listar requerimentos (LAU, LAR...)"""
    clicar_menu(page, 'Requerimentos')
    clicar_menu(page, 'Licenciamento ambiental')
    clicar_menu(page, 'Listar requerimentos')
    return extrair_status_da_lista(page, num_processo)


def navegar_recursos_florestais(page, num_processo: str) -> str:
    """Requerimentos → Recursos florestais → Listar (LAUR, LUAR...)"""
    clicar_menu(page, 'Requerimentos')
    clicar_menu(page, 'Recursos florestais')
    clicar_menu(page, 'Listar')
    return extrair_status_da_lista(page, num_processo)


def navegar_recursos_hidricos(page, num_processo: str) -> str:
    """Requerimentos → Recursos hídricos → Listar (Outorga, OSI, Inexigibilidade)"""
    clicar_menu(page, 'Requerimentos')
    clicar_menu(page, 'Recursos hídricos')
    clicar_menu(page, 'Listar')
    return extrair_status_da_lista(page, num_processo)


NAVEGADORES = {
    'licenciamento_ambiental': navegar_licenciamento_ambiental,
    'recursos_florestais':     navegar_recursos_florestais,
    'recursos_hidricos':       navegar_recursos_hidricos,
}


# ──────────────────────────────────────────────
# Consulta completa de um projeto
# ──────────────────────────────────────────────

def secoes_a_verificar(projeto: dict) -> tuple[list[str], bool]:
    """
    Seções do SIGLA onde procurar o processo.
    Com o "Caminho de verificação no SIGLA" definido no Ecdise → só aquela.
    Sem ele → a seção adivinhada pelo tipo de serviço primeiro e, se o processo
    não estiver lá, as outras duas.
    """
    caminho_explicito = (projeto.get('caminhoSIGLA') or '').strip()
    if caminho_explicito in NAVEGADORES:
        return [caminho_explicito], True
    palpite = detectar_tipo(projeto.get('tipoServico', ''))
    return [palpite] + [s for s in NAVEGADORES if s != palpite], False


def consultar_secao(page, projeto: dict, secao: str) -> str:
    fazer_login(page, projeto['login'], projeto['senha'])
    log.info(f'  → Seção: {secao}')
    status = NAVEGADORES[secao](page, projeto['protocolo'])
    fazer_logout(page)
    return status


def verificar_projeto(browser, proj: dict) -> tuple[str | None, str | None, bool]:
    """
    Retorna (status, erro, cadastro_a_conferir).
    cadastro_a_conferir=True quando o problema é do cadastro do cliente
    (senha recusada / processo não encontrado), não do site.
    """
    secoes, explicito = secoes_a_verificar(proj)
    if not explicito:
        log.info(f'  → Sem "Caminho de verificação no SIGLA" no Ecdise — tipo "{proj.get("tipoServico", "")}", '
                 f'vou procurar em: {", ".join(secoes)}')

    nao_encontrado = []
    for secao in secoes:
        erro = None
        for tentativa in range(1, TENTATIVAS_POR_PROJETO + 1):
            context = novo_contexto(browser)  # credenciais próprias → contexto isolado
            page = context.new_page()
            try:
                status = consultar_secao(page, proj, secao)
                if not explicito:
                    log.info(f'  → Dica: defina o "Caminho de verificação no SIGLA" deste projeto como '
                             f'"{secao}" no Ecdise para a consulta ficar mais rápida.')
                return status, None, False
            except LoginRecusado as e:
                # Não insiste: senha errada repetida pode até bloquear a conta
                salvar_evidencia(page, proj['codigo'], str(e))
                return None, str(e), True
            except ProcessoNaoEncontrado as e:
                nao_encontrado.append(f'{secao}: {e}')
                if explicito:
                    salvar_evidencia(page, proj['codigo'], str(e))
                break  # próxima seção
            except Exception as e:
                erro = str(e).split('\nCall log:')[0].strip()
                log.warning(f'  ✖ Tentativa {tentativa}/{TENTATIVAS_POR_PROJETO} ({secao}): {erro}')
                salvar_evidencia(page, proj['codigo'], erro)
                if tentativa < TENTATIVAS_POR_PROJETO:
                    time.sleep(PAUSA_ENTRE_TENTATIVAS)
            finally:
                context.close()
        if erro:
            return None, erro, False  # site falhou nesta seção mesmo após nova tentativa

    if explicito:
        return None, nao_encontrado[0].split(': ', 1)[1], True
    return None, (f'Nº do processo "{proj["protocolo"]}" não foi encontrado em nenhuma seção do SIGLA '
                  f'({len(secoes)} verificadas). Confira o número cadastrado no Ecdise.'), True


def novo_contexto(browser):
    return browser.new_context(
        user_agent=('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                    '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'),
        locale='pt-BR',
        timezone_id='America/Fortaleza',
    )


def sigla_no_ar(browser) -> bool:
    """Confere, antes de começar, se a página pública do SIGLA abre."""
    for tentativa in range(1, 4):
        context = novo_contexto(browser)
        page = context.new_page()
        try:
            abrir_sigla(page)
            page.get_by_role('cell', name='Módulo Empreendedor', exact=True).wait_for(timeout=30_000)
            return True
        except Exception as e:
            log.warning(f'SIGLA não respondeu (tentativa {tentativa}/3): {str(e).splitlines()[0]}')
            time.sleep(30)
        finally:
            context.close()
    return False


# ──────────────────────────────────────────────
# Execução principal
# ──────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Consulta automática de processos no SIGLA-SEMA/MA')
    parser.add_argument('--id', metavar='PROJETO_ID',
                        help='Verifica só estes projetos: ID ou código (ex: PRJ-0005), separados por vírgula.')
    parser.add_argument('--teste', action='store_true',
                        help='Verifica normalmente, mas NÃO grava nada no Ecdise.')
    parser.add_argument('--ver', action='store_true',
                        help='Mostra o navegador na tela (para acompanhar/depurar).')
    args = parser.parse_args()

    if not SIGLA_BOT_TOKEN:
        log.error('SIGLA_BOT_TOKEN não definido no .env — abortando.')
        sys.exit(1)

    inicio = datetime.now()
    log.info(f'=== Início — {inicio:%d/%m/%Y %H:%M}' + (' (MODO TESTE)' if args.teste else '') + ' ===')

    projetos = buscar_projetos()
    if not projetos:
        log.info('Nenhum projeto para consultar. Verifique se há projetos com emAcompanhamento=true '
                 'e credenciais SIGLA preenchidas (ou se a API do Ecdise respondeu).')
        return

    if args.id:
        alvos = {a.strip() for a in args.id.split(',')}
        projetos = [p for p in projetos if p['id'] in alvos or p['codigo'] in alvos]
        if not projetos:
            log.error(f'Projeto {args.id} não encontrado ou não está em acompanhamento.')
            sys.exit(1)

    sucesso = falha = nao_verificados = 0
    falhas_de_site_seguidas = 0

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=HEADLESS and not args.ver,
                                     slow_mo=300 if args.ver else 0)

        if not sigla_no_ar(browser):
            log.error('=== SIGLA fora do ar ou sem resposta — rodada cancelada, nada foi alterado no Ecdise. '
                      'Tente de novo mais tarde. ===')
            browser.close()
            sys.exit(2)

        for n, proj in enumerate(projetos):
            projeto_id = proj['id']
            protocolo  = proj['protocolo']
            log.info(f'--- [{proj["codigo"]}] {proj.get("cliente", "")} | Processo: {protocolo} ---')

            status, erro, cadastro_a_conferir = verificar_projeto(browser, proj)

            if status is not None:
                enviar_status(projeto_id, protocolo, status, teste=args.teste)
                sucesso += 1
                falhas_de_site_seguidas = 0
                continue

            log.error(f'  ✖ {erro}')
            enviar_status(projeto_id, protocolo, None, erro=erro, teste=args.teste)
            falha += 1

            # Login recusado / processo não encontrado é problema daquele cliente, não do site.
            if cadastro_a_conferir:
                falhas_de_site_seguidas = 0
            else:
                falhas_de_site_seguidas += 1

            if falhas_de_site_seguidas >= LIMITE_FALHAS_SEGUIDAS:
                nao_verificados = len(projetos) - (n + 1)
                if nao_verificados:
                    log.error(f'=== {LIMITE_FALHAS_SEGUIDAS} falhas seguidas no mesmo tipo de passo — o SIGLA '
                              f'parece instável. {nao_verificados} projeto(s) ficaram para a próxima rodada. '
                              f'Veja os prints em sigla_checker\\falhas. ===')
                break

        browser.close()

    duracao = (datetime.now() - inicio).seconds
    extra = f', {nao_verificados} não verificado(s)' if nao_verificados else ''
    log.info(f'=== Fim — {sucesso} OK, {falha} erro(s){extra}, {duracao}s ===')
    if falha or nao_verificados:
        sys.exit(1)


if __name__ == '__main__':
    main()
