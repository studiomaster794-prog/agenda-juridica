import { fileURLToPath } from 'node:url';

const endpoint = process.env.CDP_ENDPOINT ?? 'http://127.0.0.1:9223';
const appUrl = process.env.APP_URL ?? 'http://localhost:8083';
const importFixture = fileURLToPath(new URL('./fixtures/importacao-teste.csv', import.meta.url));

const pages = await fetch(`${endpoint}/json`).then((response) => response.json());
const page = pages.find((item) => item.type === 'page');
if (!page?.webSocketDebuggerUrl) throw new Error('Nenhuma página do navegador encontrada.');

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const runtimeErrors = [];
let fileChooserResolve;

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(message.params.exceptionDetails.text || 'Exceção sem mensagem');
  }
  if (message.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true }).catch(() => undefined);
  }
  if (message.method === 'Page.fileChooserOpened' && fileChooserResolve) {
    fileChooserResolve(message.params);
    fileChooserResolve = undefined;
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || 'Falha ao avaliar JavaScript na página.');
  }
  return result.result.value;
}

async function waitFor(expression, description, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await evaluate(expression)) return;
    } catch {
      // A navegação pode substituir o documento entre duas verificações.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  const body = await evaluate('document.body?.innerText.slice(0, 1200) ?? "Documento indisponível"');
  throw new Error(`Tempo esgotado esperando: ${description}\nTela atual:\n${body}`);
}

