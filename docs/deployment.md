# CHU CHASE Deployment

## 構成

- Frontend: Vercel
- Socket.IO server: Render Free Web Service

GitHub Pages単体ではSocket.IOサーバーを動かせないため、フロントとSocketサーバーを分ける。

## 1. GitHubへpush

Vercel / Render はGitHubリポジトリ連携でデプロイする。

## 2. RenderでSocket.IOサーバーを作る

1. RenderでNew Web Serviceを作成
2. このリポジトリを選択
3. `render.yaml` を使う
4. `CLIENT_ORIGIN` は最初はVercelのURLが決まってから設定する

Renderのヘルスチェック:

```txt
https://your-render-service.onrender.com/health
```

## 3. Vercelでフロントを作る

VercelでこのリポジトリをImportする。

Environment Variables:

```txt
NEXT_PUBLIC_SOCKET_SERVER_URL=https://your-render-service.onrender.com
```

## 4. RenderのCORSをVercelに限定

VercelのURLが決まったら、Render側のEnvironment Variablesに入れる。

```txt
CLIENT_ORIGIN=https://your-vercel-app.vercel.app
```

複数URLを許可する場合はカンマ区切り:

```txt
CLIENT_ORIGIN=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

## 注意

- `NEXT_PUBLIC_SOCKET_SERVER_URL` はブラウザに公開される前提の値
- Render / Vercel / GitHub の管理用APIキーはリポジトリに入れない
- Render Freeはスリープする可能性があるため、初回アクセスが遅くなる場合がある
