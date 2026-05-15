# Troubleshooting

Common problems for the current Next.js + Three.js + Socket.IO version.

## Next Dev / .next Inconsistency

Symptoms:

```txt
Cannot find module './819.js'
GET /_next/static/chunks/main-app.js 404
```

Recovery:

1. Stop the dev server.
2. Start it again.
3. If still broken, delete `.next`.
4. Run `npm run dev` again.

## Socket Server Starts as Next.js on Render

If Render logs show:

```txt
> next start
Could not find a production build in the '.next' directory
```

Render is using the wrong start command.

Use:

```txt
Build Command: npm install --include=dev
Start Command: npm run start:server
```

## Vercel Connects to `:3002`

If the browser tries:

```txt
https://chu-chase.vercel.app:3002/socket.io/
```

then Vercel is missing:

```txt
NEXT_PUBLIC_SOCKET_SERVER_URL=https://chu-chase.onrender.com
```

After changing Vercel environment variables, redeploy.

## Render CORS Error

If the browser shows:

```txt
No 'Access-Control-Allow-Origin' header is present
```

Check Render Environment Variables:

```txt
CLIENT_ORIGIN=https://chu-chase.vercel.app
```

For temporary testing only:

```txt
CLIENT_ORIGIN=*
```

After changing Render environment variables, run:

```txt
Manual Deploy -> Deploy latest commit
```

## Render Free Sleep

Render Free may sleep when inactive.

Symptoms:

- first access is slow
- socket connection takes time
- `/health` is slow on first request

Check:

```txt
https://chu-chase.onrender.com/health
```

## Audio Does Not Start on iPhone

Browser audio is blocked until user interaction.

Expected behavior:

- no BGM on page load
- BGM starts after join / ready / restart / BGM toggle
- `CREATE ROOM` alone should not start BGM

## Mobile Controls Feel Reversed

Check:

- `game/systems/ThreeInputController.ts`
- forced landscape branch in joystick direction conversion
- real iPhone portrait and landscape behavior

Do not fix this by rotating the canvas with CSS.
