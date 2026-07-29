import re
from playwright.sync_api import Playwright, sync_playwright, expect


def run(playwright: Playwright) -> None:
    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()
    page.goto("https://sigla.sema.ma.gov.br/sigla/index.jsf")
    page.get_by_role("cell", name="Módulo Empreendedor", exact=True).click()
    page.locator("input[name=\"j_idt37:cpf\"]").click()
    page.locator("input[name=\"j_idt37:cpf\"]").fill("011.723.613-63")
    page.locator("[id=\"j_idt37:senha\"]").click()
    page.locator("[id=\"j_idt37:senha\"]").fill("20obts7r")
    page.locator("[id=\"j_idt37:senha\"]").press("ControlOrMeta+f")
    page.get_by_role("button", name="Acessar").click()
    page.get_by_role("row", name="Requerimentos", exact=True).click()
    page.get_by_role("cell", name="Recursos florestais", exact=True).click()
    page.get_by_role("cell", name="Listar", exact=True).click()
    page.get_by_role("img", name="Em exigência").click()
    page.get_by_role("cell", name="Módulo Empreendedor", exact=True).click()
    page.locator("input[name=\"j_idt37:cpf\"]").click()
    page.locator("input[name=\"j_idt37:cpf\"]").fill("020.160.983-50")
    page.locator("[id=\"j_idt37:senha\"]").click()
    page.locator("[id=\"j_idt37:senha\"]").fill("s6fd6i5a")
    page.get_by_role("button", name="Acessar").click()
    page.get_by_role("row", name="Requerimentos", exact=True).click()
    page.get_by_role("cell", name="Licenciamento ambiental", exact=True).click()
    page.get_by_role("cell", name="Listar requerimentos", exact=True).click()
    page.get_by_role("img", name="Em tramitação").click()
    page.get_by_role("cell", name="Módulo Empreendedor", exact=True).click()
    page.locator("input[name=\"j_idt37:cpf\"]").click()
    page.locator("input[name=\"j_idt37:cpf\"]").fill("038.034.513-70")
    page.locator("[id=\"j_idt37:senha\"]").click()
    page.locator("[id=\"j_idt37:senha\"]").fill("52qqqkzb")
    page.get_by_role("button", name="Acessar").click()
    page.get_by_role("row", name="Requerimentos", exact=True).click()
    page.get_by_role("cell", name="Recursos hídricos", exact=True).click()
    page.get_by_role("cell", name="Listar", exact=True).click()
    page.get_by_role("img", name="Em exigência").click()

    # ---------------------
    context.close()
    browser.close()


with sync_playwright() as playwright:
    run(playwright)
