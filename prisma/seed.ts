import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed do banco de dados Ecdise...')

  // ============================================================
  // TIPOS DE SERVIÇO (Pré-cadastros Ambientais)
  // ============================================================
  const tiposServico = [
    {
      nome: 'Licenciamento Ambiental',
      categoria: 'licenciamento_ambiental',
      descricao: 'Processo de licenciamento ambiental completo',
      ordem: 1,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria Campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Estudo Ambiental', 'Matrícula Atualizada 30 dias'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Realizar uso ocupação do solo', etapa: 'USO', ordem: 1 },
        { titulo: 'Gerar Mapas Temáticos', etapa: 'MAPAS', ordem: 2 },
        { titulo: 'Obter Acesso SICAR', etapa: 'CAR', ordem: 3 },
        { titulo: 'Analisar Cadastro CAR', etapa: 'CAR', ordem: 4 },
        { titulo: 'Elaborar Estudo Ambiental', etapa: 'ESTUDO', ordem: 5 },
        { titulo: 'Enviar Doc Notificad', etapa: 'DOC', ordem: 6 },
        { titulo: 'Vistoria de campo', etapa: 'VISTORIA', ordem: 7 },
        { titulo: 'Encaminhar protocolo', etapa: 'PROTOCOLO', ordem: 8 },
      ])
    },
    {
      nome: 'Outorga',
      categoria: 'outorga',
      descricao: 'Outorga de direito de uso de recursos hídricos',
      ordem: 2,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CAR', 'CTF', 'Ponto de Interferencia',
        'ART', 'Procuração', 'Dados Captação/Uso', 'CNARH - ANA',
        'Mapas Temáticos', 'Estudo Outorga'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Levantar dados captação', etapa: 'DADOS', ordem: 1 },
        { titulo: 'Elaborar Estudo Outorga', etapa: 'ESTUDO', ordem: 2 },
        { titulo: 'Cadastro CNARH-ANA', etapa: 'CNARH', ordem: 3 },
        { titulo: 'Gerar Mapas Temáticos', etapa: 'MAPAS', ordem: 4 },
        { titulo: 'Enviar protocolo', etapa: 'PROTOCOLO', ordem: 5 },
      ])
    },
    {
      nome: 'ACAIO',
      categoria: 'acaio',
      descricao: 'Autorização de Corte de Arvores Isoladas e/ou Obstrução',
      ordem: 3,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Projeto de Exploração Florestal',
        'Censo - Inventário', 'Matrícula Atualizada 30 dias', 'Dados Sinaflor'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Inventário florestal', etapa: 'INVENTARIO', ordem: 1 },
        { titulo: 'Projeto de Exploração', etapa: 'PROJETO', ordem: 2 },
        { titulo: 'Cadastro Sinaflor', etapa: 'SINAFLOR', ordem: 3 },
        { titulo: 'Vistoria de campo', etapa: 'VISTORIA', ordem: 4 },
        { titulo: 'Enviar protocolo', etapa: 'PROTOCOLO', ordem: 5 },
      ])
    },
    {
      nome: 'AEF',
      categoria: 'aef',
      descricao: 'Autorização de Exploração Florestal',
      ordem: 4,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Projeto de Exploração Florestal',
        'Inventário Florestal', 'Matrícula Atualizada 30 dias', 'Dados Sinaflor'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Inventário Florestal', etapa: 'INVENTARIO', ordem: 1 },
        { titulo: 'Projeto de Exploração Florestal', etapa: 'PROJETO', ordem: 2 },
        { titulo: 'Gerar Mapas Temáticos', etapa: 'MAPAS', ordem: 3 },
        { titulo: 'Dados Sinaflor', etapa: 'SINAFLOR', ordem: 4 },
        { titulo: 'Vistoria de campo', etapa: 'VISTORIA', ordem: 5 },
        { titulo: 'Emitir ART', etapa: 'ART', ordem: 6 },
        { titulo: 'Enviar protocolo', etapa: 'PROTOCOLO', ordem: 7 },
      ])
    },
    {
      nome: 'PRAD',
      categoria: 'prad',
      descricao: 'Plano de Recuperação de Áreas Degradadas',
      ordem: 5,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Plano Recuperação', 'Matrícula Atualizada 30 dias'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Vistoria de campo', etapa: 'VISTORIA', ordem: 1 },
        { titulo: 'Elaborar Plano de Recuperação', etapa: 'PLANO', ordem: 2 },
        { titulo: 'Gerar Mapas', etapa: 'MAPAS', ordem: 3 },
        { titulo: 'Emitir ART', etapa: 'ART', ordem: 4 },
        { titulo: 'Enviar protocolo', etapa: 'PROTOCOLO', ordem: 5 },
      ])
    },
    {
      nome: 'Tipologia Florestal',
      categoria: 'tipologia_florestal',
      descricao: 'Estudo de tipologia e fitossociologia florestal',
      ordem: 6,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Projeto de Exploração Florestal',
        'Inventário Florestal', 'Matrícula Atualizada 30 dias', 'Dados Sinaflor'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Inventário Florestal', etapa: 'INVENTARIO', ordem: 1 },
        { titulo: 'Análise Fitossociológica', etapa: 'ANALISE', ordem: 2 },
        { titulo: 'Gerar Mapas', etapa: 'MAPAS', ordem: 3 },
        { titulo: 'Emitir ART', etapa: 'ART', ordem: 4 },
      ])
    },
    {
      nome: 'Trecho de Drenagem',
      categoria: 'trecho_drenagem',
      descricao: 'Análise e regularização de trecho de drenagem',
      ordem: 7,
      documentosRequeridos: JSON.stringify([
        'Dados Pessoais', 'CTF', 'Uso do Solo', 'ART', 'Procuração',
        'Mapas Vistoria', 'Dados Vistoria campo', 'CAR Atualizado',
        'Mapas Temáticos', 'Relatório Técnico IN 04/2025', 'Matrícula Atualizada 30 dias'
      ]),
      tarefasPadrao: JSON.stringify([
        { titulo: 'Vistoria de campo', etapa: 'VISTORIA', ordem: 1 },
        { titulo: 'Relatório Técnico IN 04/2025', etapa: 'RELATORIO', ordem: 2 },
        { titulo: 'Gerar Mapas', etapa: 'MAPAS', ordem: 3 },
        { titulo: 'Emitir ART', etapa: 'ART', ordem: 4 },
        { titulo: 'Enviar protocolo', etapa: 'PROTOCOLO', ordem: 5 },
      ])
    },
  ]

  for (const tipo of tiposServico) {
    await prisma.tipoServico.upsert({
      where: { nome: tipo.nome },
      update: tipo,
      create: tipo,
    })
  }
  console.log('✅ Tipos de serviço criados')

  // ============================================================
  // TIPOS DE CUSTO (Custos de Campo)
  // ============================================================
  const tiposCusto = [
    { nome: 'Combustível', categoria: 'campo' },
    { nome: 'Pedágio', categoria: 'campo' },
    { nome: 'Estacionamento', categoria: 'campo' },
    { nome: 'Diária de hotel / pousada', categoria: 'campo' },
    { nome: 'Café da manhã', categoria: 'campo' },
    { nome: 'Almoço', categoria: 'campo' },
    { nome: 'Jantar', categoria: 'campo' },
    { nome: 'Mecânica / Socorro eventual', categoria: 'campo' },
    { nome: 'Material Escritório', categoria: 'escritorio' },
    { nome: 'Material Vistoria', categoria: 'campo' },
    { nome: 'Outros', categoria: 'geral' },
  ]

  for (const custo of tiposCusto) {
    await prisma.tipoCusto.upsert({
      where: { nome: custo.nome },
      update: custo,
      create: custo,
    })
  }
  console.log('✅ Tipos de custo criados')

  // ============================================================
  // CONFIGURAÇÃO DE DEPARTAMENTOS
  // ============================================================
  const departamentos = [
    {
      nome: 'Gestão Geral',
      codigo: 'GESTAO_GERAL',
      acessos: JSON.stringify(['dashboard', 'comercial', 'contratos', 'operacional', 'campo', 'financeiro', 'configuracoes', 'bi']),
      descricao: 'Acesso total ao sistema',
    },
    {
      nome: 'Comercial',
      codigo: 'COMERCIAL',
      acessos: JSON.stringify(['comercial', 'contratos', 'financeiro']),
      descricao: 'Gestão comercial e contratos',
    },
    {
      nome: 'Financeiro',
      codigo: 'FINANCEIRO',
      acessos: JSON.stringify(['financeiro', 'contratos']),
      descricao: 'Controle financeiro e pagamentos',
    },
    {
      nome: 'Operacional Ambiental',
      codigo: 'OPERACIONAL_AMBIENTAL',
      acessos: JSON.stringify(['operacional', 'campo', 'dashboard']),
      descricao: 'Projetos ambientais e licenciamento',
    },
    {
      nome: 'Operacional Regularização',
      codigo: 'OPERACIONAL_REGULARIZACAO',
      acessos: JSON.stringify(['operacional', 'campo', 'dashboard']),
      descricao: 'Projetos de regularização fundiária',
    },
    {
      nome: 'Gestão Campo',
      codigo: 'GESTAO_CAMPO',
      acessos: JSON.stringify(['campo', 'operacional']),
      descricao: 'Vistorias e trabalho de campo',
    },
    {
      nome: 'Contratos',
      codigo: 'CONTRATOS',
      acessos: JSON.stringify(['contratos', 'financeiro', 'comercial']),
      descricao: 'Gestão de contratos',
    },
  ]

  for (const dep of departamentos) {
    await prisma.configuracaoDepartamento.upsert({
      where: { codigo: dep.codigo },
      update: dep,
      create: dep,
    })
  }
  console.log('✅ Departamentos configurados')

  // ============================================================
  // USUÁRIO ADMINISTRADOR PADRÃO
  // ============================================================
  const senhaHash = await bcrypt.hash('admin@ecdise2024', 10)
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@ecdise.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@ecdise.com',
      senha: senhaHash,
      cargo: 'Administrador do Sistema',
      role: 'ADMIN',
      departamento: 'GESTAO_GERAL',
      ativo: true,
    },
  })
  console.log('✅ Usuário admin criado:', admin.email)

  console.log('\n🎉 Seed concluído com sucesso!')
  console.log('\n📋 Credenciais de acesso:')
  console.log('   Admin: admin@ecdise.com  |  admin@ecdise2024')
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
