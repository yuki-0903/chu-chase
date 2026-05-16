# CHU CHASE

ブチューから逃げる、シュールで笑える2人用3Dブラウザゲーム。

Play: https://chu-chase.vercel.app/

## 遊び方

1. 片方のプレイヤーが `CREATE ROOM` を押して部屋コードを作ります。
2. もう片方のプレイヤーが部屋コードを入力して `JOIN` します。
3. 2人がそろうと、それぞれ `CHUSER` / `DODGER` の役割が決まります。
4. 両方のプレイヤーが `START READY` を押すとゲーム開始です。
5. 最初の5秒間は `DODGER` だけ動けます。
6. 5秒後、`CHUSER` が解放されます。
7. `CHUSER` が `DODGER` に触れたら `CHUSER` の勝ちです。
8. 制限時間まで逃げ切れたら `DODGER` の勝ちです。

## 役割

- `CHUSER`: 唇がある追いかける側。1回捕まえたら勝ち。
- `DODGER`: 逃げる側。制限時間まで逃げ切れば勝ち。

## 操作

### スマホ

- 画面を横向きでプレイします。
- ゲーム画面をタップすると、その場所に丸いバーチャルジョイスティックが出ます。
- スティックを倒した方向にキャラクターが移動します。

### PC

- `WASD` または矢印キーで移動します。
- 横幅が狭いPC画面ではプレイできないようにしています。

## 技術構成

- Next.js App Router
- TypeScript
- Three.js
- Socket.IO
- Vercel
- Render

## ローカル開発

```bash
npm install
npm run dev
```

別ターミナルでSocket.IOサーバーを起動します。

```bash
npm run dev:server
```

デフォルト:

```txt
Client: http://localhost:3000
Socket server: http://localhost:3002
```

## Docs

制作方針や現在の仕様は `docs/` にまとめています。

```txt
docs/README.md
docs/art-direction.md
docs/current-game-structure.md
docs/game-algorithm.md
docs/deployment.md
docs/audio-workflow.md
```
