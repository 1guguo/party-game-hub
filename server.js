const { WebSocketServer } = require('ws');
const http = require('http');
const aiCompanion = require('./ai-companion');

const PORT = process.env.PORT || 3002;

// 内存中的游戏房间池
const rooms = new Map();
// 房间延迟清理定时器 (房主刷新或离开时保留 15 分钟)
const roomCleanTimers = new Map();

// 词库 (你画我猜)
const WORDS = [
  '皮卡丘', '珍珠奶茶', '火锅', '奥特曼', '打瞌睡', '过山车', '外星人', 
  '大熊猫', '程序员', '仙人掌', '热气球', '企鹅', '汉堡包', '吉他', 
  '暴风雨', '吃西瓜', '跳绳', '放风筝', '戴墨镜', '小黄鸭'
];

// 谁是卧底精选词对库 (平民词 vs 卧底词)
const UNDERCOVER_WORDS = [
  { civilian: '麦当劳', spy: '肯德基' },
  { civilian: '西瓜', spy: '哈密瓜' },
  { civilian: '水龙头', spy: '花洒' },
  { civilian: '保安', spy: '保镖' },
  { civilian: '辣椒', spy: '芥末' },
  { civilian: '牛肉干', spy: '猪肉脯' },
  { civilian: '眉毛', spy: '胡须' },
  { civilian: '自行车', spy: '电动车' },
  { civilian: '口红', spy: '唇膏' },
  { civilian: '微信', spy: 'QQ' },
  { civilian: '电影院', spy: '剧场' },
  { civilian: '包子', spy: '饺子' }
];

// 海龟汤精选题库 (汤面 vs 汤底)
const TURTLE_SOUP_PUZZLES = [
  {
    title: '一杯水与一把枪',
    surface: '一个男人走进一家酒吧，跟酒保要了一杯水。酒保从柜台下突然掏出一把枪指着他。男人停顿了一下，笑着说了句“谢谢”，然后转身离开了酒吧。请问发生了什么？',
    bottom: '男人一直在剧烈打嗝，极度难受想喝水压惊。酒保看出他在打嗝，突然掏枪是为了故意吓他一跳。被吓后男人的打嗝立刻好了，所以他由衷地说了声“谢谢”并离开。',
    keywords: ['打嗝', '吓唬', '治病', '水']
  },
  {
    title: '半根火柴',
    surface: '茫茫沙漠中躺着一个一丝不挂的男人，他手里紧紧握着半根折断的火柴。周围没有任何车痕或足迹。请问他是怎么死的？',
    bottom: '他和同伴乘热气球遭遇漏气故障下坠。为了减重，他们先丢弃了所有物资，甚至脱光衣物扔掉。依然不够重时，大家抽火柴决定谁跳下牺牲保全其他人。他抽中了这半根断火柴，被迫跳下摔死在沙漠中。',
    keywords: ['热气球', '抽签', '牺牲', '坠落']
  },
  {
    title: '牛吃草',
    surface: '一个男人在自家门前看到一只牛在低头安静地吃草，男人突然脸色苍白，绝望地自杀了。为什么？',
    bottom: '男人是个盲人，前一天在一场暴风雪中迷路。他凭触觉摸到冰冷粗糙的物体，以为是雪地里的墓碑或者绝境，殊不知自己其实已经安全走到了家门口的草坪。他以为自己永远走不出雪原陷入绝望而自尽，死后雪化了，牛才来吃草。',
    keywords: ['盲人', '暴风雪', '误判', '自杀']
  }
];

// 真心话大冒险精选库
const TRUTH_OR_DARE_LIST = {
  truth: [
    '手机里最后一张自拍是在什么情境下拍的？给大伙瞧一眼！',
    '你做过最社死、至今想起来还脚趾抓地的事情是什么？',
    '现场选一位朋友，说出他/她身上最吸引你的一个优点！',
    '你最近一次撒谎是为了什么？',
    '如果你可以拥有一种超能力，你最想拥有什么？为什么？',
    '你学生时代暗恋过的第一个人，现在还在联系吗？',
    '如果全世界只有你和在场的一位异性存活，你选谁？',
    '你最受不了伴侣或朋友的哪一种习惯？'
  ],
  dare: [
    '用夸张的话剧腔，声情并茂地朗读一条你手机里的垃圾短信！',
    '学一种小动物的叫声和动作，持续 10 秒钟！',
    '给你的微信置顶第 1 位好友发语音说：“其实我一直瞒着你一件事...我有超能力了！”',
    '现场给大家讲一个冷笑话，直到有人被冷笑为止！',
    '展示你的微信常用表情包前 3 个，并模仿其中一个表情！',
    '用方言或者夹子音说一段霸道总裁台词！',
    '闭上眼睛，让旁边的朋友在你手背上画一个小图案并猜是什么！'
  ]
};

function getActiveRoomsList() {
  const list = [];
  rooms.forEach(r => {
    list.push({
      code: r.code,
      gameId: r.gameId,
      gameTitle: r.gameTitle,
      playerCount: r.players.length,
      maxPlayers: r.maxPlayers,
      status: r.status,
      hostName: r.players[0]?.name || '神秘房主'
    });
  });
  return list;
}

function broadcastToAll(data) {
  const jsonStr = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      try { client.send(jsonStr); } catch (_) {}
    }
  });
}

function broadcastToRoom(room, data, excludeWs = null) {
  const jsonStr = JSON.stringify(data);
  room.players.forEach(p => {
    if (p.ws && p.ws.readyState === 1 && p.ws !== excludeWs) {
      try { p.ws.send(jsonStr); } catch (err) { console.error('Send error:', err); }
    }
  });
}

function getSafeRoomData(room) {
  return {
    code: room.code,
    gameId: room.gameId,
    gameTitle: room.gameTitle,
    maxPlayers: room.maxPlayers,
    status: room.status,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      ready: p.ready,
      score: p.score,
      isAI: !!p.isAI,
      online: p.online !== false
    })),
    messages: room.messages
  };
}

