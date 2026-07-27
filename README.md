# Tango Orbit

英和・和英検索、関連語の移動、端末内単語帳、短い復習を一画面にまとめた日本語Web辞書です。

## Stack

- Cloudflare Workers / D1 / Rate Limiting
- Hono / Hono JSX
- Vite+
- TypeScript
- JMdict common-only English data

Better Authは、初期版にアカウント所有の状態がないため導入していません。検索と単語帳はブラウザ内で完結します。

## Local development

```powershell
npm install
npm run dictionary:update
npm run dev
```

品質確認:

```powershell
npm run release:check
npm run check
npm test
npm run build
npm audit
```

## Dictionary data

`public/dictionary.json` is derived from [JMdict](https://www.edrdg.org/wiki/JMdict-EDICT_Dictionary_Project.html), owned by the Electronic Dictionary Research and Development Group, and is licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).

The scheduled workflow checks the latest `jmdict-simplified` release every week, verifies its SHA-256 digest, regenerates the compact data, and opens a pull request when the dictionary changed.

## Code licence

Application code is MIT licensed. The derived dictionary file remains CC BY-SA 4.0.
