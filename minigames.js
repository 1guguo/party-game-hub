/**
 * 互动游戏引擎：集成全真多人在线 WebSocket 同步与 AI 智能陪玩
 */

// ==========================================
// 1. 通用房间大厅管理器
// ==========================================
class RoomManager {
  constructor() {
    this.currentRoom = null;
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('room_joined', (data) => {
      this.currentRoom = data.room;
      window.app?.openRoomLobbyModal(this.currentRoom);
      window.app?.updateStickyRoomBar(this.currentRoom);
      window.app?.showToast(`✨ 成功入座房间 [${this.currentRoom.code}]！`, 'success');
    });

    net.on('room_state', (room) => {
      this.currentRoom = room;
      window.app?.updateStickyRoomBar(this.currentRoom);
      const modal = document.getElementById('room-lobby-modal');
      if (modal && modal.classList.contains('active')) {
        window.app?.openRoomLobbyModal(this.currentRoom);
      }
    });

    net.on('chat', (msg) => {
      this.appendChatMessage(msg);
    });
  }

  appendChatMessage(msg) {
    const isMe = msg.sender === window.partyNetwork?.playerInfo?.name;
    const chatHtml = `<div style="font-size: 12.5px; margin-bottom: 4px;">
      <b style="color: ${isMe ? '#2563EB' : '#10B981'};">${msg.sender}：</b>
      <span style="color: #374151;">${msg.text}</span>
    </div>`;

    // 同步到大厅聊天框
    const lobbyChat = document.getElementById('lobby-chat-logs');
    if (lobbyChat) {
      lobbyChat.innerHTML += chatHtml;
      lobbyChat.scrollTop = lobbyChat.scrollHeight;
    }

    // 同步到你画我猜聊天框
    const dgChat = document.getElementById('dg-chat-logs');
    if (dgChat) {
      dgChat.innerHTML += chatHtml;
      dgChat.scrollTop = dgChat.scrollHeight;
    }

    // 同步到海龟汤聊天框
    const tsChat = document.getElementById('ts-chat-logs');
    if (tsChat) {
      tsChat.innerHTML += chatHtml;
      tsChat.scrollTop = tsChat.scrollHeight;
    }
  }

  createRoom(gameId, options = {}) {
    const game = window.GAMES_LIST.find(g => g.id === gameId) || window.FEATURED_GAME;
    const gameTitle = game.title;
    window.partyNetwork.createRoom(gameId, gameTitle, options.maxPlayers || 8);
  }

  joinRoom(code) {
    window.partyNetwork.joinRoom(code);
  }
}

window.roomManager = new RoomManager();

// ==========================================
// 2. 你画我猜 Canvas 实时联机逻辑
// ==========================================
class DrawGuessGame {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isDrawing = false;
    this.lastX = 0;
    this.lastY = 0;
    this.currentWord = '';
    this.color = '#18181b';
    this.size = 4;
    this.history = [];
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('draw_stroke', (stroke) => {
      this.drawRemoteStroke(stroke);
    });

    net.on('draw_clear', () => {
      this.clearLocalOnly();
    });

    net.on('draw_round_start', (msg) => {
      this.clearLocalOnly();
      const wordEl = document.getElementById('dg-word');
      const timerEl = document.getElementById('dg-timer');
      const bannerEl = document.getElementById('dg-role-banner');
      const toolsBar = document.getElementById('dg-tools-bar');

      if (msg.isDrawer) {
        if (wordEl) wordEl.textContent = msg.word;
        if (bannerEl) bannerEl.innerHTML = `<span style="color:#10B981; font-weight:800;">🎨 轮到你作画！请画出：【${msg.word}】</span>`;
        if (toolsBar) toolsBar.style.display = 'flex';
        if (this.canvas) {
          this.canvas.style.cursor = 'crosshair';
          this.canvas.style.touchAction = 'none';
        }
        window.app?.showToast(`🎨 轮到你画了！题目：${msg.word}`, 'success');
      } else {
        if (wordEl) wordEl.textContent = `提示：${msg.wordHint}`;
        if (bannerEl) bannerEl.innerHTML = `<span style="color:#2563EB; font-weight:700;">👀 画师【${msg.drawerName}】正在作画，快在下方猜词！</span>`;
        if (toolsBar) toolsBar.style.display = 'none'; // 猜词玩家隐藏画笔工具，腾出全屏视野
        if (this.canvas) {
          this.canvas.style.cursor = 'default';
          this.canvas.style.touchAction = 'auto'; // 允许手机手指平滑上下滑动看公屏
        }
      }

      if (timerEl) timerEl.textContent = `${msg.timeLeft}s`;

      if (msg.historyStrokes && msg.historyStrokes.length > 0) {
        msg.historyStrokes.forEach(s => this.drawRemoteStroke(s));
      }
    });

