/**
 * 硅基流动 AI 陪玩服务模块
 * 模型: Qwen/Qwen3.5-4B
 */

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || 'sk-cifnzjqgpjkcayxkjxzwwneqbgfcanvvkissqgtseokfhpyt';
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'Qwen/Qwen3.5-4B';

// 预置多位个性鲜明的 AI 陪玩伙伴
const AI_PROFILES = [
  {
    id: 'ai_maimai',
    name: '麦麦 (AI甜妹)',
    avatar: '🐱',
    personality: '你是一个活泼可爱、充满元气的游戏陪玩小妹，说话软萌、爱开玩笑、善于活跃气氛，经常用“哇”、“冲鸭”、“嘿嘿”等语气词。'
  },
  {
    id: 'ai_a强',
    name: '阿强 (AI智多星)',
    avatar: '🦊',
    personality: '你是一个机智过人、幽默风趣的桌游大神，擅长逻辑推理和概率分析，说话有点傲娇但很照顾大家，喜欢分析局势。'
  },
  {
    id: 'ai_dabao',
    name: '大宝 (AI呆萌)',
    avatar: '🐼',
    personality: '你是一个性格呆萌、爱吃爱笑的搞笑担当，偶尔会装糊涂或者语出惊人，给大家带来欢声笑语。'
  },
  {
    id: 'ai_xiaozhi',
    name: '小智 (AI军师)',
    avatar: '🦉',
    personality: '你是一个沉着冷静、出口成章的战术分析师，擅长推测别人的底牌和心理，说话条理清晰幽默沉稳。'
  },
  {
    id: 'ai_youyou',
    name: '悠悠 (AI歌姬)',
    avatar: '🐰',
    personality: '你是一个元气满满、喜欢哼歌的活力少女，总是给队友加油打气，说话带音符♪，超级热心。'
  },
  {
    id: 'ai_lele',
    name: '乐乐 (AI段子手)',
    avatar: '🐶',
    personality: '你是一个接梗达人、网络段子手，说话幽默风趣爱玩梗，是全场的欢乐源泉。'
  },
  {
    id: 'ai_xinxin',
    name: '星星 (AI预言家)',
    avatar: '🔮',
    personality: '你是一个自带神秘气场、喜欢靠“第六感直觉”预言局势的奇妙少女，说话充满灵气。'
  },
  {
    id: 'ai_kuangkuang',
    name: '狂狂 (AI莽夫)',
    avatar: '🦁',
    personality: '你是一个热情奔放、豪爽直接的行动派，不服就干、敢打敢拼，发言非常豪横可爱。'
  }
];

class AICompanionManager {
  constructor() {
    this.apiKey = SILICONFLOW_API_KEY;
    this.model = MODEL;
  }

  getRandomAI() {
    return AI_PROFILES[Math.floor(Math.random() * AI_PROFILES.length)];
  }

  getDistinctAI(existingNames = []) {
    const unchosen = AI_PROFILES.filter(p => !existingNames.includes(p.name));
    if (unchosen.length > 0) {
      return unchosen[Math.floor(Math.random() * unchosen.length)];
    }
    // 如果所有角色都用过，则追加序号编号
    const base = AI_PROFILES[Math.floor(Math.random() * AI_PROFILES.length)];
    let count = 2;
    let newName = `${base.name} #${count}`;
    while (existingNames.includes(newName)) {
      count++;
      newName = `${base.name} #${count}`;
    }
    return { ...base, name: newName };
  }

