# Migrações do banco (Prisma)

O build **não altera mais o banco**. Antes ele rodava `prisma db push --accept-data-loss`,
que podia apagar colunas e dados de todos os clientes a cada push na `main`.

Agora as mudanças de schema viram arquivos em `prisma/migrations/` e são aplicadas
de forma explícita com `npm run db:deploy` (`prisma migrate deploy`), que só aplica
migrações novas e nunca descarta dados sem que isso esteja escrito no SQL.

## Uma única vez por banco existente (baseline)

Os bancos atuais já têm as tabelas criadas pelo `db push`. Marque a migração inicial
como aplicada, sem executá-la, em **cada** banco de cliente (e na demo):

```bash
# com DATABASE_URL apontando para o banco do cliente
npx prisma migrate resolve --applied 0_baseline
```

Antes, confira que o banco está igual ao schema da `main` atual:

```bash
npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script
```

A saída deve ser vazia (ou só conter diferenças que você entende). Faça backup antes.

## Banco novo (cliente novo)

```bash
npx prisma migrate deploy
```

Cria todas as tabelas a partir das migrações.

## Ao mudar o schema

1. Altere `prisma/schema.prisma`.
2. Em um banco de desenvolvimento (nunca de cliente): `npm run db:migrate -- --name descricao`.
3. Revise o SQL gerado e faça commit da pasta `prisma/migrations/<data>_descricao`.
4. Para cada cliente, faça backup e rode `npm run db:deploy` com a `DATABASE_URL` dele,
   começando pela homologação/demo.