    net.on('draw_tick', (sec) => {
      const timerEl = document.getElementById('dg-timer');
      if (timerEl) timerEl.textContent = `${sec}s`;
    });

    net.on('draw_guess_correct', (data) => {
      window.sounds?.win();
      window.app?.showToast(`🎉 恭喜！${data.winnerName} 猜中了答案【${data.word}】！`, 'success');
      const log = document.getElementById('dg-chat-logs');
      if (log) {
        log.innerHTML += `<div style="background:#DCFCE7; padding:4px 8px; border-radius:6px; color:#16A34A; font-weight:700;">
          🎉 恭喜 ${data.winnerName} 猜中了！答案是【${data.word}】
        </div>`;
        log.scrollTop = log.scrollHeight;
      }
      const inp = document.getElementById('dg-guess-input');
      if (inp) {
        inp.style.borderColor = '#10B981';
        setTimeout(() => { if (inp) inp.style.borderColor = ''; }, 1500);
      }
    });

    net.on('draw_timeout', (data) => {
      window.app?.showToast(`时间到！正确答案是【${data.word}】`);
    });
  }

  init(canvasEl) {
    this.canvas = canvasEl;
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = 620;
    this.canvas.height = 420;
    this.clearLocalOnly();

    const log = document.getElementById('dg-chat-logs');
    if (log) {
      const roomMsgs = window.app?.currentRoom?.messages || [];
      if (roomMsgs.length > 0) {
        log.innerHTML = roomMsgs.map(m => `
          <div><b style="color:${m.sender === '系统' ? '#D97706' : '#2563EB'};">${m.sender}：</b> <span>${m.text}</span></div>
        `).join('');
      } else {
        log.innerHTML = `<div style="font-size:11.5px; color:#9CA3AF; text-align:center; padding:12px 0;">画板落笔即可在公屏猜词，越快猜出得分越高！</div>`;
      }
      log.scrollTop = log.scrollHeight;
    }

    this.canvas.onmousedown = (e) => this.startDrawing(e);
    this.canvas.onmousemove = (e) => this.draw(e);
    this.canvas.onmouseup = () => this.stopDrawing();
    this.canvas.onmouseleave = () => this.stopDrawing();

    this.canvas.ontouchstart = (e) => {
      const isDrawer = !window.partyNetwork?.connected || window.partyNetwork?.isDrawer;
      if (!isDrawer) {
        return; // 猜词玩家不拦截触摸，允许手机滑动页面
      }
      e.preventDefault();
      const touch = e.touches[0];
      this.startDrawing(touch);
    };
    this.canvas.ontouchmove = (e) => {
      const isDrawer = !window.partyNetwork?.connected || window.partyNetwork?.isDrawer;
      if (!isDrawer) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.draw(touch);
    };
    this.canvas.ontouchend = (e) => {
      const isDrawer = !window.partyNetwork?.connected || window.partyNetwork?.isDrawer;
      if (!isDrawer) return;
      e.preventDefault();
      this.stopDrawing();
    };
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  startDrawing(e) {
    if (window.partyNetwork?.connected && !window.partyNetwork?.isDrawer) {
      window.app?.showToast('当前是画师作画，请在右侧输入框猜词！');
      return;
    }
    this.isDrawing = true;
    const pos = this.getPos(e);
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  draw(e) {
    if (!this.isDrawing) return;
    const pos = this.getPos(e);
    const stroke = {
      x0: this.lastX,
      y0: this.lastY,
      x1: pos.x,
      y1: pos.y,
      color: this.color,
      size: this.size
    };

    this.drawStrokeLocal(stroke);
    if (window.partyNetwork?.connected) {
      window.partyNetwork.sendStroke(stroke.x0, stroke.y0, stroke.x1, stroke.y1, stroke.color, stroke.size);
    }
    this.lastX = pos.x;
    this.lastY = pos.y;
  }

  stopDrawing() {
    this.isDrawing = false;
  }

  drawStrokeLocal(stroke) {
    if (!this.ctx) return;
    this.ctx.beginPath();
    this.ctx.moveTo(stroke.x0, stroke.y0);
    this.ctx.lineTo(stroke.x1, stroke.y1);
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.size;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.stroke();
  }

  drawRemoteStroke(stroke) {
    this.drawStrokeLocal(stroke);
  }

  clear() {
    this.clearLocalOnly();
    if (window.partyNetwork?.connected) {
      window.partyNetwork.sendDrawClear();
    }
  }

  clearLocalOnly() {
    if (!this.ctx) return;
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  sendGuess(text) {
    if (!text || !text.trim()) return;
    window.partyNetwork.sendChat(text.trim());
    const inp = document.getElementById('dg-guess-input');
    if (inp) {
      inp.focus();
    }
  }
}

window.drawGuessGame = new DrawGuessGame();

// ==========================================
// 3. 数字炸弹 实时多人联机逻辑
// ==========================================
class NumberBombGame {
  constructor() {
    this.min = 1;
    this.max = 100;
    this.currentTurn = '所有人';
    this.history = [];
    this.isOver = false;
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('bomb_state', (bg) => {
      this.min = bg.min;
      this.max = bg.max;
      this.history = bg.history || [];
      this.isOver = bg.isOver;
      this.currentTurn = bg.currentTurnName;

      this.updateUI();

      if (this.isOver) {
        window.sounds?.bombExplode();
        const rangeEl = document.getElementById('nb-range');
        const turnEl = document.getElementById('nb-turn');
        if (rangeEl) rangeEl.innerHTML = `<span style="color:#DC2626; font-size:28px; font-weight:900;" class="animate-bounce">💥 BOOM! 炸弹引爆！</span>`;
        if (turnEl) turnEl.innerHTML = `<b style="color:#DC2626; font-size:16px;">${bg.boomedPlayer} 踩中了炸弹！惩罚伺候！</b>`;
      } else {
        window.sounds?.tick(true);
      }
    });
  }

  guess(num) {
    num = parseInt(num);
    if (isNaN(num) || num <= this.min || num >= this.max) {
      window.app?.showToast(`请输入 ${this.min} 到 ${this.max} 之间的数字！`, 'error');
      return;
    }
    window.partyNetwork.sendBombGuess(num);
  }

  restart() {
    const isHost = window.partyNetwork?.playerInfo?.id === window.app?.currentRoom?.players?.find(p => p.isHost)?.id;
    if (isHost) {
      window.partyNetwork.startGame('number-bomb');
    } else {
      window.partyNetwork.sendChat('呼叫房主再开一局数字炸弹！');
      window.app?.showToast('📢 已在公屏提醒房主开启新一局！');
    }
  }

  updateUI() {
    const rangeEl = document.getElementById('nb-range');
    const turnEl = document.getElementById('nb-turn');
    const histEl = document.getElementById('nb-history');
    const tensionBar = document.getElementById('nb-tension');

    if (rangeEl) rangeEl.innerHTML = `<span style="color:#2563EB; font-weight:900;">${this.min}</span> ~ <span style="color:#DC2626; font-weight:900;">${this.max}</span>`;
    if (turnEl) turnEl.textContent = `当前轮到：${this.currentTurn || '你'}`;

    const remaining = this.max - this.min;
    const tension = Math.min(100, Math.max(0, 100 - remaining));
    if (tensionBar) {
      tensionBar.style.width = `${tension}%`;
      tensionBar.style.background = tension > 70 ? '#EF4444' : (tension > 40 ? '#F59E0B' : '#10B981');
    }

    if (histEl) {
      histEl.innerHTML = this.history.map(item => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:3px 0; border-bottom:1px solid #F3F4F6; font-size:13px;">
          <span>${item.player} 猜了 <b style="color:#2563EB;">${item.num}</b></span>
          <span style="padding:1px 6px; border-radius:4px; font-size:11px; ${item.result === 'BOOM!' ? 'background:#FEE2E2; color:#DC2626; font-weight:bold;' : 'background:#DCFCE7; color:#16A34A;'}">${item.result}</span>
        </div>
      `).join('');
    }

    const pillsEl = document.getElementById('nb-quick-pills');
    if (pillsEl && !this.isOver) {
      const low = this.min + 1;
      const mid = Math.floor((this.min + this.max) / 2);
      const high = this.max - 1;
      
      const pills = [];
      if (low < this.max) pills.push({ label: `🛡️ 保守: ${low}`, val: low });
      if (mid > low && mid < high) pills.push({ label: `⚖️ 对半: ${mid}`, val: mid });
      if (high > low) pills.push({ label: `🛡️ 顶格: ${high}`, val: high });

      pillsEl.innerHTML = pills.map(p => `
        <button type="button" class="btn-link-rules" style="font-size:11.5px; padding:3px 9px; background:#F3F4F6; border-radius:9999px; border:1px solid #E5E7EB; font-weight:700;" onclick="
          document.getElementById('nb-input').value='${p.val}';
          window.numberBombGame.guess(${p.val});
          document.getElementById('nb-input').value='';
        ">${p.label}</button>
      `).join('');
    } else if (pillsEl) {
      pillsEl.innerHTML = '';
    }
  }
}

window.numberBombGame = new NumberBombGame();

// ==========================================
// 4. 大话骰 (多人实时同步开盅)
// ==========================================
class LiarsDiceGame {
  constructor() {
    this.myDice = [1, 2, 3, 4, 5];
    this.isCovered = true;
    this.currentCall = null;
    this.showdown = null;
    this.isOver = false;
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('dice_state', (data) => {
      this.myDice = data.myDice || [1, 2, 3, 4, 5];
      this.currentCall = data.lastCall;
      this.showdown = data.showdown;
      this.isOver = data.isOver;

      const turnEl = document.getElementById('ld-turn');
      if (turnEl) {
        turnEl.textContent = `当前轮到喊点：${data.currentTurnName}`;
      }

      this.render();

      if (this.showdown) {
        this.isCovered = false; // 质疑开牌时自动掀起骰盅
        window.sounds?.win();
        window.app?.showToast(`💥 开！【${this.showdown.loserName}】输了罚一杯！`, 'error');
      }
    });
  }

  toggleCup() {
    this.isCovered = !this.isCovered;
    window.sounds?.click();
    this.render();
  }

  call(count, pip) {
    window.partyNetwork.sendDiceCall(count, pip);
  }

  openShowdown() {
    window.partyNetwork.sendDiceShowdown();
  }

  reroll() {
    const isHost = window.partyNetwork?.playerInfo?.id === window.app?.currentRoom?.players?.find(p => p.isHost)?.id;
    if (isHost) {
      window.sounds?.rollDice();
      window.partyNetwork.sendDiceReroll();
    } else {
      window.partyNetwork.sendChat('呼叫房主重新摇骰开新局！');
      window.app?.showToast('📢 已在公屏提醒房主重新摇骰！');
    }
  }

  render() {
    const diceContainer = document.getElementById('ld-my-dice');
    const callEl = document.getElementById('ld-current-call');
    const cupCover = document.getElementById('ld-cup-cover');
    const showdownArea = document.getElementById('ld-showdown-area');

    if (callEl) {
      if (this.currentCall) {
        callEl.innerHTML = `<b style="color:#2563EB;">${this.currentCall.callerName}</b> 喊了：<span style="font-size:24px; color:#DC2626;">${this.currentCall.count} 个 ${this.currentCall.pip}</span>`;
      } else {
        callEl.innerHTML = `尚未叫点，等待首发玩家出点...`;
      }
    }

    if (cupCover) {
      cupCover.style.opacity = this.isCovered ? '1' : '0';
      cupCover.style.pointerEvents = this.isCovered ? 'auto' : 'none';
    }

    if (diceContainer) {
      diceContainer.innerHTML = this.myDice.map(d => this.getDiceSvg(d)).join('');
    }

    if (showdownArea) {
      if (this.showdown) {
        showdownArea.style.display = 'block';
        showdownArea.innerHTML = `
          <div style="background:#FEF2F2; border:2px solid #DC2626; border-radius:12px; padding:12px; margin-top:12px;">
            <div style="font-size:15px; font-weight:900; color:#DC2626; margin-bottom:8px;">
              💥 开牌结果：全场共计 ${this.showdown.totalMatches} 个【${this.showdown.targetCall.pip}】点！
            </div>
            <div style="font-size:13px; font-weight:700; color:#111827; margin-bottom:8px;">
              ${this.showdown.challengerName} 质疑 ${this.showdown.targetCall.callerName}（喊了 ${this.showdown.targetCall.count} 个）${this.showdown.success ? '👉 叫点达成！质疑者输！' : '👉 点数不足！喊点者输！'}
            </div>
            <div style="font-size:16px; font-weight:900; color:#B91C1C;">
              🍺 惩罚玩家：【${this.showdown.loserName}】！
            </div>
            ${this.showdown.allDices ? `
              <div style="margin-top:10px; border-top:1px dashed #FECACA; padding-top:8px;">
                <div style="font-size:12px; font-weight:700; color:#4B5563; margin-bottom:6px;">全员明牌点数（黄色为命中点数）：</div>
                ${this.showdown.allDices.map(pd => `
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; font-size:12px;">
                    <span><b>${pd.name}</b>:</span>
                    <div style="display:flex; gap:4px;">
                      ${pd.dices.map(d => {
                        const isMatch = d === this.showdown.targetCall.pip || d === 1;
                        return this.getMiniDiceSvg(d, isMatch);
                      }).join('')}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        showdownArea.style.display = 'none';
      }
    }
  }

  getMiniDiceSvg(val, isMatch) {
    const dotsMap = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [25, 75], [75, 25], [75, 75]],
      5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
      6: [[25, 20], [25, 50], [25, 80], [75, 20], [75, 50], [75, 80]]
    };
    const dots = dotsMap[val] || [];
    const bg = isMatch ? 'linear-gradient(135deg, #FEF08A, #FDE047)' : '#FFFFFF';
    const border = isMatch ? '#EAB308' : '#E5E7EB';
    const dotColor = val === 1 ? '#DC2626' : (isMatch ? '#854D0E' : '#374151');
    const scale = isMatch ? 'transform:scale(1.1); box-shadow:0 2px 6px rgba(234,179,8,0.4);' : 'opacity:0.5;';
    return `
      <div style="width:26px; height:26px; background:${bg}; border-radius:6px; border:1.5px solid ${border}; display:inline-flex; align-items:center; justify-content:center; ${scale} transition:all 0.2s ease;">
        <svg viewBox="0 0 100 100" style="width:18px; height:18px;">
          ${dots.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="11" fill="${dotColor}" />`).join('')}
        </svg>
      </div>
    `;
  }

  getDiceSvg(val) {
    const dotsMap = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [25, 75], [75, 25], [75, 75]],
      5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
      6: [[25, 20], [25, 50], [25, 80], [75, 20], [75, 50], [75, 80]]
    };
    const dots = dotsMap[val] || [];
    return `
      <div style="width:42px; height:42px; background:#fff; border-radius:10px; border:2px solid #18181b; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 6px rgba(0,0,0,0.06);">
        <svg viewBox="0 0 100 100" style="width:30px; height:30px;">
          ${dots.map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="9" fill="${val === 1 ? '#EF4444' : '#1F2937'}" />`).join('')}
        </svg>
      </div>
    `;
  }
}