// HTTP 基础探针与 API 接口
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', activeRooms: rooms.size, time: new Date().toISOString() }));
  } else if (req.url === '/api/rooms') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ rooms: getActiveRoomsList() }));
  } else if (req.url === '/api/ai-chat' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { message } = JSON.parse(body || '{}');
        const ai = aiCompanion.getRandomAI();
        const reply = await aiCompanion.generateChat(ai, '聚会闲聊', message);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ aiName: ai.name, reply: reply || '哈哈，在呢在呢！' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Party Game Hub Real-time WebSocket & AI Server Running');
  }
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  let currentPlayer = null;
  let currentRoom = null;

  // 刚连接时下发当前所有活跃房间列表
  ws.send(JSON.stringify({
    type: 'active_rooms_list',
    rooms: getActiveRoomsList()
  }));

  ws.on('message', (msgBuffer) => {
    try {
      const msg = JSON.parse(msgBuffer.toString());
      handleMessage(ws, msg);
    } catch (e) {
      console.error('Invalid message JSON:', e);
    }
  });

  ws.on('close', () => {
    if (currentRoom && currentPlayer) {
      currentPlayer.online = false;
      currentPlayer.ws = null;

      // 检查当前房间是否还有在线的真人
      const remainingOnlineHumans = currentRoom.players.filter(p => !p.isAI && p.online !== false);

      if (remainingOnlineHumans.length === 0) {
        console.log(`Room [${currentRoom.code}] human count 0, scheduled for deletion in 15 mins.`);
        const timer = setTimeout(() => {
          if (rooms.has(currentRoom.code)) {
            const r = rooms.get(currentRoom.code);
            if (r.players.filter(p => !p.isAI && p.online !== false).length === 0) {
              if (r.drawTimer) clearInterval(r.drawTimer);
              if (r.aiGuessTimer) clearInterval(r.aiGuessTimer);
              rooms.delete(currentRoom.code);
              roomCleanTimers.delete(currentRoom.code);
              console.log(`Room [${currentRoom.code}] officially deleted.`);
              broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });
            }
          }
        }, 15 * 60 * 1000);
        roomCleanTimers.set(currentRoom.code, timer);
      } else {
        // 如果离线的是房主，自动顺延房主给在线真人
        if (currentPlayer.isHost) {
          remainingOnlineHumans[0].isHost = true;
        }

        currentRoom.messages.push({
          sender: '系统',
          text: `${currentPlayer.name} 暂时断开了连接`
        });

        broadcastToRoom(currentRoom, {
          type: 'room_state',
          room: getSafeRoomData(currentRoom)
        });
      }

      broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });
    }
  });

  function handleMessage(clientWs, msg) {
    switch (msg.type) {
      case 'get_rooms': {
        clientWs.send(JSON.stringify({
          type: 'active_rooms_list',
          rooms: getActiveRoomsList()
        }));
        break;
      }

      // 1. 创建房间
      case 'create_room': {
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        const pId = msg.playerId || ('p_' + Math.random().toString(36).substring(2, 9));
        currentPlayer = {
          id: pId,
          name: msg.name || '房主',
          avatar: msg.avatar || '🦊',
          isHost: true,
          ready: true,
          score: 0,
          online: true,
          ws: clientWs
        };

        const resolvedTitle = msg.gameTitle || getGameTitleById(msg.gameId) || '聚会游戏';
        const parsedMax = parseInt(msg.maxPlayers, 10) || 8;
        const maxPlayers = (msg.gameId === 'gomoku') ? 2 : parsedMax;

        currentRoom = {
          code: roomCode,
          gameId: msg.gameId || 'draw-guess',
          gameTitle: resolvedTitle,
          maxPlayers: maxPlayers,
          status: 'waiting',
          players: [currentPlayer],
          messages: [
            { sender: '系统', text: `房间 [${roomCode}] 创建成功！快点击【📋 复制链接】发到群里叫朋友来玩~` }
          ],
          drawGame: null,
          bombGame: null,
          gomokuGame: null,
          diceGame: null,
          undercoverGame: null,
          turtleSoupGame: null,
          truthDareGame: null,
          arenaGame: null
        };

        if (roomCleanTimers.has(roomCode)) {
          clearTimeout(roomCleanTimers.get(roomCode));
          roomCleanTimers.delete(roomCode);
        }

        rooms.set(roomCode, currentRoom);
        console.log(`Room [${roomCode}] (${resolvedTitle}) created by ${currentPlayer.name}`);

        clientWs.send(JSON.stringify({
          type: 'room_joined',
          myId: pId,
          room: getSafeRoomData(currentRoom)
        }));

        broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });
        break;
      }

      // 2. 加入房间 (支持重连与全新加入)
      case 'join_room': {
        const roomCode = (msg.roomCode || '').toString().trim();
        const targetRoom = rooms.get(roomCode);

        if (!targetRoom) {
          clientWs.send(JSON.stringify({
            type: 'error',
            message: `未找到房间号 [${roomCode}]！请确认房号，或自己点击【+】创建一个新房间~`
          }));
          return;
        }

        // 取消清理定时器
        if (roomCleanTimers.has(roomCode)) {
          clearTimeout(roomCleanTimers.get(roomCode));
          roomCleanTimers.delete(roomCode);
        }

        currentRoom = targetRoom;
        const pId = msg.playerId || ('p_' + Math.random().toString(36).substring(2, 9));

        // 检查是否是重连已有玩家
        let existingPlayer = targetRoom.players.find(p => p.id === pId || (p.name === msg.name && !p.isAI));
        if (existingPlayer) {
          existingPlayer.online = true;
          existingPlayer.ws = clientWs;
          if (msg.name) existingPlayer.name = msg.name;
          if (msg.avatar) existingPlayer.avatar = msg.avatar;
          currentPlayer = existingPlayer;
          console.log(`Player [${currentPlayer.name}] reconnected to room [${roomCode}]`);
        } else {
          if (targetRoom.players.length >= targetRoom.maxPlayers) {
            clientWs.send(JSON.stringify({
              type: 'error',
              message: `房间 [${roomCode}] 人数已满（${targetRoom.maxPlayers}人）！`
            }));
            return;
          }

          currentPlayer = {
            id: pId,
            name: msg.name || `玩家${currentRoom.players.length + 1}`,
            avatar: msg.avatar || '🐼',
            isHost: targetRoom.players.filter(p => !p.isAI && p.online !== false).length === 0,
            ready: true,
            score: 0,
            online: true,
            ws: clientWs
          };

          currentRoom.players.push(currentPlayer);
          currentRoom.messages.push({
            sender: '系统',
            text: `🎉 ${currentPlayer.name} 进房入座！`
          });
        }

        clientWs.send(JSON.stringify({
          type: 'room_joined',
          myId: currentPlayer.id,
          room: getSafeRoomData(currentRoom)
        }));

        broadcastToRoom(currentRoom, {
          type: 'room_state',
          room: getSafeRoomData(currentRoom)
        }, clientWs);

        broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });

        // 如果游戏已经进行中，向新进房者同步当前游戏状态
        syncCurrentGameState(currentRoom, clientWs, currentPlayer);
        break;
      }

      // 3. 【召唤 AI 陪玩入座】
      case 'add_ai': {
        if (!currentRoom) return;
        const availableSlots = currentRoom.maxPlayers - currentRoom.players.length;
        if (availableSlots <= 0) {
          clientWs.send(JSON.stringify({ type: 'error', message: '房间人数已满，无法再召唤 AI！' }));
          return;
        }

        const requestedCount = Math.max(1, parseInt(msg.count) || 1);
        const actualCount = Math.min(requestedCount, availableSlots);

        const addedAIs = [];
        for (let i = 0; i < actualCount; i++) {
          const existingNames = currentRoom.players.map(p => p.name);
          const ai = aiCompanion.getDistinctAI(existingNames);
          const aiPlayer = {
            id: 'ai_' + Math.random().toString(36).substring(2, 7),
            name: ai.name,
            avatar: ai.avatar,
            isHost: false,
            ready: true,
            score: 0,
            isAI: true,
            online: true,
            aiProfile: ai,
            ws: null
          };

          currentRoom.players.push(aiPlayer);
          addedAIs.push(ai);
        }
        
        const namesList = addedAIs.map(a => `【${a.name}】`).join('、');
        currentRoom.messages.push({
          sender: '系统',
          text: `🤖 AI 陪玩 ${namesList} 已加入房间（共 ${actualCount} 位，由 Qwen3.5-4B 驱动）！`
        });

        broadcastToRoom(currentRoom, {
          type: 'room_state',
          room: getSafeRoomData(currentRoom)
        });
        broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });

        // AI 依次热情打招呼（错开发送）
        addedAIs.forEach((ai, idx) => {
          setTimeout(async () => {
            if (!currentRoom) return;
            const greet = await aiCompanion.generateChat(ai, `房间创建，当前游戏是 ${currentRoom.gameTitle}`, '跟大家打个热情幽默的招呼');
            if (greet && currentRoom) {
              const chatMsg = {
                sender: ai.name,
                text: greet,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              };
              currentRoom.messages.push(chatMsg);
              broadcastToRoom(currentRoom, {
                type: 'chat_broadcast',
                message: chatMsg
              });
            }
          }, 400 + idx * 700);
        });
        break;
      }

      // 3.1 【移除特定 AI 陪玩】
      case 'remove_ai': {
        if (!currentRoom) return;
        const targetAiId = msg.aiId;
        const idx = currentRoom.players.findIndex(p => p.id === targetAiId && p.isAI);
        if (idx !== -1) {
          const removed = currentRoom.players.splice(idx, 1)[0];
          currentRoom.messages.push({
            sender: '系统',
            text: `👋 AI 陪玩【${removed.name}】已离开房间。`
          });
          broadcastToRoom(currentRoom, {
            type: 'room_state',
            room: getSafeRoomData(currentRoom)
          });
          broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });
        }
        break;
      }

      // 3.5 玩家名片实时更新 (头像 / 昵称)
      case 'update_profile': {
        if (!currentRoom || !currentPlayer) return;
        if (msg.name) currentPlayer.name = msg.name.trim().substring(0, 16);
        if (msg.avatar) currentPlayer.avatar = msg.avatar.trim();
        broadcastToRoom(currentRoom, {
          type: 'room_state',
          room: getSafeRoomData(currentRoom)
        });
        break;
      }

      // 4. 房间聊天与猜词互动
      case 'chat': {
        if (!currentRoom || !currentPlayer) return;
        const text = (msg.text || '').trim();
        if (!text) return;

        // 如果当前是【你画我猜】，检测猜词
        if (currentRoom.drawGame && currentRoom.drawGame.status === 'drawing') {
          if (currentPlayer.id !== currentRoom.drawGame.drawerId) {
            if (text === currentRoom.drawGame.word) {
              currentPlayer.score += 100;
              const drawer = currentRoom.players.find(p => p.id === currentRoom.drawGame.drawerId);
              if (drawer) drawer.score += 50;

              broadcastToRoom(currentRoom, {
                type: 'draw_guess_correct',
                winnerId: currentPlayer.id,
                winnerName: currentPlayer.name,
                word: currentRoom.drawGame.word,
                room: getSafeRoomData(currentRoom)
              });

              if (currentRoom.drawTimer) clearInterval(currentRoom.drawTimer);
              if (currentRoom.aiGuessTimer) clearInterval(currentRoom.aiGuessTimer);
              setTimeout(() => {
                nextDrawer(currentRoom);
              }, 3000);
              return;
            }
          }
        }

        // 如果当前是【海龟汤】，AI 自动判断汤面提问
        if (currentRoom.turtleSoupGame && !currentRoom.turtleSoupGame.isSolved) {
          handleTurtleSoupQuestion(currentRoom, currentPlayer, text);
        }

        const chatObj = {
          sender: currentPlayer.name,
          text: text,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        currentRoom.messages.push(chatObj);
        if (currentRoom.messages.length > 50) currentRoom.messages.shift();

        broadcastToRoom(currentRoom, {
          type: 'chat_broadcast',
          message: chatObj
        });

        // AI 智能接梗闲聊（若直接提及 AI、问话或带有 @ 则 100% 回复，常规闲聊约 65% 活跃互动）
        const aiPlayers = currentRoom.players.filter(p => p.isAI);
        const lowerText = text.toLowerCase();
        const isMentioned = aiPlayers.some(ai => text.includes(ai.name) || lowerText.includes('ai') || text.includes('@') || text.includes('机器人'));
        if (aiPlayers.length > 0 && (isMentioned || Math.random() < 0.65)) {
          const respondent = aiPlayers.find(ai => text.includes(ai.name)) || aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
          setTimeout(async () => {
            const reply = await aiCompanion.generateChat(
              respondent.aiProfile, 
              `当前游戏: ${currentRoom.gameTitle}，玩家【${currentPlayer.name}】说: "${text}"`,
              text
            );
            if (reply && currentRoom) {
              const aiChat = {
                sender: respondent.name,
                text: reply,
                time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              };
              currentRoom.messages.push(aiChat);
              broadcastToRoom(currentRoom, {
                type: 'chat_broadcast',
                message: aiChat
              });
            }
          }, 1200);
        }
        break;
      }

      // 5. 房主启动游戏 (支持全部 17 款游戏！)
      case 'start_game': {
        if (!currentRoom || !currentPlayer || !currentPlayer.isHost) return;
        const gameId = msg.gameId || currentRoom.gameId;
        currentRoom.status = 'playing';
        broadcastToAll({ type: 'active_rooms_list', rooms: getActiveRoomsList() });

        if (gameId === 'draw-guess' || gameId === 'draw-guess-card') {
          startDrawGame(currentRoom);
        } else if (gameId === 'number-bomb') {
          startBombGame(currentRoom);
        } else if (gameId === 'gomoku') {
          startGomokuGame(currentRoom);
        } else if (gameId === 'liars-dice') {
          startLiarsDiceGame(currentRoom);
        } else if (gameId === 'undercover' || gameId === 'who-is-the-spy') {
          startUndercoverGame(currentRoom);
        } else if (gameId === 'turtle-soup') {
          startTurtleSoupGame(currentRoom);
        } else if (gameId === 'truth-or-dare') {
          startTruthOrDareGame(currentRoom);
        } else {
          // 通用联机游戏对局房间 (UNO, 狼人杀, 阿瓦隆, 剧本杀, 飞行棋等)
          startGeneralArenaGame(currentRoom, gameId);
        }
        break;
      }

      // 6. 你画我猜画笔笔迹
      case 'draw_stroke': {
        if (!currentRoom || !currentRoom.drawGame) return;
        if (currentPlayer.id !== currentRoom.drawGame.drawerId) return;

        currentRoom.drawGame.historyStrokes.push(msg.stroke);
        broadcastToRoom(currentRoom, {
          type: 'draw_stroke',
          stroke: msg.stroke
        }, clientWs);
        break;
      }

      // 7. 你画我猜清屏
      case 'draw_clear': {
        if (!currentRoom || !currentRoom.drawGame) return;
        if (currentPlayer.id !== currentRoom.drawGame.drawerId) return;

        currentRoom.drawGame.historyStrokes = [];
        broadcastToRoom(currentRoom, {
          type: 'draw_clear'
        }, clientWs);
        break;
      }

      // 8. 数字炸弹猜数字
      case 'bomb_guess': {
        if (!currentRoom || !currentRoom.bombGame) return;
        handleBombGuess(currentRoom, currentPlayer, parseInt(msg.num));
        break;
      }

      // 9. 五子棋落子
      case 'gomoku_move': {
        if (!currentRoom || !currentRoom.gomokuGame) return;
        const gg = currentRoom.gomokuGame;
        if (gg.winner) return;

        // 验证回合所属人 (黑棋房主，白棋次玩家)
        const isBlack = currentPlayer.id === gg.blackPlayerId;
        const isWhite = currentPlayer.id === gg.whitePlayerId;
        if ((gg.turn === 'black' && !isBlack) || (gg.turn === 'white' && !isWhite)) {
          clientWs.send(JSON.stringify({ type: 'error', message: '还未轮到你的回合！' }));
          return;
        }

        const { r, c } = msg;
        if (gg.board[r][c]) return;

        gg.board[r][c] = gg.turn;
        gg.history.push({ r, c, turn: gg.turn, player: currentPlayer.name });

        if (checkGomokuWin(gg.board, r, c, gg.turn)) {
          gg.winner = gg.turn;
          gg.winnerName = currentPlayer.name;
        } else {
          gg.turn = gg.turn === 'black' ? 'white' : 'black';
        }

        broadcastToRoom(currentRoom, {
          type: 'gomoku_state',
          ...gg
        });

        handleAIGomokuMove(currentRoom);
        break;
      }

      // 10. 大话骰：叫点与开盅
      case 'dice_call': {
        if (!currentRoom || !currentRoom.diceGame) return;
        handleDiceCall(currentRoom, currentPlayer, msg.count, msg.pip);
        break;
      }

      case 'dice_showdown': {
        if (!currentRoom || !currentRoom.diceGame) return;
        handleDiceShowdown(currentRoom, currentPlayer);
        break;
      }

      case 'dice_reroll': {
        if (!currentRoom || !currentRoom.diceGame) return;
        if (currentPlayer.isHost) {
          startLiarsDiceGame(currentRoom);
        }
        break;
      }

      // 11. 谁是卧底：发言完毕推进与投票
      case 'undercover_speak_done': {
        if (!currentRoom || !currentRoom.undercoverGame) return;
        advanceUndercoverSpeaker(currentRoom);
        break;
      }

      case 'undercover_vote': {
        if (!currentRoom || !currentRoom.undercoverGame) return;
        handleUndercoverVote(currentRoom, currentPlayer, msg.targetId);
        break;
      }

      // 12. 海龟汤：揭晓答案
      case 'turtle_soup_solve': {
        if (!currentRoom || !currentRoom.turtleSoupGame) return;
        currentRoom.turtleSoupGame.isSolved = true;
        broadcastToRoom(currentRoom, {
          type: 'turtle_soup_state',
          ...currentRoom.turtleSoupGame
        });
        break;
      }

      // 13. 真心话大冒险：抽题
      case 'truth_or_dare_draw': {
        if (!currentRoom || !currentRoom.truthDareGame) return;
        handleTruthDareDraw(currentRoom, currentPlayer, msg.mode);
        break;
      }
    }
  }
});