async function clickText(text) {
  const point = await evaluate(`(() => {
    const wanted = ${JSON.stringify(text)};
    const candidates = [...document.querySelectorAll('body *')]
      .filter((item) => item.textContent.trim() === wanted || item.textContent.includes(wanted))
      .filter((item) => {
        const rect = item.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .sort((a, b) => a.textContent.length - b.textContent.length);
    const element = candidates[0];
    if (!element) return null;
    const target = element;
    target.scrollIntoView({ block: 'center', inline: 'center' });
    const rect = target.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, tag: target.tagName, role: target.getAttribute('role'), tabIndex: target.tabIndex };
  })()`);
  if (!point) throw new Error(`Botão não encontrado: ${text}`);
  console.log(`Clique: ${text}`, point);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function clickLabel(label) {
  const point = await evaluate(`(() => {
    const element = document.querySelector('[aria-label=${JSON.stringify(label)}]');
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  if (!point) throw new Error(`Controle não encontrado: ${label}`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: point.x, y: point.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: point.x, y: point.y, button: 'left', clickCount: 1 });
}

async function fillPlaceholder(placeholder, value) {
  const focused = await evaluate(`(() => {
    const input = document.querySelector('[placeholder=${JSON.stringify(placeholder)}]');
    if (!input) return false;
    input.focus();
    if (typeof input.select === 'function') input.select();
    return true;
  })()`);
  if (!focused) throw new Error(`Campo não encontrado: ${placeholder}`);
  await send('Input.insertText', { text: value });
}

await send('Runtime.enable');
await send('Page.enable');
await send('Page.setInterceptFileChooserDialog', { enabled: true });
await send('Page.navigate', { url: appUrl });
await waitFor('document.readyState === "complete"', 'carregamento da página');
await evaluate('localStorage.clear()');
await send('Page.navigate', { url: appUrl });
await waitFor('document.readyState === "complete"', 'recarregamento limpo da página');
await waitFor('document.body.innerText.length > 20', 'interface inicial');

if (await evaluate('document.body.innerText.includes("Continuar")')) {
  await clickText('Continuar');
  await waitFor('document.body.innerText.includes("Receba alertas")', 'segunda página da apresentação');
  await clickText('Continuar');
  await waitFor('document.body.innerText.includes("Seus dados protegidos")', 'terceira página da apresentação');
  await clickText('Começar');
}

await waitFor('document.body.innerText.includes("Nenhum compromisso cadastrado") || document.body.innerText.includes("Próximo compromisso")', 'tela inicial');

await clickLabel('Adicionar compromisso');
await waitFor('document.body.innerText.includes("Novo compromisso")', 'cadastro de compromisso');
await fillPlaceholder('Nome do cliente', 'Cliente Teste Automatizado');
await fillPlaceholder('0000000-00.0000.0.00.0000', '0001234-56.2026.8.00.0001');
await fillPlaceholder('Ex.: Pinheiro', 'São Paulo');
await clickText('Salvar compromisso');
await waitFor('document.body.innerText.includes("Cliente Teste Automatizado")', 'compromisso salvo');

await clickText('Cliente Teste Automatizado');
await waitFor('document.body.innerText.includes("Marcar como concluído")', 'detalhes do compromisso');
await clickLabel('Editar compromisso');
await waitFor('document.body.innerText.includes("Editar compromisso")', 'edição do compromisso');
await fillPlaceholder('Nome do cliente', 'Cliente Teste Editado');
await clickText('Salvar alterações');
await waitFor('document.body.innerText.includes("Cliente Teste Editado")', 'compromisso editado');
await clickText('Marcar como concluído');
await waitFor('document.body.innerText.includes("Reabrir como agendado")', 'alteração de status');
await clickText('Reabrir como agendado');
await waitFor('document.body.innerText.includes("Marcar como concluído")', 'reabertura do compromisso');

await send('Page.navigate', { url: `${appUrl}/calendario` });
await waitFor('document.body.innerText.includes("Nenhum compromisso neste dia") || document.body.innerText.includes("Cliente Teste Editado")', 'tela de calendário');
await send('Page.navigate', { url: `${appUrl}/compromissos` });
await waitFor('document.body.innerText.includes("Cliente Teste Editado")', 'lista de compromissos');

await send('Page.navigate', { url: `${appUrl}/ajustes` });
await waitFor('document.body.innerText.includes("Importar planilha")', 'tela de ajustes');
await clickText('Assuntos personalizados');
await waitFor('document.body.innerText.includes("Novo assunto")', 'tela de assuntos personalizados');
await fillPlaceholder('Ex.: Previdenciário', 'Tributário');
await clickText('Adicionar');
await waitFor('document.body.innerText.includes("Tributário")', 'assunto personalizado salvo');

await send('Page.navigate', { url: `${appUrl}/importar` });
await waitFor('document.body.innerText.includes("Escolher arquivo")', 'tela de importação');
const chooser = new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error('O seletor de arquivo não foi aberto.')), 10000);
  fileChooserResolve = (params) => {
    clearTimeout(timer);
    resolve(params);
  };
});
await clickText('Escolher arquivo');
const chooserParams = await chooser;
await send('DOM.setFileInputFiles', {
  files: [importFixture],
  backendNodeId: chooserParams.backendNodeId,
});
await waitFor('document.body.innerText.includes("Cliente Importado") && document.body.innerText.includes("Válidos")', 'prévia do arquivo CSV');
const importButtonLabel = await evaluate(`document.body.innerText.split('\\n').find((line) => /^Importar \\d+ selecionado/.test(line))`);
if (!importButtonLabel?.startsWith('Importar 1 selecionado')) {
  const importBody = await evaluate('document.body.innerText.slice(0, 1800)');
  throw new Error(`Quantidade inesperada na importação: ${importButtonLabel ?? 'botão ausente'}\n${importBody}`);
}
await clickText(importButtonLabel);
await waitFor('document.body.innerText.includes("Cliente Importado")', 'importação do arquivo CSV');

await send('Page.navigate', { url: appUrl });
await waitFor('document.body.innerText.includes("Cliente Teste Editado")', 'retorno à tela inicial');
await clickText('Cliente Teste Editado');
await waitFor('document.body.innerText.includes("Excluir")', 'detalhes antes da exclusão');
await clickText('Excluir');
await waitFor('!document.body.innerText.includes("Cliente Teste Editado")', 'exclusão do compromisso');

if (runtimeErrors.length > 0) {
  throw new Error(`Exceções no navegador:\n${runtimeErrors.join('\n')}`);
}

console.log('PASSOU: onboarding, cadastro, edição, status, reabertura, calendário, lista, ajustes, assuntos, importação e exclusão.');
socket.close();