window.liarsDiceGame = new LiarsDiceGame();

// ==========================================
// 5. 五子棋 (Gomoku 实时对弈与观战)
// ==========================================
class GomokuGame {
  constructor() {
    this.board = Array.from({ length: 15 }, () => Array(15).fill(null));
    this.currentTurn = 'black';
    this.blackPlayerName = '房主';
    this.whitePlayerName = '挑战者';
    this.winner = null;
    this.history = [];
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('gomoku_state', (gg) => {
      const prevLen = this.history.length;
      this.board = gg.board;
      this.currentTurn = gg.turn;
      this.blackPlayerName = gg.blackPlayerName;
      this.whitePlayerName = gg.whitePlayerName;
      this.winner = gg.winner;
      this.history = gg.history || [];
      this.render();

      if (this.history.length > prevLen) {
        window.sounds?.stone();
      }

      if (this.winner) {
        window.sounds?.win();
        window.app?.showToast(`🎉 【${gg.winnerName || (this.winner === 'black' ? '黑棋' : '白棋')}】 连成五子获胜！`, 'success');
      }
    });
  }

  init() {
    this.restart();
  }

  restart() {
    const isHost = window.partyNetwork?.playerInfo?.id === window.app?.currentRoom?.players?.find(p => p.isHost)?.id;
    if (isHost) {
      window.partyNetwork.startGame('gomoku');
    } else {
      window.partyNetwork.sendChat('呼叫房主再来一局五子棋！');
      window.app?.showToast('📢 已在公屏提醒房主重新开局！');
    }
  }

