-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "cargo" TEXT,
    "telefone" TEXT,
    "avatar" TEXT,
    "role" TEXT NOT NULL DEFAULT 'ANALISTA',
    "departamento" TEXT NOT NULL DEFAULT 'OPERACIONAL_AMBIENTAL',
    "modulosAcesso" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "email" TEXT,
    "telefone" TEXT,
    "endereco" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "cep" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projetos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipoServico" TEXT NOT NULL,
    "statusComercial" TEXT NOT NULL DEFAULT 'RECEBIDO',
    "statusOperacional" TEXT NOT NULL DEFAULT 'NAO_INICIADO',
    "descricao" TEXT,
    "imovelNome" TEXT,
    "imovelEndereco" TEXT,
    "municipio" TEXT,
    "estado" TEXT,
    "car" TEXT,
    "areaHectares" DOUBLE PRECISION,
    "valorProposto" DOUBLE PRECISION,
    "tipoContrato" TEXT,
    "observacoes" TEXT,
    "observacoesAnalise" TEXT,
    "dataEntrada" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dataAprovacao" TIMESTAMP(3),
    "dataInicio" TIMESTAMP(3),
    "dataPrazo" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "responsavelId" TEXT,
    "supervisorId" TEXT,
    "analistaRapidoId" TEXT,
    "gestorResponsavelId" TEXT,
    "etapaPipeline" TEXT NOT NULL DEFAULT 'SOLICITACAO',
    "servicosRecomendados" TEXT,
    "servicosContratados" TEXT,
    "credenciais" TEXT,
    "valorSinal" DOUBLE PRECISION,
    "valorPrestacao" DOUBLE PRECISION,
    "numeroPrestacoes" INTEGER,
    "protocoloData" TIMESTAMP(3),
    "protocoloCodigoOrgao" TEXT,
    "checklistEncerramento" TEXT,
    "excluido" BOOLEAN NOT NULL DEFAULT false,
    "motivoExclusao" TEXT,
    "excluidoEm" TIMESTAMP(3),
    "excluidoPor" TEXT,
    "emAcompanhamento" BOOLEAN NOT NULL DEFAULT false,
    "caminhoSIGLA" TEXT,
    "statusSIGLA" TEXT,
    "ultimaConsultaSIGLA" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projetos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contratos" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "clienteId" TEXT NOT NULL,
    "tipoContrato" TEXT NOT NULL,
    "dataAssinatura" TIMESTAMP(3),
    "dataVencimento" TIMESTAMP(3),
    "valorTotal" DOUBLE PRECISION NOT NULL,
    "valorSinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorRestante" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numeroParcelas" INTEGER NOT NULL DEFAULT 1,
    "valorParcela" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statusContrato" TEXT NOT NULL DEFAULT 'AGUARDANDO_ASSINATURA',
    "arquivoUrl" TEXT,
    "observacoes" TEXT,
    "servicosContratados" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contratos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "observacao" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'TAREFA',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "responsavelId" TEXT,
    "prazo" TIMESTAMP(3),
    "dataConclusao" TIMESTAMP(3),
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "etapa" TEXT,
    "obrigatorio" BOOLEAN NOT NULL DEFAULT false,
    "requerVistoriaCampo" BOOLEAN NOT NULL DEFAULT false,
    "statusVistoria" TEXT,
    "dataCampo" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tarefas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pendencias" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "numeroPedido" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "prazoResposta" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ABERTA',
    "dataEntrega" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pendencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acoes_pendencia" (
    "id" TEXT NOT NULL,
    "pendenciaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "responsavelId" TEXT,
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "dataConclusao" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "acoes_pendencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licencas" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT,
    "clienteId" TEXT,
    "numero" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ATIVIDADE',
    "dataEmissao" TIMESTAMP(3) NOT NULL,
    "dataValidade" TIMESTAMP(3),
    "areaPermitida" DOUBLE PRECISION,
    "atividadePermitida" TEXT,
    "vazao" DOUBLE PRECISION,
    "tipoOutorga" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "condicionantes" TEXT,
    "documentoUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licencas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "condicionantes_licenca" (
    "id" TEXT NOT NULL,
    "licencaId" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "comoSeraFeito" TEXT,
    "responsavelId" TEXT,
    "prazo" TIMESTAMP(3),
    "concluida" BOOLEAN NOT NULL DEFAULT false,
    "dataConclusao" TIMESTAMP(3),
    "nota" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "condicionantes_licenca_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#3b82f6',
    "membros" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "frota" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'CARRO',
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "cor" TEXT,
    "kmAtual" DOUBLE PRECISION,
    "documentoUrl" TEXT,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "frota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vistorias" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "tarefaId" TEXT,
    "titulo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'VISTORIA_CAMPO',
    "status" TEXT NOT NULL DEFAULT 'AGENDADA',
    "dataAgendada" TIMESTAMP(3) NOT NULL,
    "dataRealizada" TIMESTAMP(3),
    "dataSaida" TIMESTAMP(3),
    "dataVolta" TIMESTAMP(3),
    "diasCampo" INTEGER,
    "local" TEXT,
    "municipio" TEXT,
    "coordenadas" TEXT,
    "responsavelId" TEXT,
    "equipeId" TEXT,
    "equipe" TEXT,
    "frotaId" TEXT,
    "frota" TEXT,
    "kmSaida" DOUBLE PRECISION,
    "kmChegada" DOUBLE PRECISION,
    "horaSaida" TEXT,
    "horaChegada" TEXT,
    "resultado" TEXT,
    "observacoes" TEXT,
    "manutencaoObs" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vistorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diarias" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" TEXT NOT NULL DEFAULT 'OUTRO',
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "comprovante" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gastos_campo" (
    "id" TEXT NOT NULL,
    "vistoriaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comprovanteUrl" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "gastos_campo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" TEXT NOT NULL,
    "contratoId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'PARCELA',
    "descricao" TEXT,
    "valor" DOUBLE PRECISION NOT NULL,
    "valorRecebido" DOUBLE PRECISION,
    "residual" DOUBLE PRECISION,
    "motivoAjuste" TEXT,
    "aprovadoAdm" BOOLEAN NOT NULL DEFAULT false,
    "dataVencimento" TIMESTAMP(3) NOT NULL,
    "dataPagamento" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "formaPagamento" TEXT,
    "comprovante" TEXT,
    "observacoes" TEXT,
    "numeroParcela" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT,
    "categoria" TEXT,
    "url" TEXT NOT NULL,
    "driveFileId" TEXT,
    "tamanho" INTEGER,
    "projetoId" TEXT,
    "tarefaId" TEXT,
    "vistoriaId" TEXT,
    "uploadadoPor" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacoes" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'info',
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comentarios" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "autorId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidadeId" TEXT,
    "detalhes" TEXT,
    "ip" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_status" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "campo" TEXT NOT NULL DEFAULT 'statusOperacional',
    "observacao" TEXT,
    "usuarioId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_sigla" (
    "id" TEXT NOT NULL,
    "projetoId" TEXT NOT NULL,
    "protocolo" TEXT NOT NULL,
    "statusAnterior" TEXT,
    "statusNovo" TEXT NOT NULL,
    "erro" TEXT,
    "consultadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_sigla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tarefas_semana" (
    "id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'TAREFA',
    "tarefaId" TEXT,
    "acaoPendenciaId" TEXT,
    "condicionanteLicencaId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "semanaInicio" TIMESTAMP(3) NOT NULL,
    "diaSemana" INTEGER,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tarefas_semana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_servico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "descricao" TEXT,
    "documentosRequeridos" TEXT,
    "tarefasPadrao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tipos_servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tipos_custo" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL DEFAULT 'campo',
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tipos_custo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracao_departamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "acessos" TEXT NOT NULL,
    "descricao" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "configuracao_departamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cadastro_teste" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "qtdFuncionarios" TEXT NOT NULL,
    "nomeEmpresa" TEXT NOT NULL,
    "usaSistema" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cadastro_teste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "clientes_cpfCnpj_key" ON "clientes"("cpfCnpj");

-- CreateIndex
CREATE UNIQUE INDEX "projetos_codigo_key" ON "projetos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_codigo_key" ON "contratos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "contratos_projetoId_key" ON "contratos"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "licencas_projetoId_key" ON "licencas"("projetoId");

-- CreateIndex
CREATE UNIQUE INDEX "frota_placa_key" ON "frota"("placa");

-- CreateIndex
CREATE UNIQUE INDEX "vistorias_tarefaId_key" ON "vistorias"("tarefaId");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_semana_tarefaId_usuarioId_semanaInicio_key" ON "tarefas_semana"("tarefaId", "usuarioId", "semanaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_semana_acaoPendenciaId_usuarioId_semanaInicio_key" ON "tarefas_semana"("acaoPendenciaId", "usuarioId", "semanaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "tarefas_semana_condicionanteLicencaId_usuarioId_semanaInici_key" ON "tarefas_semana"("condicionanteLicencaId", "usuarioId", "semanaInicio");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_servico_nome_key" ON "tipos_servico"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "tipos_custo_nome_key" ON "tipos_custo"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_departamento_nome_key" ON "configuracao_departamento"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "configuracao_departamento_codigo_key" ON "configuracao_departamento"("codigo");

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projetos" ADD CONSTRAINT "projetos_analistaRapidoId_fkey" FOREIGN KEY ("analistaRapidoId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas" ADD CONSTRAINT "tarefas_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pendencias" ADD CONSTRAINT "pendencias_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_pendencia" ADD CONSTRAINT "acoes_pendencia_pendenciaId_fkey" FOREIGN KEY ("pendenciaId") REFERENCES "pendencias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acoes_pendencia" ADD CONSTRAINT "acoes_pendencia_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencas" ADD CONSTRAINT "licencas_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licencas" ADD CONSTRAINT "licencas_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicionantes_licenca" ADD CONSTRAINT "condicionantes_licenca_licencaId_fkey" FOREIGN KEY ("licencaId") REFERENCES "licencas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "condicionantes_licenca" ADD CONSTRAINT "condicionantes_licenca_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_equipeId_fkey" FOREIGN KEY ("equipeId") REFERENCES "equipes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_frotaId_fkey" FOREIGN KEY ("frotaId") REFERENCES "frota"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diarias" ADD CONSTRAINT "diarias_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diarias" ADD CONSTRAINT "diarias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gastos_campo" ADD CONSTRAINT "gastos_campo_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "contratos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_vistoriaId_fkey" FOREIGN KEY ("vistoriaId") REFERENCES "vistorias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_uploadadoPor_fkey" FOREIGN KEY ("uploadadoPor") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacoes" ADD CONSTRAINT "notificacoes_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_status" ADD CONSTRAINT "historico_status_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_sigla" ADD CONSTRAINT "logs_sigla_projetoId_fkey" FOREIGN KEY ("projetoId") REFERENCES "projetos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_semana" ADD CONSTRAINT "tarefas_semana_tarefaId_fkey" FOREIGN KEY ("tarefaId") REFERENCES "tarefas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_semana" ADD CONSTRAINT "tarefas_semana_acaoPendenciaId_fkey" FOREIGN KEY ("acaoPendenciaId") REFERENCES "acoes_pendencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_semana" ADD CONSTRAINT "tarefas_semana_condicionanteLicencaId_fkey" FOREIGN KEY ("condicionanteLicencaId") REFERENCES "condicionantes_licenca"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tarefas_semana" ADD CONSTRAINT "tarefas_semana_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

