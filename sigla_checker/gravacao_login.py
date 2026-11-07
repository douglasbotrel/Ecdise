"""
Script de gravação/teste do login no SIGLA (Módulo Empreendedor).

As credenciais NÃO ficam no código. Defina no arquivo .env (não versionado):
    SIGLA_TESTE_CPF=000.000.000-00
    SIGLA_TESTE_SENHA=...
"""
import os
import sys

from dotenv import load_dotenv
from playwright.sync_api import Playwright, sync_playwright

load_dotenv()

CPF = os.getenv("SIGLA_TESTE_CPF", "")
SENHA = os.getenv("SIGLA_TESTE_SENHA", "")


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://sigla.sema.ma.gov.br/sigla/index.jsf")
    page.get_by_role("cell", name="Módulo Empreendedor", exact=True).click()
    page.locator('[id$=":cpf"]').fill(CPF)
    page.locator('[id$=":senha"]').fill(SENHA)
    page.get_by_role("button", name="Acessar").click()
    page.get_by_role("cell", name="Requerimentos", exact=True).click()

    context.close()
    browser.close()


if __name__ == "__main__":
    if not CPF or not SENHA:
        sys.exit("Defina SIGLA_TESTE_CPF e SIGLA_TESTE_SENHA no .env antes de rodar.")
    with sync_playwright() as playwright:
        run(playwright)