  makeMove(r, c) {
    if (this.winner || this.board[r][c]) return;
    window.partyNetwork.sendGomokuMove(r, c);
  }

  render() {
    const boardEl = document.getElementById('gomoku-grid');
    const statusEl = document.getElementById('gomoku-status');
    if (statusEl) {
      statusEl.innerHTML = `⚫ 黑棋: <b>${this.blackPlayerName}</b> vs ⚪ 白棋: <b>${this.whitePlayerName}</b> | 当前回合：<b style="color:#2563EB;">${this.currentTurn === 'black' ? '黑棋' : '白棋'}</b>`;
    }

    if (!boardEl) return;
    boardEl.innerHTML = '';
    boardEl.className = 'gomoku-grid-board';
    const lastMove = this.history[this.history.length - 1];

    for (let r = 0; r < 15; r++) {
      for (let c = 0; c < 15; c++) {
        const cell = document.createElement('div');
        cell.className = 'gomoku-cell';
        cell.onclick = () => this.makeMove(r, c);

        const hLine = document.createElement('div');
        hLine.className = 'gomoku-h-line';
        const vLine = document.createElement('div');
        vLine.className = 'gomoku-v-line';
        cell.appendChild(hLine);
        cell.appendChild(vLine);

        if ((r === 3 || r === 7 || r === 11) && (c === 3 || c === 7 || c === 11)) {
          const star = document.createElement('div');
          star.className = 'gomoku-star';
          cell.appendChild(star);
        }

        if (this.board[r][c]) {
          const piece = document.createElement('div');
          const isBlack = this.board[r][c] === 'black';
          piece.className = `gomoku-piece ${isBlack ? 'black' : 'white'}`;
          if (lastMove && lastMove.r === r && lastMove.c === c) {
            const dot = document.createElement('div');
            dot.className = 'gomoku-last-dot';
            piece.appendChild(dot);
          }
          cell.appendChild(piece);
        }

        boardEl.appendChild(cell);
      }
    }

    // 获胜结算横幅浮层
    if (this.winner) {
      const banner = document.createElement('div');
      banner.className = 'gomoku-winner-banner';
      const winnerName = this.winner === 'black' ? this.blackPlayerName : this.whitePlayerName;
      const winnerColor = this.winner === 'black' ? '⚫ 黑棋' : '⚪ 白棋';
      banner.innerHTML = `
        <div style="font-size:26px; margin-bottom:4px;">🏆</div>
        <div style="font-size:16.5px; font-weight:900; color:#FACC15;">【${winnerName}】 获胜！</div>
        <div style="font-size:12px; opacity:0.85; margin-top:2px;">${winnerColor} 连成五子</div>
        <button class="btn-primary-yellow" style="margin-top:12px; padding:6px 18px; font-size:12.5px; width:auto; font-weight:800;" onclick="window.gomokuGame.init()">
          🔄 再来一局
        </button>
      `;
      boardEl.style.position = 'relative';
      boardEl.appendChild(banner);
    }
  }
}

