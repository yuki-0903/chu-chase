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
3. 手動作成の場合は以下を設定

```txt
Build Command: npm install --include=dev
Start Command: npm run start:server
```

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

現在のテストURL:

```txt
NEXT_PUBLIC_SOCKET_SERVER_URL=https://chu-chase.onrender.com
CLIENT_ORIGIN=https://chu-chase.vercel.app
```

複数URLを許可する場合はカンマ区切り:

```txt
CLIENT_ORIGIN=https://your-vercel-app.vercel.app,https://your-custom-domain.com
```

## 注意

- `NEXT_PUBLIC_SOCKET_SERVER_URL` はブラウザに公開される前提の値
- Render / Vercel / GitHub の管理用APIキーはリポジトリに入れない
- Render Freeはスリープする可能性があるため、初回アクセスが遅くなる場合がある
- Renderで環境変数を変えたら `Manual Deploy -> Deploy latest commit`
- Vercelで環境変数を変えたらRedeploy
