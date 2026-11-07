# Publicar as melhorias da auditoria (branch `melhorias-auditoria`)

As mudanças estão na branch `melhorias-auditoria`, **não na `main`**. Um push na
`main` atualiza todos os clientes, então siga a ordem abaixo.

## 1. Antes de qualquer publicação (uma vez por cliente)

1. **Backup do banco** do cliente.
2. **Marcar o banco como migrado** (o build não roda mais `db push`):
   ```bash
   # com a DATABASE_URL do cliente
   npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
   # saída deve vir vazia; então:
   npx prisma migrate resolve --applied 0_baseline
   ```
   Detalhes em `docs/migracoes.md`. Esta branch **não muda o schema**.
3. **Criar a variável `CREDENCIAIS_KEY`** na Vercel (Production e Preview) de cada
   cliente. Gere uma chave diferente por cliente e guarde num cofre de senhas:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Sem a chave o sistema continua funcionando, mas grava as senhas sem criptografia.
4. Depois do deploy, **cifrar as senhas já existentes**:
   ```bash
   # com DATABASE_URL e CREDENCIAIS_KEY do cliente
   node scripts/criptografar-credenciais.ts            # simula
   node scripts/criptografar-credenciais.ts --aplicar  # cifra
   ```

## 2. Testar antes de liberar

1. No VS Code, publique a **branch** (`Publish Branch`), não a `main`.
2. A Vercel cria um *Preview Deployment* para a branch. **Atenção:** confira em
   Settings → Environment Variables qual `DATABASE_URL` o Preview usa. Se for o
   banco real do cliente, os testes mexem em dados reais.
3. Abra um Pull Request da branch para a `main` no GitHub; o CI novo roda
   checagem de tipos e testes.
4. Roteiro mínimo de teste no Preview:
   - Login com "Lembrar meu e-mail"; sessão expirada leva ao login e volta à página.
   - Operacional: abas de status filtram e contadores batem; datas de prazo corretas;
     tarefa atrasada em vermelho; cancelar e reabrir tarefa; atribuição em lote.
   - Comercial: cards do funil não zeram ao clicar; "Carregar mais".
   - Encerramento: encerrar um projeto (some da lista e aparece como concluído no Dashboard).
   - Credenciais: senha aparece mascarada; "Mostrar" revela; editar sem digitar senha mantém a atual.
   - Robô SIGLA continua consultando (usa `/api/sigla/projetos`).
   - Perfis: um analista não abre BI nem Financeiro; financeiro libera Aguardando Sinal.

## 3. Liberar

Faça o merge do Pull Request na `main` só depois dos passos 1 e 2. O workflow
existente vai sincronizar a `demo` com a `main`.

## Mudanças de comportamento que a equipe vai notar

- Avançar etapas agora depende do perfil (ex.: só Financeiro/direção libera o Aguardando Sinal;
  sair do Aguardando Sinal exige pagamento confirmado ou, sem valor de contrato, um motivo).
- Concluir um projeto exige todas as atividades concluídas ou canceladas.
- O menu mostra só os módulos do perfil (configuráveis em Configurações → usuário).
- Anexos em `/uploads` passam a exigir login.

## O que ficou para depois (precisa de decisão ou de trabalho maior)

| Item | Por quê |
|---|---|
| T7 Next.js | A correção dos alertas exige Next 15/16 (mudança grande e incompatível). Fazer numa branch própria com testes. |
| T10 Decimal no financeiro | Muda o tipo dos valores em todo o código; precisa de testes do financeiro antes. |
| T5 Armazenamento de arquivos | Escolher Vercel Blob, S3 ou Google Drive. |
| T11 Revogar sessão no logout / limite de login | Precisa de campo novo no banco e de um armazenamento compartilhado (ex.: Redis). O perfil já é lido do banco a cada requisição. |
| T12 Recuperação de senha | Precisa de serviço de e-mail. |
| O8 Tipo de tarefa / O9 Processo / O10 durações | Mudanças de schema e de Configurações. |
| O14 Alertas de vencimento | Escolher canal (e-mail/WhatsApp) e agendar rotina. |
| P3, P4, P8, P9, O17, O18, U6, U7 | Decisões de produto. |
