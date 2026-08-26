# Agenda Jurídica

Aplicativo para organizar audiências, prazos, reuniões e compromissos jurídicos.

## Recursos

- Cadastro, edição, conclusão, adiamento e exclusão de compromissos.
- Calendário mensal, semanal e listagem com filtros.
- Importação de planilhas CSV e XLSX.
- Exportação CSV e cópias de segurança.
- Lembretes locais no Android e iPhone.
- Proteção por biometria em versões nativas.
- Funcionamento offline com armazenamento local.

## Executar no computador

```bash
npm install
npm run web
```

## Executar no celular

Instale o Expo Go, execute `npm start` e leia o QR Code exibido no terminal.

## Validação

```bash
npx tsc --noEmit
npx expo-doctor
npx expo export --platform web
```

O projeto utiliza React Native, Expo 57, Expo Router, TypeScript e SQLite.
