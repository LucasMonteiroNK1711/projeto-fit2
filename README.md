# Tracker Academia

Aplicacao web simples para acompanhar treinos, medidas corporais e evolucao fisica direto no navegador. O projeto usa apenas HTML, CSS e JavaScript puro, sem etapa de build ou instalacao de dependencias.

## Funcionalidades

- Dashboard com peso atual, altura, idade, IMC, percentual de gordura e massa magra.
- Calculo de composicao corporal pelo metodo Navy.
- Graficos em canvas para evolucao de peso e percentual de gordura.
- Cadastro de medidas corporais com historico.
- Tela de treino do dia com acompanhamento por series.
- Gestos de arrastar nos cards de treino para avancar ou voltar series.
- Gerenciador semanal de treinos de segunda a sabado.
- Biblioteca de exercicios editavel, organizada por grupo muscular.
- Geracao automatica de treino por dia com base nos grupos selecionados.
- Tema claro/escuro salvo no navegador.
- Persistencia local usando `localStorage`.

## Tecnologias

- HTML5
- CSS3
- JavaScript
- Canvas API
- Web Storage API (`localStorage`)

## Como executar

Nao e necessario instalar pacotes. Basta abrir o arquivo `index.html` no navegador.

Opcao pelo explorador de arquivos:

1. Abra a pasta do projeto.
2. Clique duas vezes em `index.html`.

Opcao pelo terminal, dentro da pasta do projeto:

```powershell
start index.html
```

## Como usar

1. Na aba `Dashboard`, visualize os indicadores principais e os graficos de evolucao.
2. Clique em `Registrar evolucao` ou no botao `+` para cadastrar uma nova medida.
3. Na aba `Medidas`, acompanhe o resumo corporal e acesse o historico.
4. Na aba `Treino`, veja o treino do dia e registre o progresso das series.
5. Clique em `Gerenciar treinos` para montar a semana, cadastrar exercicios e gerar treinos automaticamente.

Os dados ficam salvos no navegador atual. Se o cache ou os dados do site forem apagados, as informacoes tambem podem ser removidas.

## Estrutura do projeto

```text
.
|-- index.html   # Estrutura da interface e modais
|-- styles.css   # Estilos, layout responsivo e temas
`-- script.js    # Estado, persistencia, calculos e interacoes
```

## Dados armazenados

O app usa as seguintes chaves no `localStorage`:

- `fit_tracker_measures`
- `fit_tracker_workouts`
- `fit_tracker_exercise_library`
- `fit_tracker_workout_sessions`
- `fit_tracker_theme`

## Observacoes

O percentual de gordura e uma estimativa baseada no metodo Navy e nao substitui avaliacao profissional. Use os resultados como acompanhamento de tendencia, nao como diagnostico.