window.gomokuGame = new GomokuGame();

// ==========================================
// 6. 谁是卧底 (Undercover 阵营推理引擎)
// ==========================================
class UndercoverGame {
  constructor() {
    this.myWord = '***';
    this.isCovered = true;
    this.phase = 'speaking';
    this.alivePlayers = [];
    this.winner = null;
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('undercover_state', (data) => {
      this.myWord = data.myWord;
      this.phase = data.phase;
      this.alivePlayers = data.alivePlayers || [];
      this.winner = data.winner;
      this.render(data);
    });
  }

  toggleWordCover() {
    window.sounds?.click();
    this.isCovered = !this.isCovered;
    const coverEl = document.getElementById('uc-word-text');
    const btn = document.getElementById('uc-cover-btn');
    const displayWord = this.myWord && this.myWord !== '***' ? this.myWord : '等待分配...';
    if (coverEl) {
      coverEl.textContent = this.isCovered ? '🙈 点击偷看我的词' : `【${displayWord}】`;
    }
    if (btn) {
      btn.textContent = this.isCovered ? '👁️ 偷看' : '🙈 盖上防偷看';
    }
  }

  vote(targetId) {
    window.partyNetwork.sendUndercoverVote(targetId);
    window.app?.showToast('🗳️ 投票已送达！');
  }

