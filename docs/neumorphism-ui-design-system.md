# Neumorphism UI Design System 実装指示

Figma Communityから抜き出したNeumorphism UI CSSをもとに、ゲーム内で再利用できるUIデザインシステムを作成する。

## 重要

Figmaの `position: absolute` / `left` / `top` は無視する。

再現するのは「配置」ではなく、質感・shadow・押下感・色・角丸。

## Design Tokens

## Typography

- Google Font: `Space Grotesk`
- fallback: `Inter`, `system-ui`, `sans-serif`
- Next.js App Routerでは `next/font/google` の `Space_Grotesk` を使用する。
- CSS変数は `--font-space-grotesk` として読み込み、UI全体は `--font-ui` で参照する。

```css
:root {
  --font-ui: var(--font-space-grotesk), Inter, system-ui, sans-serif;

  /* Base */
  --neu-bg: #F0F0F3;
  --neu-bg-inner: #EEEEEE;

  /* Text */
  --neu-text-main: #728AB7;
  --neu-text-sub: #898989;

  /* Shadow */
  --neu-shadow-outer:
    -1px -1px 3px #FFFFFF,
    1.5px 1.5px 3px rgba(174, 174, 192, 0.4);

  --neu-shadow-panel:
    -6px -6px 14px #FFFFFF,
    8px 8px 18px rgba(174, 174, 192, 0.35);

  --neu-shadow-inner:
    inset -1px -1px 1px rgba(255, 255, 255, 0.7),
    inset 1px 1px 2px rgba(174, 174, 192, 0.2);

  --neu-shadow-soft:
    0px 1px 4px rgba(174, 174, 192, 0.25),
    2px 2px 3px rgba(174, 174, 192, 0.25);

  /* Radius */
  --neu-radius-sm: 5px;
  --neu-radius-md: 12px;
  --neu-radius-lg: 24px;

  /* Lime */
  --neu-lime-200: #E3FFFD;
  --neu-lime-300: #CCFBF8;
  --neu-lime-400: #83DBD6;
  --neu-lime-500: #6AB9B4;
  --neu-lime-600: #529793;
  --neu-lime-700: #3C7571;

  /* Pink */
  --neu-pink-200: #FFC8C8;
  --neu-pink-300: #FFA0A0;
  --neu-pink-400: #FB7575;
  --neu-pink-500: #DE6161;
  --neu-pink-600: #C04E4E;
  --neu-pink-700: #A33D3D;

  /* Violet */
  --neu-violet-200: #FAF5FF;
  --neu-violet-300: #E1C2F8;
  --neu-violet-400: #C590EF;
  --neu-violet-500: #986ABC;
  --neu-violet-600: #6C4889;
  --neu-violet-700: #422956;

  /* Purple */
  --neu-purple-200: #F1EFFF;
  --neu-purple-300: #B5AAFF;
  --neu-purple-400: #745FF2;
  --neu-purple-500: #513FBF;
  --neu-purple-600: #34258C;
  --neu-purple-700: #1C1259;

  /* Blue Gray */
  --neu-blue-gray-200: #F2F5FA;
  --neu-blue-gray-300: #D2E2FF;
  --neu-blue-gray-400: #728AB7;
  --neu-blue-gray-500: #596E95;
  --neu-blue-gray-600: #415273;
  --neu-blue-gray-700: #2B3951;

  /* Gray */
  --neu-gray-200: #F4F5F7;
  --neu-gray-300: #DDE3ED;
  --neu-gray-400: #808B9F;
  --neu-gray-500: #5B6577;
  --neu-gray-600: #39404E;
  --neu-gray-700: #2C2D30;
}
```
