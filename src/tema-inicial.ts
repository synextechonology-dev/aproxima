// Aplica o tema salvo antes do React montar, para não piscar o tema errado.
try {
  if (localStorage.getItem('aproxima:tema') === 'light') {
    document.documentElement.dataset.theme = 'light';
  }
} catch {
  // localStorage indisponível (modo privado): fica o tema escuro padrão
}