  speakDone() {
    window.partyNetwork.sendUndercoverSpeakDone();
    window.app?.showToast('🗣️ 发言完毕，转给下一位！');
  }

  sendDescription(text) {
    if (!text || !text.trim()) return;
    window.partyNetwork.sendChat(`🗣️ [描述] ${text.trim()}`);
    this.speakDone();
  }

  restart() {
    const isHost = window.partyNetwork?.playerInfo?.id === window.app?.currentRoom?.players?.find(p => p.isHost)?.id;
    if (isHost) {
      window.partyNetwork.startGame('undercover');
    } else {
      window.partyNetwork.sendChat('呼叫房主重新洗牌开新局！');
      window.app?.showToast('📢 已在公屏提醒房主重新洗牌！');
    }
  }

  render(data) {
    const speakerEl = document.getElementById('uc-speaker-info');
    const voteListEl = document.getElementById('uc-vote-list');
    const resultEl = document.getElementById('uc-result-area');
    const myId = window.partyNetwork?.playerInfo?.id;
    const isMyTurn = myId && myId === data.currentSpeakerId;

    if (speakerEl) {
      if (data.phase === 'speaking') {
        speakerEl.innerHTML = `
          <div style="margin-bottom:6px;">当前阶段：<b style="color:#2563EB;">第 ${data.round} 轮描述</b></div>
          <div style="font-size:14px; font-weight:800; color:#18181B; background:#EFF6FF; border:1px solid #BFDBFE; padding:6px 12px; border-radius:8px; display:inline-block;">
            ${isMyTurn ? '👉 <span style="color:#DC2626;">轮到你描述了！</span>发一条不剧透的描述' : `🎤 正在由 <b>${data.currentSpeakerName || '玩家'}</b> 发言...`}
          </div>
          ${isMyTurn ? `
            <div style="margin-top:8px; display:flex; gap:6px; justify-content:center;">
              <input type="text" id="uc-speak-input" class="room-input" placeholder="输入一句描述词语的话..." style="max-width:280px;" onkeypress="if(event.key==='Enter'){ window.undercoverGame.sendDescription(this.value); this.value=''; }" />
              <button class="btn-primary-yellow" style="width:auto; padding:0 14px; font-size:12.5px;" onclick="const inp=document.getElementById('uc-speak-input'); if(inp){ window.undercoverGame.sendDescription(inp.value); inp.value=''; }">发送并完成</button>
              <button class="btn-link-rules" style="border:1px solid #D1D5DB; font-size:12px; padding:0 10px;" onclick="window.undercoverGame.speakDone()">直接跳过</button>
            </div>
          ` : ''}
        `;
      } else if (data.phase === 'voting') {
        speakerEl.innerHTML = `<span style="color:#D97706; font-weight:800; font-size:14px;">🗳️ 发言结束，正在投票放逐卧底！</span>`;
      } else {
        speakerEl.innerHTML = `<span style="color:#059669; font-weight:800;">对局已结束</span>`;
      }
    }

    if (voteListEl) {
      if (data.phase === 'voting') {
        const hasVoted = data.voteRecords && myId && data.voteRecords[myId];
        voteListEl.innerHTML = `
          ${hasVoted ? `<div style="font-size:12px; color:#059669; font-weight:700; margin-bottom:8px; text-align:center;">✅ 你的投票已送达，等待其他人与 AI 投票...</div>` : ''}
          ${this.alivePlayers.map(p => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#FFFFFF; border:1.5px solid ${p.id === myId ? '#BFDBFE' : '#E5E7EB'}; border-radius:8px; padding:8px 12px; margin-bottom:6px;">
              <span>${p.avatar} <b>${p.name}</b> ${p.id === myId ? '<span style="font-size:11px; color:#2563EB;">(你自己)</span>' : ''}</span>
              ${!hasVoted && p.id !== myId ? `
                <button class="btn-primary-yellow" style="padding:4px 12px; font-size:12px; width:auto; font-weight:700;" onclick="window.undercoverGame.vote('${p.id}')">
                  投他一票
                </button>
              ` : ''}
            </div>
          `).join('')}
        `;
      } else {
        voteListEl.innerHTML = `<div style="font-size:12px; color:#9CA3AF; text-align:center; padding:10px 0;">发言结束后开启投票</div>`;
      }
    }

    if (resultEl && data.winner) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="background:#ECFDF5; border:2px solid #059669; border-radius:12px; padding:14px; margin-top:12px; text-align:center;">
          <h3 style="color:#059669; font-size:19px; font-weight:900;">🏆 对局结束：${data.winner}！</h3>
          <p style="font-size:13.5px; color:#374151; margin-top:6px;">
            平民词：<b>【${data.civilianWord}】</b> | 卧底词：<b style="color:#DC2626;">【${data.spyWord}】</b>
          </p>
        </div>
      `;
    }
  }
}