function getGameTitleById(gameId) {
  const titles = {
    'draw-guess': '你画我猜',
    'number-bomb': '数字炸弹',
    'gomoku': '五子棋',
    'liars-dice': '大话骰',
    'undercover': '谁是卧底',
    'turtle-soup': '海龟汤',
    'truth-or-dare': '真心话大冒险',
    'uno': 'UNO',
    'werewolf': '狼人杀',
    'avalon': '阿瓦隆',
    'ludo': '飞行棋',
    'halli-galli': '德国心脏病',
    'forbidden-words': '害你在心口难开',
    'script-murder': '剧本杀',
    'who-is-the-spy': '谁是卧底',
    'two-rooms': '两间房与一颗炸弹',
    'codenames': '行动代号'
  };
  return titles[gameId] || '聚会游戏';
}

function syncCurrentGameState(room, clientWs, player) {
  if (room.drawGame) {
    clientWs.send(JSON.stringify({
      type: 'draw_round_start',
      drawerId: room.drawGame.drawerId,
      drawerName: room.drawGame.drawerName,
      isDrawer: player.id === room.drawGame.drawerId,
      wordHint: room.drawGame.word.length + ' 个字',
      timeLeft: room.drawGame.timeLeft,
      historyStrokes: room.drawGame.historyStrokes
    }));
  } else if (room.bombGame) {
    clientWs.send(JSON.stringify({
      type: 'bomb_state',
      ...room.bombGame
    }));
  } else if (room.gomokuGame) {
    clientWs.send(JSON.stringify({
      type: 'gomoku_state',
      ...room.gomokuGame
    }));
  } else if (room.diceGame) {
    sendDiceStateToPlayer(room, player);
  } else if (room.undercoverGame) {
    sendUndercoverStateToPlayer(room, player);
  } else if (room.turtleSoupGame) {
    clientWs.send(JSON.stringify({
      type: 'turtle_soup_state',
      ...room.turtleSoupGame
    }));
  } else if (room.truthDareGame) {
    clientWs.send(JSON.stringify({
      type: 'truth_dare_state',
      ...room.truthDareGame
    }));
  } else if (room.arenaGame) {
    clientWs.send(JSON.stringify({
      type: 'arena_state',
      ...room.arenaGame
    }));
  }
}

