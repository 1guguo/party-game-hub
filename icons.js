/**
 * 朋友到齐，好戏开场 - 精致 1:1 矢量手绘微质感图标集 (高保真优化版)
 */

const GameIcons = {
  // 1. UNO (三张扇形红、蓝、绿卡牌)
  uno: `
    <svg viewBox="0 0 100 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <g transform="rotate(-16 35 35)">
        <rect x="22" y="10" width="26" height="42" rx="4" fill="#F87171" />
        <ellipse cx="35" cy="31" rx="8" ry="13" fill="#FFFFFF" fill-opacity="0.9" />
        <text x="35" y="35" font-family="system-ui" font-size="11" font-weight="900" fill="#EF4444" text-anchor="middle" stroke="none">1</text>
      </g>
      <g transform="rotate(16 65 35)">
        <rect x="52" y="10" width="26" height="42" rx="4" fill="#4ADE80" />
        <ellipse cx="65" cy="31" rx="8" ry="13" fill="#FFFFFF" fill-opacity="0.9" />
        <text x="65" y="35" font-family="system-ui" font-size="11" font-weight="900" fill="#16A34A" text-anchor="middle" stroke="none">2</text>
      </g>
      <rect x="37" y="8" width="26" height="42" rx="4" fill="#60A5FA" />
      <ellipse cx="50" cy="29" rx="8" ry="13" fill="#FFFFFF" fill-opacity="0.9" />
      <text x="50" y="33" font-family="system-ui" font-size="9" font-weight="900" fill="#2563EB" text-anchor="middle" stroke="none">+4</text>
    </svg>
  `,

  // 2. 阿瓦隆 (骑士圣盾 + 交叉宝剑 + 下方三点)
  avalon: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M35 10 C46 10 52 16 52 30 C52 46 35 56 35 56 C35 56 18 46 18 30 C18 16 24 10 35 10 Z" fill="#F5F3FF" />
      <line x1="35" y1="16" x2="35" y2="44" stroke-width="1.8" />
      <line x1="28" y1="24" x2="42" y2="24" stroke-width="1.8" />
      <circle cx="35" cy="14" r="2" fill="#18181b" />
      <!-- 下方三点 -->
      <circle cx="27" cy="62" r="2.2" fill="none" stroke="#8B5CF6" stroke-width="1.4" />
      <circle cx="35" cy="62" r="2.2" fill="none" stroke="#8B5CF6" stroke-width="1.4" />
      <circle cx="43" cy="62" r="2.2" fill="none" stroke="#8B5CF6" stroke-width="1.4" />
    </svg>
  `,

  // 3. 狼人杀 (静夜弯月 + 四角星)
  werewolf: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M40 14 C28 16 20 27 20 38 C20 51 31 60 44 60 C50 60 55 57 58 53 C44 54 32 44 32 32 C32 24 36 17 40 14 Z" fill="#FAF5FF" />
      <path d="M54 18 L55.5 12 L57 18 L63 19.5 L57 21 L55.5 27 L54 21 L48 19.5 Z" fill="#C084FC" stroke="#8B5CF6" stroke-width="1.2" />
    </svg>
  `,

  // 4. 五子棋 (棋盘网格 + 黑白相间五子连珠)
  gomoku: `
    <svg viewBox="0 0 90 60" style="max-height: 48px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
      <rect x="8" y="8" width="74" height="44" rx="4" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2" />
      <line x1="8" y1="20" x2="82" y2="20" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      <line x1="8" y1="30" x2="82" y2="30" stroke="#D97706" stroke-width="1" />
      <line x1="8" y1="40" x2="82" y2="40" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      
      <line x1="22" y1="8" x2="22" y2="52" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      <line x1="33" y1="8" x2="33" y2="52" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      <line x1="45" y1="8" x2="45" y2="52" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      <line x1="57" y1="8" x2="57" y2="52" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />
      <line x1="68" y1="8" x2="68" y2="52" stroke="#D97706" stroke-width="0.8" stroke-dasharray="2 2" />

      <!-- 五连子 -->
      <circle cx="22" cy="30" r="4.5" fill="#18181b" />
      <circle cx="33" cy="30" r="4.5" fill="#18181b" />
      <circle cx="45" cy="30" r="4.5" fill="#18181b" />
      <circle cx="57" cy="30" r="4.5" fill="#FFFFFF" stroke="#18181b" stroke-width="1.5" />
      <circle cx="68" cy="30" r="4.5" fill="#FFFFFF" stroke="#18181b" stroke-width="1.5" />
    </svg>
  `,

  // 5. 飞行棋 (极简飞机线条)
  ludo: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M35 12 L28 18 L28 30 L10 40 L10 46 L28 41 L28 52 L22 57 L22 62 L32 59 L42 62 L42 57 L36 52 L36 41 L54 46 L54 40 L36 30 L36 18 Z" fill="#E0F2FE" />
    </svg>
  `,

  // 6. 大话骰 (左4点，右1点)
  'liars-dice': `
    <svg viewBox="0 0 90 60" style="max-height: 48px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="14" width="30" height="30" rx="6" fill="#FFFFFF" />
      <circle cx="22" cy="22" r="2.2" fill="#18181b" />
      <circle cx="36" cy="22" r="2.2" fill="#18181b" />
      <circle cx="22" cy="36" r="2.2" fill="#18181b" />
      <circle cx="36" cy="36" r="2.2" fill="#18181b" />

      <rect x="52" y="18" width="28" height="28" rx="6" fill="#FFFFFF" />
      <circle cx="66" cy="32" r="4.5" fill="#EF4444" stroke="#EF4444" />
    </svg>
  `,

  // 7. 害你在心口难开 (气泡 + 三颗小爱心)
  'dont-say-it': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 22 C20 16 27 12 37 12 C48 12 56 18 56 26 C56 35 48 40 37 40 C33 40 29 39 26 38 L18 44 L19 35 C17 32 16 29 16 26 C16 24 18 22 20 22 Z" fill="#FDF2F8" />
      <path d="M28 27 C26.5 24 24 26 26 28.5 L28 31 L30 28.5 C32 26 29.5 24 28 27 Z" fill="#F43F5E" stroke="none" />
      <path d="M37 27 C35.5 24 33 26 35 28.5 L37 31 L39 28.5 C41 26 38.5 24 37 27 Z" fill="#F43F5E" stroke="none" />
      <path d="M46 27 C44.5 24 42 26 44 28.5 L46 31 L48 28.5 C50 26 47.5 24 46 27 Z" fill="#F43F5E" stroke="none" />
    </svg>
  `,

  // 8. 你画我猜 (倾斜手绘铅笔)
  'draw-guess': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(10, 8)">
        <path d="M38 6 L46 14 L18 42 L10 44 L12 36 Z" fill="#FEF08A" />
        <line x1="33" y1="11" x2="41" y2="19" stroke-width="1.4" />
        <polygon points="10,44 14,43 11,40" fill="#18181b" />
      </g>
    </svg>
  `,

  // 9. 谁是卧底 (圆角矩形内的指纹纹路)
  undercover: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="16" y="14" width="38" height="42" rx="8" fill="#EEF2FF" />
      <path d="M31 34 C31 30 33 27 35 27 C37 27 39 30 39 34 L39 38" stroke="#4F46E5" />
      <path d="M27 36 C27 29 30 23 35 23 C40 23 43 29 43 36 L43 41" stroke="#4F46E5" />
      <path d="M35 34 L35 39" stroke="#4F46E5" />
      <path d="M24 42 C24 27 28 19 35 19 C42 19 46 27 46 42" stroke="#4F46E5" />
    </svg>
  `,

  // 10. 黑白棋 (方盒内的4颗黑白棋)
  reversi: `
    <svg viewBox="0 0 90 60" style="max-height: 48px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <rect x="14" y="15" width="62" height="30" rx="6" fill="#ECFDF5" />
      <circle cx="26" cy="30" r="5.5" fill="#18181b" />
      <circle cx="39" cy="30" r="5.5" fill="#FFFFFF" stroke="#18181b" stroke-width="1.5" />
      <circle cx="51" cy="30" r="5.5" fill="#18181b" />
      <circle cx="64" cy="30" r="5.5" fill="#FFFFFF" stroke="#18181b" stroke-width="1.5" />
    </svg>
  `,

  // 11. 四子棋 (立式圆孔网格盒)
  'connect-four': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="12" y="14" width="46" height="42" rx="6" fill="#93C5FD" />
      <circle cx="21" cy="23" r="3.5" fill="#E2E8F0" />
      <circle cx="30" cy="23" r="3.5" fill="#E2E8F0" />
      <circle cx="39" cy="23" r="3.5" fill="#E2E8F0" />
      <circle cx="48" cy="23" r="3.5" fill="#E2E8F0" />

      <circle cx="21" cy="33" r="3.5" fill="#E2E8F0" />
      <circle cx="30" cy="33" r="3.5" fill="#FBBF24" />
      <circle cx="39" cy="33" r="3.5" fill="#E2E8F0" />
      <circle cx="48" cy="33" r="3.5" fill="#E2E8F0" />

      <circle cx="21" cy="43" r="3.5" fill="#FBBF24" />
      <circle cx="30" cy="43" r="3.5" fill="#FBBF24" />
      <circle cx="39" cy="43" r="3.5" fill="#FBBF24" />
      <circle cx="48" cy="43" r="3.5" fill="#FFFFFF" />
    </svg>
  `,

  // 12. 数字炸弹 (圆形炸弹 + 火花)
  'number-bomb': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="32" cy="40" r="16" fill="#FFFFFF" />
      <rect x="40" y="22" width="6" height="4.5" rx="1" fill="#18181b" transform="rotate(35 43 24)" />
      <path d="M46 22 C50 19 51 14 55 15" stroke="#18181b" stroke-width="1.6" />
      <path d="M55 15 L59 11 M55 15 L61 17 M55 15 L58 20" stroke="#F59E0B" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  `,

  // 13. 同频选择 (三方同频对话气泡组)
  consensus: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 24 C18 18 24 15 32 15 C38 15 42 18 42 22 C42 26 38 29 32 29 L25 33 L26 28 C21 27 18 25 18 24 Z" fill="#DCFCE7" />
      <path d="M52 24 C52 18 46 15 38 15 C32 15 28 18 28 22 C28 26 32 29 38 29 L45 33 L44 28 C49 27 52 25 52 24 Z" fill="#DCFCE7" />
      <circle cx="35" cy="44" r="3.5" fill="#18181b" />
      <path d="M28 55 C28 50 31 48 35 48 C39 48 42 50 42 55" stroke-width="1.8" />
      <circle cx="23" cy="47" r="2.8" fill="#18181b" />
      <circle cx="47" cy="47" r="2.8" fill="#18181b" />
    </svg>
  `,

  // 14. 默契刻度 (半圆刻度表盘)
  wavelength: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 45 A 20 20 0 0 1 52 45" stroke-width="2.5" stroke="#2563EB" />
      <circle cx="35" cy="45" r="3.5" fill="#18181b" />
      <line x1="35" y1="45" x2="27" y2="30" stroke-width="2.2" stroke="#18181b" />
      <circle cx="35" cy="25" r="1.2" fill="#2563EB" />
    </svg>
  `,

  // 15. 真的假的 (双重戏剧面具)
  'two-truths-lie': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(10, 0)">
        <path d="M34 20 C41 20 48 26 48 37 C48 47 40 51 34 51 C28 51 20 47 20 37 C20 26 27 20 34 20 Z" fill="#FDF4FF" />
        <ellipse cx="28" cy="32" rx="1.5" ry="2.8" fill="#18181b" />
        <ellipse cx="40" cy="32" rx="1.5" ry="2.8" fill="#18181b" />
        <path d="M27 40 Q 34 46 41 40" stroke-width="1.4" />
      </g>
      <g transform="translate(-8, 8)">
        <path d="M32 18 C38 18 44 23 44 33 C44 42 36 46 32 46 C28 46 20 42 20 33 C20 23 26 18 32 18 Z" fill="#FFFFFF" />
        <ellipse cx="27" cy="30" rx="1.5" ry="2.2" fill="#18181b" />
        <ellipse cx="37" cy="30" rx="1.5" ry="2.2" fill="#18181b" />
        <path d="M27 38 Q 32 34 37 38" stroke-width="1.4" />
      </g>
    </svg>
  `,

  // 16. 涂鸦传话 (记事本 + 铅笔 + 气泡)
  telestrations: `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <rect x="18" y="16" width="32" height="38" rx="4" fill="#FEF3C7" />
      <line x1="24" y1="13" x2="24" y2="19" stroke-width="1.8" />
      <line x1="32" y1="13" x2="32" y2="19" stroke-width="1.8" />
      <line x1="40" y1="13" x2="40" y2="19" stroke-width="1.8" />
      <path d="M23 28 Q 30 25 39 28 Q 29 33 41 34" stroke="#18181b" stroke-width="1.2" />
      <path d="M48 30 C48 26 52 23 58 23 C63 23 66 26 66 29 C66 32 63 35 58 35 L54 38 L55 34 C51 34 48 32 48 30 Z" fill="#EFF6FF" stroke="#3B82F6" stroke-width="1.2" />
    </svg>
  `,

  // 17. 贪心骰子 (骰子 + 两枚金币)
  'greedy-dice': `
    <svg viewBox="0 0 80 60" style="max-height: 48px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(14, 10) rotate(-6 18 18)">
        <rect x="4" y="4" width="30" height="30" rx="6" fill="#FFFFFF" />
        <circle cx="11" cy="11" r="2.2" fill="#18181b" />
        <circle cx="27" cy="11" r="2.2" fill="#18181b" />
        <circle cx="19" cy="19" r="2.2" fill="#18181b" />
        <circle cx="11" cy="27" r="2.2" fill="#18181b" />
        <circle cx="27" cy="27" r="2.2" fill="#18181b" />
      </g>
      <circle cx="56" cy="44" r="6.5" fill="#FDE047" stroke="#CA8A04" stroke-width="1.4" />
      <circle cx="65" cy="30" r="5" fill="#FDE047" stroke="#CA8A04" stroke-width="1.4" />
    </svg>
  `,

  // 18. 海龟汤 (热气腾腾的汤碗 + 问号悬念)
  'turtle-soup': `
    <svg viewBox="0 0 70 70" style="max-height: 50px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M16 32 C16 48 24 54 35 54 C46 54 54 48 54 32 Z" fill="#F3E8FF" />
      <ellipse cx="35" cy="32" rx="19" ry="5.5" fill="#DDD6FE" stroke="#8B5CF6" stroke-width="1.4" />
      <path d="M26 23 Q 29 19 28 14" stroke="#8B5CF6" stroke-width="1.5" />
      <path d="M35 24 Q 38 18 36 12" stroke="#8B5CF6" stroke-width="1.5" />
      <path d="M44 23 Q 47 19 45 14" stroke="#8B5CF6" stroke-width="1.5" />
      <circle cx="35" cy="42" r="1.5" fill="#6D28D9" />
      <path d="M33 38 Q 35 36 37 38" stroke="#6D28D9" stroke-width="1.2" />
    </svg>
  `,

  // 19. 真心话大冒险 (爱心真心话 + 烈焰大冒险双联卡)
  'truth-or-dare': `
    <svg viewBox="0 0 90 60" style="max-height: 48px; width: auto;" fill="none" stroke="#18181b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- 真心话卡 (粉色爱心) -->
      <g transform="rotate(-10 32 30)">
        <rect x="18" y="10" width="28" height="40" rx="4" fill="#FFE4E6" stroke="#F43F5E" stroke-width="1.3" />
        <path d="M28 26 C26 23 23 25 25 28 L32 34 L39 28 C41 25 38 23 36 26 L32 29 Z" fill="#F43F5E" stroke="none" />
      </g>
      <!-- 大冒险卡 (金黄色烈焰/闪电) -->
      <g transform="rotate(10 58 30)">
        <rect x="44" y="10" width="28" height="40" rx="4" fill="#FEF3C7" stroke="#D97706" stroke-width="1.3" />
        <polygon points="58,18 52,30 57,30 54,42 64,28 59,28" fill="#F59E0B" stroke="#B45309" stroke-width="1" />
      </g>
    </svg>
  `,

  // 今晚主场大手绘铅笔
  heroPencil: `
    <svg viewBox="0 0 160 140" style="width: 100%; height: 100%;" fill="none" stroke="#18181b" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
      <g transform="translate(15, 10)">
        <path d="M96 16 L124 44 L44 124 L16 128 L20 100 Z" fill="#F8FAFC" />
        <line x1="82" y1="30" x2="110" y2="58" stroke-width="3.5" />
        <polygon points="16,128 26,126 18,118" fill="#18181b" />
      </g>
    </svg>
  `,

  // 快捷链接图标
  linkChain: `
    <svg viewBox="0 0 24 24" style="width: 28px; height: 28px;" fill="none" stroke="#18181b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
    </svg>
  `
};

window.GameIcons = GameIcons;
