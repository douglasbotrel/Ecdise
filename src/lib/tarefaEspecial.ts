// Detecta, pelo título, as tarefas "especiais" que abrem um popup de dados ao
// serem concluídas (credenciais SIGLA/CTF e Protocolo no órgão).
//
// - Ignora o prefixo "[Serviço] " que o sistema coloca nas tarefas geradas a
//   partir dos serviços contratados. Antes, um serviço chamado "Licença ..." ou
//   "... SIGLA" fazia TODA tarefa dele abrir o popup errado.
// - Ignora acentos/maiúsculas e exige a palavra inteira.
// - Licença NÃO é detectada aqui de propósito: o popup de "Licença Obtida" só
//   abre pelo botão "Licença Obtida" do projeto.

export type TarefaEspecial = 'SIGLA' | 'CTF' | 'PROTOCOLO'

export function detectarTarefaEspecial(titulo: string | null | undefined): TarefaEspecial | null {
  if (!titulo) return null
  const semPrefixo = titulo.replace(/^\s*\[[^\]]*\]\s*/, '')
  const t = semPrefixo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
  if (/\bSIGLA\b/.test(t)) return 'SIGLA'
  if (/\bCTF\b/.test(t)) return 'CTF'
  if (/\bPROTOCOLO\b/.test(t)) return 'PROTOCOLO'
  return null
}