// ==========================================
// 1. 你画我猜
// ==========================================
function startDrawGame(room) {
  room.drawGame = {
    drawerIndex: -1,
    drawerId: null,
    drawerName: '',
    word: '',
    historyStrokes: [],
    timeLeft: 60,
    status: 'drawing',
    elapsed: 0
  };
  nextDrawer(room);
}

function nextDrawer(room) {
  if (!room.players || room.players.length === 0) return;
  const dg = room.drawGame;
  // 优先由真人玩家轮流画画，AI 陪玩作为热情猜词搭子
  const humanPlayers = room.players.filter(p => !p.isAI && p.online !== false);
  const eligibleDrawers = humanPlayers.length > 0 ? humanPlayers : room.players;

  dg.drawerIndex = ((dg.drawerIndex === undefined || dg.drawerIndex < 0 ? -1 : dg.drawerIndex) + 1) % eligibleDrawers.length;
  const drawer = eligibleDrawers[dg.drawerIndex];

  dg.drawerId = drawer.id;
  dg.drawerName = drawer.name;
  dg.word = WORDS[Math.floor(Math.random() * WORDS.length)];
  dg.historyStrokes = [];
  dg.timeLeft = 60;
  dg.elapsed = 0;
  dg.status = 'drawing';

  if (room.drawTimer) clearInterval(room.drawTimer);
  if (room.aiGuessTimer) clearInterval(room.aiGuessTimer);

  room.players.forEach(p => {
    if (p.ws && p.ws.readyState === 1) {
      const isDrawer = p.id === drawer.id;
      p.ws.send(JSON.stringify({
        type: 'draw_round_start',
        drawerId: drawer.id,
        drawerName: drawer.name,
        isDrawer: isDrawer,
        word: isDrawer ? dg.word : null,
        wordHint: dg.word.length + ' 个字',
        timeLeft: dg.timeLeft,
        historyStrokes: []
      }));
    }
  });

  // AI 实时猜词
  const aiGuessers = room.players.filter(p => p.isAI && p.id !== drawer.id);
  if (aiGuessers.length > 0) {
    room.aiGuessTimer = setInterval(async () => {
      dg.elapsed += 12;
      const ai = aiGuessers[Math.floor(Math.random() * aiGuessers.length)];
      const guessRes = await aiCompanion.makeDrawGuess(ai.aiProfile, dg.word, dg.word.length, dg.elapsed);

      if (guessRes && dg.status === 'drawing') {
        const aiMsg = {
          sender: ai.name,
          text: guessRes.guess,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        room.messages.push(aiMsg);
        broadcastToRoom(room, { type: 'chat_broadcast', message: aiMsg });

        if (guessRes.isCorrect) {
          ai.score += 100;
          drawer.score += 50;
          clearInterval(room.drawTimer);
          clearInterval(room.aiGuessTimer);
          broadcastToRoom(room, {
            type: 'draw_guess_correct',
            winnerId: ai.id,
            winnerName: ai.name,
            word: dg.word,
            room: getSafeRoomData(room)
          });
          setTimeout(() => nextDrawer(room), 3000);
        }
      }
    }, 12000);
  }

  // 倒计时
  room.drawTimer = setInterval(() => {
    dg.timeLeft--;
    broadcastToRoom(room, {
      type: 'draw_tick',
      timeLeft: dg.timeLeft
    });

    if (dg.timeLeft <= 0) {
      clearInterval(room.drawTimer);
      if (room.aiGuessTimer) clearInterval(room.aiGuessTimer);
      broadcastToRoom(room, {
        type: 'draw_timeout',
        word: dg.word
      });
      setTimeout(() => {
        nextDrawer(room);
      }, 3000);
    }
  }, 1000);
}

// ==========================================
// 2. 数字炸弹
// ==========================================
function startBombGame(room) {
  const bomb = Math.floor(2 + Math.random() * 97);
  room.bombGame = {
    min: 1,
    max: 100,
    bomb: bomb,
    currentTurnId: room.players[0].id,
    currentTurnName: room.players[0].name,
    history: [],
    isOver: false,
    boomedPlayer: null
  };
  broadcastToRoom(room, {
    type: 'bomb_state',
    ...room.bombGame
  });

  // 如果首位猜数者是 AI，自动起步猜数
  if (room.players[0].isAI) {
    setTimeout(async () => {
      if (!room.bombGame || room.bombGame.isOver) return;
      const aiResult = await aiCompanion.makeBombGuess(room.players[0].aiProfile, 1, 100, bomb);
      if (aiResult.talk) {
        const aiChat = {
          sender: room.players[0].name,
          text: aiResult.talk,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        room.messages.push(aiChat);
        broadcastToRoom(room, { type: 'chat_broadcast', message: aiChat });
      }
      setTimeout(() => {
        handleBombGuess(room, room.players[0], aiResult.guess);
      }, 800);
    }, 1500);
  }
}

function handleBombGuess(room, player, guessNum) {
  const bg = room.bombGame;
  if (!bg || bg.isOver) return;
  if (isNaN(guessNum) || guessNum <= bg.min || guessNum >= bg.max) return;

  if (guessNum === bg.bomb) {
    bg.isOver = true;
    bg.boomedPlayer = player.name;
    bg.history.unshift({ player: player.name, num: guessNum, result: 'BOOM!' });
    broadcastToRoom(room, {
      type: 'bomb_state',
      ...bg
    });
  } else {
    if (guessNum < bg.bomb) {
      bg.min = guessNum;
    } else {
      bg.max = guessNum;
    }
    bg.history.unshift({ player: player.name, num: guessNum, result: '安全' });

    const pList = room.players;
    const curIdx = pList.findIndex(p => p.id === bg.currentTurnId);
    const nextIdx = (curIdx + 1) % pList.length;
    bg.currentTurnId = pList[nextIdx].id;
    bg.currentTurnName = pList[nextIdx].name;

    broadcastToRoom(room, {
      type: 'bomb_state',
      ...bg
    });

    const nextPlayer = pList[nextIdx];
    if (nextPlayer.isAI && !bg.isOver) {
      setTimeout(async () => {
        const aiResult = await aiCompanion.makeBombGuess(nextPlayer.aiProfile, bg.min, bg.max, bg.bomb);
        if (aiResult.talk) {
          const aiChat = {
            sender: nextPlayer.name,
            text: aiResult.talk,
            time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
          };
          room.messages.push(aiChat);
          broadcastToRoom(room, { type: 'chat_broadcast', message: aiChat });
        }
        setTimeout(() => {
          handleBombGuess(room, nextPlayer, aiResult.guess);
        }, 800);
      }, 1500);
    }
  }
}

// ==========================================
// 3. 五子棋 (启发式智能 AI + 连珠攻防算法)
// ==========================================
function startGomokuGame(room) {
  room.gomokuGameCount = (room.gomokuGameCount || 0) + 1;
  // 多局对战轮流执黑执白
  const isSwap = room.players.length > 1 && (room.gomokuGameCount % 2 === 0);
  const p1 = isSwap ? room.players[1] : room.players[0];
  const p2 = isSwap ? room.players[0] : (room.players[1] || room.players[0]);
  room.gomokuGame = {
    board: Array.from({ length: 15 }, () => Array(15).fill(null)),
    turn: 'black',
    blackPlayerId: p1.id,
    blackPlayerName: p1.name,
    whitePlayerId: p2.id,
    whitePlayerName: p2.name,
    winner: null,
    winnerName: null,
    history: []
  };
  broadcastToRoom(room, {
    type: 'gomoku_state',
    ...room.gomokuGame
  });

  // 如果黑棋（先手）是 AI，自动下在中心天元 (7, 7)
  if (p1.isAI) {
    setTimeout(() => {
      handleAIGomokuMove(room);
    }, 800);
  }
}

// 启发式五子棋棋型评估：统计某个空位 (r,c) 对指定方产生的战术价值
function evaluateGomokuPosition(board, r, c, turn) {
  const dirs = [
    [0, 1],   // 水平
    [1, 0],   // 垂直
    [1, 1],   // 主对角
    [1, -1]   // 副对角
  ];

  let totalScore = 0;

  for (const [dr, dc] of dirs) {
    let count = 1;
    let openEnds = 0;

    // 正向延伸
    let step = 1;
    while (true) {
      const nr = r + dr * step;
      const nc = c + dc * step;
      if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) break;
      if (board[nr][nc] === turn) {
        count++;
        step++;
      } else if (board[nr][nc] === null) {
        openEnds++;
        break;
      } else {
        break; // 敌方阻挡
      }
    }

    // 反向延伸
    step = 1;
    while (true) {
      const nr = r - dr * step;
      const nc = c - dc * step;
      if (nr < 0 || nr >= 15 || nc < 0 || nc >= 15) break;
      if (board[nr][nc] === turn) {
        count++;
        step++;
      } else if (board[nr][nc] === null) {
        openEnds++;
        break;
      } else {
        break;
      }
    }

    // 棋型权重评分
    if (count >= 5) {
      totalScore += 100000; // 成五连珠，绝杀！
    } else if (count === 4) {
      if (openEnds === 2) totalScore += 15000; // 活四，必胜！
      else if (openEnds === 1) totalScore += 4500;  // 冲四，强进攻
    } else if (count === 3) {
      if (openEnds === 2) totalScore += 2200;  // 活三，关键点
      else if (openEnds === 1) totalScore += 500;   // 眠三
    } else if (count === 2) {
      if (openEnds === 2) totalScore += 200;   // 活二
      else if (openEnds === 1) totalScore += 40;    // 眠二
    }
  }

  return totalScore;
}

function handleAIGomokuMove(room) {
  const gg = room.gomokuGame;
  if (!gg || gg.winner) return;

  const currentRole = gg.turn;
  const currentAI = room.players.find(p => (currentRole === 'white' ? p.id === gg.whitePlayerId : p.id === gg.blackPlayerId));
  if (!currentAI || !currentAI.isAI) return;

  setTimeout(() => {
    const enemyRole = currentRole === 'white' ? 'black' : 'white';
    let bestR = -1, bestC = -1, maxScore = -1;
    let isBlockMove = false;

    // 如果是第一步且棋盘全空，优先天元 (7, 7)
    if (!gg.board[7][7] && gg.history.length === 0) {
      bestR = 7;
      bestC = 7;
    } else {
      for (let r = 0; r < 15; r++) {
        for (let c = 0; c < 15; c++) {
          if (!gg.board[r][c]) {
            // 我方进攻收益
            const myAttack = evaluateGomokuPosition(gg.board, r, c, currentRole);
            // 敌方防守拦截收益（阻挡对手）
            const enemyThreat = evaluateGomokuPosition(gg.board, r, c, enemyRole);

            // 中心位置微权 + 随机扰动（防止走法呆板）
            const centerDistBonus = (14 - Math.abs(r - 7) - Math.abs(c - 7)) * 1.5;
            const jitter = Math.floor(Math.random() * 8);

            // 进攻权重大于防守，但当敌方有冲四/活四/五连威胁时立刻强力阻挡
            let score = myAttack * 1.25 + enemyThreat * 1.05 + centerDistBonus + jitter;

            if (myAttack >= 100000) {
              score += 1000000; // 直接获胜最高优先级
            } else if (enemyThreat >= 100000 || enemyThreat >= 15000) {
              score += 500000;  // 必须封堵敌方连五或活四
              isBlockMove = true;
            }

            if (score > maxScore) {
              maxScore = score;
              bestR = r;
              bestC = c;
            }
          }
        }
      }
    }

    if (bestR !== -1) {
      gg.board[bestR][bestC] = currentRole;
      gg.history.push({ r: bestR, c: bestC, turn: currentRole, player: currentAI.name });

      if (checkGomokuWin(gg.board, bestR, bestC, currentRole)) {
        gg.winner = currentRole;
        gg.winnerName = currentAI.name;
      } else {
        gg.turn = currentRole === 'white' ? 'black' : 'white';
      }

      broadcastToRoom(room, { type: 'gomoku_state', ...gg });

      // AI 个性化下棋台词
      let talk = '';
      if (gg.winner === currentRole) {
        talk = '🎉 哈哈，五子连成一线，承让啦~';
      } else if (isBlockMove) {
        talk = '哼哼，想在这里连珠？被我识破截断啦！';
      } else if (Math.random() < 0.35) {
        const funTalks = ['看我这步走得怎么样？', '该你了哦，思考一下吧~', '稳扎稳打，步步为营！', '有攻有守，刺激！'];
        talk = funTalks[Math.floor(Math.random() * funTalks.length)];
      }

      if (talk) {
        const aiMsg = {
          sender: currentAI.name,
          text: talk,
          time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
        };
        room.messages.push(aiMsg);
        broadcastToRoom(room, { type: 'chat_broadcast', message: aiMsg });
      }
    }
  }, 650);
}

function checkGomokuWin(board, r, c, turn) {
  const dirs = [
    [[0, 1], [0, -1]],
    [[1, 0], [-1, 0]],
    [[1, 1], [-1, -1]],
    [[1, -1], [-1, 1]]
  ];
  for (const dir of dirs) {
    let count = 1;
    for (const [dr, dc] of dir) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 15 && nc >= 0 && nc < 15 && board[nr][nc] === turn) {
        count++;
        nr += dr;
        nc += dc;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

// ==========================================
// 4. 大话骰 (全真联机对决)
// ==========================================
function startLiarsDiceGame(room) {
  const playerDices = {};
  room.players.forEach(p => {
    playerDices[p.id] = Array.from({ length: 5 }, () => Math.floor(Math.random() * 6) + 1);
  });

  room.diceGame = {
    dices: playerDices,
    currentTurnId: room.players[0].id,
    currentTurnName: room.players[0].name,
    lastCall: null,
    showdown: null,
    isOver: false
  };

  room.players.forEach(p => {
    sendDiceStateToPlayer(room, p);
  });

  // 如果首位叫点者是 AI，自动发起第一手报数
  if (room.players[0].isAI) {
    setTimeout(() => {
      if (!room.diceGame || room.diceGame.isOver || room.diceGame.lastCall) return;
      const aiDices = playerDices[room.players[0].id] || [2, 3, 4, 5, 6];
      const counts = {};
      aiDices.forEach(d => counts[d] = (counts[d] || 0) + 1);
      let bestPip = 5, maxC = 0;
      for (const [pip, c] of Object.entries(counts)) {
        if (c > maxC) { maxC = c; bestPip = parseInt(pip, 10); }
      }
      handleDiceCall(room, room.players[0], Math.max(2, maxC), bestPip);
    }, 1500);
  }
}

function sendDiceStateToPlayer(room, player) {
  if (!room.diceGame || !player.ws || player.ws.readyState !== 1) return;
  const dg = room.diceGame;
  player.ws.send(JSON.stringify({
    type: 'dice_state',
    myDice: dg.dices[player.id] || [1, 2, 3, 4, 5],
    currentTurnId: dg.currentTurnId,
    currentTurnName: dg.currentTurnName,
    lastCall: dg.lastCall,
    showdown: dg.showdown,
    isOver: dg.isOver,
    playerCount: room.players.length
  }));
}

function handleDiceCall(room, player, count, pip) {
  const dg = room.diceGame;
  if (!dg || dg.isOver) return;
  if (player.id !== dg.currentTurnId) return;

  dg.lastCall = {
    callerId: player.id,
    callerName: player.name,
    count: parseInt(count),
    pip: parseInt(pip)
  };

  const pList = room.players;
  const curIdx = pList.findIndex(p => p.id === dg.currentTurnId);
  const nextIdx = (curIdx + 1) % pList.length;
  dg.currentTurnId = pList[nextIdx].id;
  dg.currentTurnName = pList[nextIdx].name;

  room.players.forEach(p => sendDiceStateToPlayer(room, p));

  // AI 叫点或开盅
  const nextPlayer = pList[nextIdx];
  if (nextPlayer.isAI && !dg.isOver) {
    setTimeout(() => {
      const myDices = dg.dices[nextPlayer.id] || [];
      const matchCount = myDices.filter(d => d === pip || d === 1).length;
      // 简单博弈概率：如果对方叫点很大，开！否则加注叫点
      if (count >= Math.max(3, room.players.length * 2)) {
        handleDiceShowdown(room, nextPlayer);
      } else {
        const nextCount = count + 1;
        const nextPip = Math.max(pip, Math.floor(Math.random() * 6) + 1);
        handleDiceCall(room, nextPlayer, nextCount, nextPip);
      }
    }, 1500);
  }
}

function handleDiceShowdown(room, challenger) {
  const dg = room.diceGame;
  if (!dg || !dg.lastCall) return;

  const targetCall = dg.lastCall;
  let totalMatches = 0;
  const allPlayerDices = [];

  room.players.forEach(p => {
    const diceList = dg.dices[p.id] || [];
    const hits = diceList.filter(d => d === targetCall.pip || d === 1).length;
    totalMatches += hits;
    allPlayerDices.push({
      id: p.id,
      name: p.name,
      dices: diceList,
      hits: hits
    });
  });

  const success = totalMatches >= targetCall.count;
  const loserName = success ? challenger.name : targetCall.callerName;

  dg.showdown = {
    challengerName: challenger.name,
    targetCall: targetCall,
    totalMatches: totalMatches,
    success: success,
    loserName: loserName,
    allDices: allPlayerDices
  };
  dg.isOver = true;

  room.players.forEach(p => sendDiceStateToPlayer(room, p));
}

// ==========================================
// 5. 谁是卧底 (Undercover 阵营推理 + AI 自动发言与投票)
// ==========================================
function startUndercoverGame(room) {
  const pair = UNDERCOVER_WORDS[Math.floor(Math.random() * UNDERCOVER_WORDS.length)];
  const players = room.players;
  const spyIdx = Math.floor(Math.random() * players.length);

  const playerRoles = {};
  players.forEach((p, idx) => {
    const isSpy = idx === spyIdx;
    playerRoles[p.id] = {
      isSpy: isSpy,
      word: isSpy ? pair.spy : pair.civilian,
      alive: true,
      votes: 0
    };
  });

  const aliveList = players.filter(p => playerRoles[p.id]?.alive);

  room.undercoverGame = {
    roles: playerRoles,
    civilianWord: pair.civilian,
    spyWord: pair.spy,
    currentSpeakerIdx: 0,
    currentSpeakerId: aliveList[0]?.id,
    currentSpeakerName: aliveList[0]?.name,
    spokenIds: [],
    phase: 'speaking', // 'speaking', 'voting', 'over'
    round: 1,
    winner: null,
    voteRecords: {}
  };

  room.players.forEach(p => {
    sendUndercoverStateToPlayer(room, p);
  });

  // 检查首个发言者是否是 AI
  checkAndTriggerUndercoverAISpeaking(room);
}

function checkAndTriggerUndercoverAISpeaking(room) {
  const ug = room.undercoverGame;
  if (!ug || ug.phase !== 'speaking') return;

  const speaker = room.players.find(p => p.id === ug.currentSpeakerId);
  if (!speaker || !speaker.isAI) return;

  setTimeout(async () => {
    if (!room.undercoverGame || room.undercoverGame.phase !== 'speaking') return;
    const aiRole = ug.roles[speaker.id];
    const word = aiRole ? aiRole.word : '神秘物品';

    const description = await aiCompanion.describeUndercoverWord(speaker.aiProfile, word);

    const aiMsg = {
      sender: speaker.name,
      text: `🗣️ [发言] ${description}`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    room.messages.push(aiMsg);
    broadcastToRoom(room, { type: 'chat_broadcast', message: aiMsg });

    // 延时推进给下一位
    setTimeout(() => {
      advanceUndercoverSpeaker(room);
    }, 1200);
  }, 1500);
}

function advanceUndercoverSpeaker(room) {
  const ug = room.undercoverGame;
  if (!ug || ug.phase !== 'speaking') return;

  if (!ug.spokenIds) ug.spokenIds = [];
  if (!ug.spokenIds.includes(ug.currentSpeakerId)) {
    ug.spokenIds.push(ug.currentSpeakerId);
  }

  const aliveList = room.players.filter(p => ug.roles[p.id]?.alive);
  const remainingSpeakers = aliveList.filter(p => !ug.spokenIds.includes(p.id));

  if (remainingSpeakers.length === 0) {
    // 全员发言完毕，转入投票阶段
    ug.phase = 'voting';
    ug.spokenIds = [];
    ug.voteRecords = {};
    room.messages.push({
      sender: '系统',
      text: `🔔 第 ${ug.round} 轮发言结束！请所有玩家综合线索，投票选出潜藏的卧底嫌疑人！`
    });
    room.players.forEach(p => sendUndercoverStateToPlayer(room, p));

    // 触发 AI 玩家自动投票
    triggerAIUndercoverVotes(room);
  } else {
    // 推进给下一位存活玩家
    const nextSpeaker = remainingSpeakers[0];
    ug.currentSpeakerId = nextSpeaker.id;
    ug.currentSpeakerName = nextSpeaker.name;
    room.players.forEach(p => sendUndercoverStateToPlayer(room, p));

    // 如果下一位是 AI，继续触发 AI 发言
    checkAndTriggerUndercoverAISpeaking(room);
  }
}

function triggerAIUndercoverVotes(room) {
  const ug = room.undercoverGame;
  if (!ug || ug.phase !== 'voting') return;

  const alivePlayers = room.players.filter(p => ug.roles[p.id]?.alive);
  const aliveAIs = alivePlayers.filter(p => p.isAI);

  aliveAIs.forEach((aiPlayer, idx) => {
    setTimeout(() => {
      if (!room.undercoverGame || room.undercoverGame.phase !== 'voting') return;
      if (ug.voteRecords[aiPlayer.id]) return; // 已投过

      // 在除自己以外的活着的玩家中挑一个投
      const candidates = alivePlayers.filter(p => p.id !== aiPlayer.id);
      if (candidates.length > 0) {
        const target = candidates[Math.floor(Math.random() * candidates.length)];
        handleUndercoverVote(room, aiPlayer, target.id);
      }
    }, 1200 + idx * 600);
  });
}

function sendUndercoverStateToPlayer(room, player) {
  if (!room.undercoverGame || !player.ws || player.ws.readyState !== 1) return;
  const ug = room.undercoverGame;
  const myRole = ug.roles[player.id];

  player.ws.send(JSON.stringify({
    type: 'undercover_state',
    myWord: myRole ? myRole.word : '***',
    isSpy: ug.phase === 'over' ? myRole?.isSpy : undefined,
    currentSpeakerId: ug.currentSpeakerId,
    currentSpeakerName: ug.currentSpeakerName,
    phase: ug.phase,
    round: ug.round,
    winner: ug.winner,
    alivePlayers: room.players.filter(p => ug.roles[p.id]?.alive).map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost
    })),
    voteRecords: ug.voteRecords,
    civilianWord: ug.phase === 'over' ? ug.civilianWord : null,
    spyWord: ug.phase === 'over' ? ug.spyWord : null
  }));
}

function handleUndercoverVote(room, voter, targetId) {
  const ug = room.undercoverGame;
  if (!ug || ug.phase !== 'voting') return;

  ug.voteRecords[voter.id] = targetId;

  const alivePlayers = room.players.filter(p => ug.roles[p.id]?.alive);
  if (Object.keys(ug.voteRecords).length >= alivePlayers.length) {
    // 统计投票淘汰者
    const counts = {};
    Object.values(ug.voteRecords).forEach(tid => {
      counts[tid] = (counts[tid] || 0) + 1;
    });

    let maxTid = null, maxCount = -1;
    for (const [tid, c] of Object.entries(counts)) {
      if (c > maxCount) {
        maxCount = c;
        maxTid = tid;
      }
    }

    const eliminated = room.players.find(p => p.id === maxTid);
    if (eliminated && ug.roles[eliminated.id]) {
      ug.roles[eliminated.id].alive = false;
      const wasSpy = ug.roles[eliminated.id].isSpy;

      room.messages.push({
        sender: '系统',
        text: `🗳️ 投票结束！【${eliminated.name}】获得最多票数被放逐！真实身份是：${wasSpy ? '😈 卧底！' : '😇 平民！'}`
      });

      // 胜负判断
      const remainingSpies = room.players.filter(p => ug.roles[p.id]?.alive && ug.roles[p.id]?.isSpy);
      const remainingCivilians = room.players.filter(p => ug.roles[p.id]?.alive && !ug.roles[p.id]?.isSpy);

      if (remainingSpies.length === 0) {
        ug.phase = 'over';
        ug.winner = '平民胜利';
      } else if (remainingCivilians.length <= remainingSpies.length) {
        ug.phase = 'over';
        ug.winner = '卧底胜利';
      } else {
        ug.phase = 'speaking';
        ug.round++;
        ug.voteRecords = {};
        ug.spokenIds = [];
        const aliveList = room.players.filter(p => ug.roles[p.id]?.alive);
        ug.currentSpeakerId = aliveList[0]?.id;
        ug.currentSpeakerName = aliveList[0]?.name;
        // 新一轮如果是 AI 先发言，触发 AI
        checkAndTriggerUndercoverAISpeaking(room);
      }
    }

    room.players.forEach(p => sendUndercoverStateToPlayer(room, p));
  } else {
    room.players.forEach(p => sendUndercoverStateToPlayer(room, p));
  }
}

// ==========================================
// 6. 海龟汤 (情境推理)
// ==========================================
function startTurtleSoupGame(room) {
  const puzzle = TURTLE_SOUP_PUZZLES[Math.floor(Math.random() * TURTLE_SOUP_PUZZLES.length)];
  room.turtleSoupGame = {
    title: puzzle.title,
    surface: puzzle.surface,
    bottom: puzzle.bottom,
    isSolved: false,
    questions: []
  };
  broadcastToRoom(room, {
    type: 'turtle_soup_state',
    ...room.turtleSoupGame
  });
}

function handleTurtleSoupQuestion(room, player, text) {
  const tg = room.turtleSoupGame;
  if (!tg || tg.isSolved) return;
  const cleanQ = text.replace(/^【汤面提问】/, '').trim();
  if (!cleanQ) return;

  // AI 智能担任主持人回答：是 / 否 / 无关 / 关键信息
  setTimeout(async () => {
    const aiJudge = await aiCompanion.judgeTurtleSoup(tg.surface, tg.bottom, cleanQ);
    const qRecord = {
      player: player.name,
      question: cleanQ,
      answer: aiJudge.answer || '无关', // '是', '否', '无关', '关键'
      hint: aiJudge.hint || ''
    };
    tg.questions.unshift(qRecord);
    if (tg.questions.length > 30) tg.questions.pop();

    broadcastToRoom(room, {
      type: 'turtle_soup_state',
      ...tg
    });
  }, 1000);
}

// ==========================================
// 7. 真心话大冒险
// ==========================================
function startTruthOrDareGame(room) {
  const targetPlayer = room.players[0];
  const initialMode = 'truth';
  const initialPrompt = TRUTH_OR_DARE_LIST.truth[0];

  room.truthDareGame = {
    currentMode: initialMode,
    targetPlayer: targetPlayer.name,
    content: initialPrompt,
    history: []
  };
  broadcastToRoom(room, {
    type: 'truth_dare_state',
    ...room.truthDareGame
  });

  // 如果首位玩家是 AI，自动接招作答
  if (targetPlayer.isAI) {
    triggerAITruthDareReply(room, targetPlayer, initialMode, initialPrompt);
  }
}

function handleTruthDareDraw(room, player, mode) {
  const list = TRUTH_OR_DARE_LIST[mode] || TRUTH_OR_DARE_LIST.truth;
  const prompt = list[Math.floor(Math.random() * list.length)];
  const randomPlayer = room.players[Math.floor(Math.random() * room.players.length)];

  room.truthDareGame = {
    currentMode: mode,
    targetPlayer: randomPlayer.name,
    content: prompt,
    history: room.truthDareGame?.history || []
  };
  room.truthDareGame.history.unshift({
    player: randomPlayer.name,
    mode: mode === 'truth' ? '真心话' : '大冒险',
    content: prompt
  });

  broadcastToRoom(room, {
    type: 'truth_dare_state',
    ...room.truthDareGame
  });

  // 如果抽中 AI 玩家，由 Qwen3.5 自动回答真心话或表态大冒险！
  if (randomPlayer.isAI) {
    triggerAITruthDareReply(room, randomPlayer, mode, prompt);
  }
}

function triggerAITruthDareReply(room, aiPlayer, mode, prompt) {
  setTimeout(async () => {
    if (!room.truthDareGame) return;
    const sysPrompt = `你正在玩聚会桌游【真心话大冒险】，你被选为执行人。\n模式: ${mode === 'truth' ? '真心话' : '大冒险'}\n题目: ${prompt}\n规则: 请以你的角色口吻说出你的回答或接下挑战后的表态（30字以内），幽默真实口语化，不要带引号。`;
    const aiReply = await aiCompanion.generateChat(aiPlayer.aiProfile, sysPrompt, `面对这个${mode === 'truth' ? '真心话' : '大冒险'}题目给出你的回应：`);
    const replyText = aiReply || (mode === 'truth' ? '哈哈这个问题太犀利了，我就老实招了吧~' : '大冒险我接了！看我当场整活~');
    
    const aiMsg = {
      sender: aiPlayer.name,
      text: `【${mode === 'truth' ? '真心话回答' : '大冒险应战'}】${replyText}`,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
    };
    room.messages.push(aiMsg);
    broadcastToRoom(room, { type: 'chat_broadcast', message: aiMsg });
  }, 1200);
}

// ==========================================
// 8. 通用游戏舞台 (UNO, 狼人杀, 阿瓦隆等)
// ==========================================
function startGeneralArenaGame(room, gameId) {
  const title = getGameTitleById(gameId);
  room.arenaGame = {
    gameId: gameId,
    gameTitle: title,
    phase: '游戏进行中',
    currentTurnPlayer: room.players[0].name,
    logs: [
      `🎉 房主开启了【${title}】联机局！全员已同步入座！`
    ]
  };

  broadcastToRoom(room, {
    type: 'game_started',
    gameId: gameId,
    gameTitle: title,
    arena: room.arenaGame
  });
}

server.listen(PORT, () => {
  console.log(`Party Game WebSocket Server with Qwen3.5-4B AI running on port ${PORT}`);
});
