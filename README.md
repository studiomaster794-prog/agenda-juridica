# Agenda Jurídica

Abra e instale neste link:

**https://studiomaster794-prog.github.io/agenda-juridica/**

Aplicativo simples para anotar audiências, prazos e compromissos. Abre no celular e no computador, funciona sem internet depois de instalado e **não precisa de Node, Expo nem loja de aplicativos**.

Os dados ficam **somente neste aparelho**. Se for usar no celular e no computador, exporte uma cópia de segurança em Ajustes e importe no outro aparelho.

## O que o aplicativo faz

- Cadastra data, horário, processo, cliente, assunto, comarca e local
- Mostra o início, o calendário e a lista de compromissos
- Avisa **7 dias antes**, **1 dia antes** e **no dia**
- Importa planilha Excel (.xlsx, .xls) ou CSV e exporta cópia de segurança
- Pode ser instalado na tela inicial, como um aplicativo

## Avisos

Ao abrir o aplicativo (e enquanto ele estiver aberto), a tela mostra um alerta se houver compromisso:

- daqui a 7 dias
- amanhã
- hoje

Se a permissão de notificações for aceita, o celular também tenta mostrar um aviso do sistema.

**Limite importante:** um site, mesmo instalado, não acorda o iPhone (e alguns Androids) com o aplicativo totalmente fechado, como um app da App Store. O jeito mais confiável é abrir a Agenda de manhã: os avisos do dia aparecem na hora. O horário padrão dos alertas é 08:00 e pode ser mudado em Ajustes.

## Como instalar no celular

### iPhone

1. Abra o link **no Safari** (não no Chrome).
2. Toque no botão **Compartilhar**.
3. Toque em **Adicionar à Tela de Início**.
4. Confirme. O ícone da balança aparece junto com os outros aplicativos.
5. Na primeira abertura, permita as notificações se quiser o aviso do sistema.

### Android

1. Abra o link **no Chrome**.
2. Toque no menu **⋮** → **Instalar aplicativo** (ou **Adicionar à tela inicial**).
3. Confirme. O ícone fica na tela inicial.

## Como instalar no computador

1. Abra o mesmo link no **Chrome** ou no **Edge**.
2. Na barra de endereço, clique no ícone de instalar (um monitor com seta) ou use o menu → **Instalar Agenda Jurídica**.
3. O aplicativo abre em janela própria, sem a barra do navegador.

## Planilha

Em **Ajustes → Importar planilha**, envie um arquivo **Excel (.xlsx ou .xls)** ou **CSV**.

As colunas reconhecidas:

`Data` · `Horário` · `Nº do processo` · `Cliente` · `Assunto` · `Comarca`

A data pode ser `03/09/2026` ou uma data do Excel. O horário pode ser `9h30` ou `09:30`. O aplicativo mostra uma prévia antes de importar e ignora linhas duplicadas.

## Publicar atualizações

O código deste repositório é o aplicativo web. Depois de alterar os arquivos, envie para a branch `main`. O GitHub Pages atualiza o link acima.

Se o site ainda não abrir, ative uma vez em **Settings → Pages**: Source **Deploy from a branch**, branch `main`, pasta `/ (root)`.