window.undercoverGame = new UndercoverGame();

// ==========================================
// 7. 海龟汤 (情境推理游戏引擎)
// ==========================================
class TurtleSoupGame {
  constructor() {
    this.title = '';
    this.surface = '';
    this.bottom = '';
    this.isSolved = false;
    this.questions = [];
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('turtle_soup_state', (data) => {
      this.title = data.title;
      this.surface = data.surface;
      this.bottom = data.bottom;
      this.isSolved = data.isSolved;
      this.questions = data.questions || [];
      this.render();
    });
  }

  ask(question) {
    if (!question || !question.trim()) return;
    window.partyNetwork.sendChat(`【汤面提问】${question.trim()}`);
  }

  solve() {
    window.partyNetwork.sendTurtleSoupSolve();
  }

  restart() {
    const isHost = window.partyNetwork?.playerInfo?.id === window.app?.currentRoom?.players?.find(p => p.isHost)?.id;
    if (isHost) {
      window.partyNetwork.startGame('turtle-soup');
    } else {
      window.partyNetwork.sendChat('呼叫房主换一碗新海龟汤！');
      window.app?.showToast('📢 已在公屏提醒房主换新汤面！');
    }
  }

  render() {
    const titleEl = document.getElementById('ts-title');
    const surfaceEl = document.getElementById('ts-surface');
    const bottomEl = document.getElementById('ts-bottom');
    const qListEl = document.getElementById('ts-q-list');

    if (titleEl) titleEl.textContent = `🍲 海龟汤 · ${this.title}`;
    if (surfaceEl) surfaceEl.textContent = this.surface;

    if (bottomEl) {
      if (this.isSolved) {
        bottomEl.style.display = 'block';
        bottomEl.innerHTML = `
          <div style="background:#FEF3C7; border:2px solid #F59E0B; border-radius:10px; padding:12px; margin-top:12px;">
            <b style="color:#B45309; display:block; margin-bottom:4px;">🥣 完整汤底（真相揭晓）：</b>
            <div style="font-size:13px; color:#18181B; line-height:1.5;">${this.bottom}</div>
          </div>
        `;
      } else {
        bottomEl.style.display = 'none';
      }
    }

    if (qListEl) {
      qListEl.innerHTML = this.questions.map(q => {
        let tagColor = '#6B7280';
        let tagBg = '#F3F4F6';
        if (q.answer === '是') { tagColor = '#059669'; tagBg = '#ECFDF5'; }
        else if (q.answer === '否') { tagColor = '#DC2626'; tagBg = '#FEF2F2'; }
        else if (q.answer === '关键信息') { tagColor = '#7C3AED'; tagBg = '#F5F3FF'; }

        return `
          <div style="padding:6px 0; border-bottom:1px solid #F3F4F6; font-size:13px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span><b>${q.player}：</b>${q.question}</span>
              <span style="background:${tagBg}; color:${tagColor}; font-weight:800; padding:2px 8px; border-radius:4px; font-size:11px;">
                ${q.answer}
              </span>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

window.turtleSoupGame = new TurtleSoupGame();

// ==========================================
// 8. 真心话大冒险
// ==========================================
class TruthDareGame {
  constructor() {
    this.setupNetworkHooks();
  }

  setupNetworkHooks() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('truth_dare_state', (data) => {
      const targetEl = document.getElementById('td-target');
      const contentEl = document.getElementById('td-content');
      const historyEl = document.getElementById('td-history');

      if (targetEl) targetEl.innerHTML = `🎯 命中玩家：<b style="color:#2563EB; font-size:18px;">${data.targetPlayer}</b>！`;
      if (contentEl) {
        contentEl.innerHTML = `<b>【${data.currentMode === 'truth' ? '真心话' : '大冒险'}】</b>：${data.content}`;
        contentEl.classList.remove('card-pop-active');
        void contentEl.offsetWidth;
        contentEl.classList.add('card-pop-active');
        window.sounds?.pop();
      }

      if (historyEl && data.history) {
        historyEl.innerHTML = data.history.map(h => `
          <div style="padding:4px 0; border-bottom:1px solid #F3F4F6; font-size:12px;">
            <b style="color:#D97706;">${h.player}</b> [${h.mode}]: ${h.content}
          </div>
        `).join('');
      }
    });
  }

  draw(mode) {
    window.partyNetwork.sendTruthDareDraw(mode);
  }
}

window.truthDareGame = new TruthDareGame();