  // 统一带多级快速降级的高可用请求管道
  async _callChatCompletion(messages, maxTokens = 60, temperature = 0.8) {
    const candidateModels = [this.model, 'Qwen/Qwen2.5-7B-Instruct', 'deepseek-ai/DeepSeek-V4-Flash'];
    for (const mod of candidateModels) {
      try {
        const res = await fetch(SILICONFLOW_BASE_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: mod,
            messages: messages,
            max_tokens: maxTokens,
            temperature: temperature
          }),
          signal: AbortSignal.timeout(3500)
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content) return content.replace(/^["'“”]+|["'“”]+$/g, '');
        }
      } catch (_) {
        // 自动顺延到下一高可用模型节点
      }
    }
    return null;
  }

  // 基础聊天生成
  async generateChat(aiProfile, contextPrompt, userMessage) {
    try {
      const messages = [
        {
          role: 'system',
          content: `${aiProfile.personality}\n你正在一个在线聚会游戏房间里和朋友们一起玩游戏。\n当前游戏背景: ${contextPrompt}\n请用简短自然的一两句话回复（30字以内），像在微信群或游戏聊天框打字一样口语化，不要带有任何AI助手的机械腔，不要带引号。`
        },
        {
          role: 'user',
          content: userMessage || '跟大家打个招呼吧！'
        }
      ];

      return await this._callChatCompletion(messages, 60, 0.8);
    } catch (e) {
      console.error('[AI] Call failed:', e);
      return null;
    }
  }

  // 数字炸弹决策
  async makeBombGuess(aiProfile, min, max, bombNum) {
    // 概率性决策：80% 随机在安全区间，20% 稍微冒进，增加悬念
    const range = max - min;
    let guess;
    if (range <= 4) {
      // 范围只剩2-3个数，必须面对命运
      guess = min + 1;
    } else {
      // 靠近中间随机取一个
      const offset = Math.floor(range * (0.2 + Math.random() * 0.6));
      guess = Math.min(max - 1, Math.max(min + 1, min + offset));
    }

    // 让 AI 配一句台词
    let talk = `我猜 ${guess}！不会正好踩中吧？`;
    try {
      const prompt = `当前是数字炸弹游戏，范围缩至 ${min} ~ ${max}，你决定报出数字 ${guess}。`;
      const aiTalk = await this.generateChat(aiProfile, prompt, `说出你的猜测和心理活动（30字以内）`);
      if (aiTalk) talk = aiTalk;
    } catch (_) {}

    return { guess, talk };
  }

  // 你画我猜猜词尝试
  async makeDrawGuess(aiProfile, word, hint, elapsedSec) {
    // 根据时间推移逐渐猜中
    const isReadyToGuess = elapsedSec > 25 || Math.random() < 0.25;
    
    if (isReadyToGuess) {
      return {
        isCorrect: true,
        guess: word,
        talk: `我知道了！绝对是【${word}】！`
      };
    } else {
      // 生成一些有趣但接近的错误猜测
      const distractors = ['小猫', '皮卡丘', '冰淇淋', '大西瓜', '奥特曼', '太阳花', '小恐龙', '机器人', '汽车'];
      const wrongGuess = distractors[Math.floor(Math.random() * distractors.length)];
      return {
        isCorrect: false,
        guess: wrongGuess,
        talk: `画的是不是 ${wrongGuess} 啊？有点像又不太像哈哈`
      };
    }
  }

  // 谁是卧底：AI 口语化描述词条
  async describeUndercoverWord(aiProfile, word) {
    try {
      const messages = [
        {
          role: 'system',
          content: `${aiProfile.personality}\n你正在玩聚会桌游“谁是卧底”。你的秘密词语是【${word}】。\n规则：请用一句口语化、接地气、模棱两可的短句（15字以内）来描述它。绝对不能包含词语本身或同音字！既不要太直白让人一眼看穿，也不要太离谱。像微信聊天一样打字，不要带任何引号或前缀。`
        },
        {
          role: 'user',
          content: `请给出你对【${word}】的一句描述：`
        }
      ];

      const res = await this._callChatCompletion(messages, 40, 0.8);
      if (res) return res;
    } catch (_) {}

    // 备用通用接地气描述语
    const fallbacks = [
      '这个东西大家平时经常能碰见，挺常见的',
      '我觉得它非常实用，缺了它会很不方便',
      '跟生活息息相关，很多人每天都要用',
      '一般在特定场合会见到它，挺有存在感的',
      '大家都懂的吧，我就不多剧透啦~'
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // 海龟汤问题判断
  async judgeTurtleSoup(surface, bottom, question) {
    try {
      const messages = [
        {
          role: 'system',
          content: `你是一个海龟汤（情境推理游戏）的主持人。
汤面（题目）: ${surface}
汤底（真相）: ${bottom}
根据汤底真相，回答玩家的提问。
你必须且只能从以下四个标签中选择一个返回：【是】、【否】、【无关】、【关键信息】。
请仅输出标签本身，不要有多余文字。`
        },
        {
          role: 'user',
          content: question
        }
      ];

      const raw = await this._callChatCompletion(messages, 15, 0.2);
      if (raw) {
        let answer = '无关';
        if (raw.includes('是')) answer = '是';
        else if (raw.includes('否')) answer = '否';
        else if (raw.includes('关键')) answer = '关键信息';
        else if (raw.includes('无关')) answer = '无关';
        return { answer };
      }
    } catch (_) {}
    return { answer: '无关' };
  }
}

module.exports = new AICompanionManager();
