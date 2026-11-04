/**
 * 朋友到齐，好戏开场 - 主应用交互与实时联机控制器 (全真联机+AI陪玩+超强分享)
 */

class PartyApp {
  constructor() {
    this.currentCategory = '全部';
    this.searchQuery = '';
    this.activeModal = null;
    this.activeRooms = [];
    this.currentRoom = null;
  }

  init() {
    this.renderHero();
    this.renderCategoryChips();
    this.renderGameCards();
    this.initPlayerBadge();
    this.setupNetworkGameWatchers();
    this.bindEvents();
    this.initStickyRoomBar();
  }

  initPlayerBadge() {
    const profileBadge = document.getElementById('player-profile-badge');
    if (profileBadge && window.partyNetwork) {
      profileBadge.innerHTML = `${window.partyNetwork.playerInfo.avatar} ${window.partyNetwork.playerInfo.name} ✏️`;
      profileBadge.onclick = () => {
        const funNames = ['快乐小柴', '机智狐狸', '摸鱼大熊猫', '吃瓜松鼠', '高冷考拉', '早睡小羊', '冲浪水獭', '熬夜冠军猫', '魔法小熊', '绝地柴犬'];
        const avatars = ['🦊', '🐼', '🐱', '🐶', '🐨', '🐰', '🦁', '🐯', '🐻', '🦦'];
        const randomName = funNames[Math.floor(Math.random() * funNames.length)];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];

        const newName = prompt(`修改游戏昵称（直接确定将随机分配如【${randomAvatar} ${randomName}】）：`, window.partyNetwork.playerInfo.name);
        if (newName === null) return;
        
        const finalName = newName.trim() || randomName;
        const finalAvatar = newName.trim() ? window.partyNetwork.playerInfo.avatar : randomAvatar;
        
        window.partyNetwork.playerInfo.name = finalName;
        window.partyNetwork.playerInfo.avatar = finalAvatar;
        localStorage.setItem('party_player_name', finalName);
        localStorage.setItem('party_player_avatar', finalAvatar);
        profileBadge.innerHTML = `${finalAvatar} ${finalName} ✏️`;
        this.showToast(`玩家昵称已更新：${finalAvatar} ${finalName}`, 'success');
      };
    }
  }

  cycleMyAvatar() {
    const avatars = ['🦊', '🐼', '🐱', '🐶', '🐨', '🐰', '🦁', '🐯', '🐻', '🦦', '🐸', '🦄'];
    const curAvatar = window.partyNetwork?.playerInfo?.avatar || '🦊';
    const curIdx = avatars.indexOf(curAvatar);
    const nextAvatar = avatars[(curIdx + 1) % avatars.length];
    
    window.sounds?.pop();
    this.triggerVibrate();
    window.partyNetwork?.updateProfile(null, nextAvatar);
    
    const profileBadge = document.getElementById('player-profile-badge');
    if (profileBadge) {
      profileBadge.innerHTML = `${nextAvatar} ${window.partyNetwork.playerInfo.name} ✏️`;
    }
    this.showToast(`✨ 头像已切换为 ${nextAvatar}`);
  }

  initStickyRoomBar() {
    let bar = document.getElementById('sticky-room-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sticky-room-bar';
      bar.style.position = 'fixed';
      bar.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
      bar.style.left = '50%';
      bar.style.transform = 'translateX(-50%)';
      bar.style.zIndex = '9999';
      bar.style.display = 'none';
      document.body.appendChild(bar);
    }
  }

  updateStickyRoomBar(room) {
    this.currentRoom = room;
    const bar = document.getElementById('sticky-room-bar');
    if (!bar) return;

    if (!room) {
      bar.style.display = 'none';
      return;
    }

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') + '/';
    const inviteLink = `${baseUrl}?room=${room.code}`;

    bar.style.display = 'flex';
    bar.style.position = 'fixed';
    bar.style.bottom = 'calc(16px + env(safe-area-inset-bottom, 0px))';
    bar.style.left = '50%';
    bar.style.transform = 'translateX(-50%)';
    bar.style.zIndex = '9999';
    bar.innerHTML = `
      <div style="background:linear-gradient(135deg,#18181B,#27272A); color:#FFFFFF; padding:10px 16px; border-radius:9999px; box-shadow:0 16px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06); display:flex; align-items:center; gap:10px; max-width:92vw; backdrop-filter:blur(10px);">
        <span style="display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:700;">
          <span style="width:7px; height:7px; border-radius:50%; background:#10B981; display:inline-block; animation:pulse 2s infinite; flex-shrink:0;"></span>
          <span>房间 <b style="color:#FACC15; letter-spacing:1px;">${room.code}</b> · ${room.gameTitle} <span style="color:#9CA3AF;">(${room.players.length}人)</span></span>
        </span>
        <div style="width:1px; height:18px; background:rgba(255,255,255,0.12); flex-shrink:0;"></div>
        <button style="background:rgba(37,99,235,0.9); color:#fff; border:none; font-size:12px; font-weight:700; padding:5px 12px; border-radius:9999px; cursor:pointer; white-space:nowrap;" onclick="window.app.shareOrCopyInvite('${room.code}', '${room.gameTitle}', '${inviteLink}')">
          📤 邀请
        </button>
        <button style="background:rgba(250,204,21,0.15); color:#FACC15; border:1px solid rgba(250,204,21,0.3); font-size:12px; font-weight:800; padding:5px 12px; border-radius:9999px; cursor:pointer; white-space:nowrap;" onclick="window.app.returnToCurrentRoom()">
          👉 返回房间
        </button>
        <button style="background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:16px; padding:0 2px; line-height:1; flex-shrink:0;" title="退出房间" onclick="window.app.leaveRoom()">
          ✕
        </button>
      </div>
    `;
  }

  returnToCurrentRoom() {
    if (!this.currentRoom) return;
    const r = this.currentRoom;
    if (r.status === 'playing') {
      this.openGamePlayOrLobby(r.gameId);
    } else {
      this.openRoomLobbyModal(r);
    }
  }

  leaveRoom() {
    sessionStorage.removeItem('party_active_room_code');
    this.currentRoom = null;
    this.updateStickyRoomBar(null);
    this.closeModal();
    this.showToast('已退出房间');
  }

  setupNetworkGameWatchers() {
    const net = window.partyNetwork;
    if (!net) return;

    net.on('active_rooms_list', (rooms) => {
      this.activeRooms = rooms || [];
      this.renderActiveRoomsList();
    });

    net.on('room_joined', (data) => {
      this.currentRoom = data.room;
      this.updateStickyRoomBar(this.currentRoom);
    });

    net.on('room_state', (room) => {
      this.currentRoom = room;
      this.updateStickyRoomBar(this.currentRoom);
      const lobbyModal = document.getElementById('room-lobby-modal');
      if (lobbyModal?.classList.contains('active')) {
        this.renderLobbyPlayers(this.currentRoom);
      }
      const arenaModal = document.getElementById('party-arena-modal');
      if (arenaModal?.classList.contains('active')) {
        this.renderArenaState(this.currentRoom);
      }
    });

    // 房主启动你画我猜
    net.on('draw_round_start', () => {
      const modal = document.getElementById('draw-guess-modal');
      if (!modal?.classList.contains('active')) {
        this.openDrawGuessModal();
      }
    });

    // 房主启动数字炸弹
    net.on('bomb_state', () => {
      const modal = document.getElementById('number-bomb-modal');
      if (!modal?.classList.contains('active')) {
        this.openNumberBombModal(false);
      }
    });

    // 房主启动五子棋
    net.on('gomoku_state', () => {
      const modal = document.getElementById('gomoku-modal');
      if (!modal?.classList.contains('active')) {
        this.openGomokuModal();
      }
    });

    // 房主启动大话骰
    net.on('dice_state', () => {
      const modal = document.getElementById('liars-dice-modal');
      if (!modal?.classList.contains('active')) {
        this.openLiarsDiceModal();
      }
    });

    // 房主启动谁是卧底
    net.on('undercover_state', () => {
      const modal = document.getElementById('undercover-modal');
      if (!modal?.classList.contains('active')) {
        this.openUndercoverModal();
      }
    });

    // 房主启动海龟汤
    net.on('turtle_soup_state', () => {
      const modal = document.getElementById('turtle-soup-modal');
      if (!modal?.classList.contains('active')) {
        this.openTurtleSoupModal();
      }
    });

    // 房主启动真心话大冒险
    net.on('truth_dare_state', () => {
      const modal = document.getElementById('truth-dare-modal');
      if (!modal?.classList.contains('active')) {
        this.openTruthDareModal();
      }
    });

    // 通用联机游戏对局房间广播 (全员同步触发)
    net.on('game_started', (msg) => {
      this.openGamePlayOrLobby(msg.gameId, msg);
    });

    // 聊天消息与 AI 互动实时插入与自动平滑吸底滚动
    net.on('chat', (msg) => {
      if (this.currentRoom && msg) {
        if (!this.currentRoom.messages) this.currentRoom.messages = [];
        if (!this.currentRoom.messages.some(m => m.sender === msg.sender && m.text === msg.text && m.time === msg.time)) {
          this.currentRoom.messages.push(msg);
        }
      }

      const chatBoxes = [
        document.getElementById('lobby-chat-logs'),
        document.getElementById('dg-chat-logs'),
        document.getElementById('arena-chat-logs')
      ];

      chatBoxes.forEach(box => {
        if (box && msg) {
          const item = document.createElement('div');
          item.style.marginBottom = '3px';
          item.style.animation = 'fadeIn 0.2s ease';
          item.innerHTML = `
            <b style="color: ${msg.sender === '系统' ? '#D97706' : '#2563EB'};">${msg.sender}：</b>
            <span style="color: #374151;">${msg.text}</span>
            ${msg.time ? `<span style="font-size:10px; color:#9CA3AF; margin-left:6px;">${msg.time}</span>` : ''}
          `;
          box.appendChild(item);
          box.scrollTop = box.scrollHeight;
        }
      });
    });
  }

  // 1. 渲染顶部 Hero 主打卡片与快速入房卡片
  renderHero() {
    const featured = window.FEATURED_GAME;
    
    // 渲染主打卡片
    const featContainer = document.getElementById('hero-featured');
    if (featContainer) {
      featContainer.innerHTML = `
        <div class="featured-content">
          <div class="featured-top-badges">
            <span class="badge-tonight">${featured.mainBadge}</span>
            <div class="badge-sticker">${featured.stickerBadge}</div>
          </div>
          <h2 class="featured-title">${featured.title} <span>${featured.emoji}</span></h2>
          <p class="featured-desc">${featured.subtitle}</p>
          <div class="featured-meta">
            <span>👥 ${featured.players}</span>
            <span>⏱️ ${featured.time}</span>
          </div>
          <div class="featured-actions">
            <button class="btn-primary-blue" id="btn-start-featured">
              + 开一局${featured.title}
            </button>
            <button class="btn-link-rules" id="btn-featured-rules">
              先看玩法
            </button>
          </div>
        </div>
        <div class="featured-illustration">
          ${window.GameIcons.heroPencil}
        </div>
      `;

      document.getElementById('btn-start-featured')?.addEventListener('click', () => {
        window.sounds.click();
        this.openCreateRoomModal(featured.id);
      });

      document.getElementById('btn-featured-rules')?.addEventListener('click', () => {
        window.sounds.click();
        this.openRuleModal(featured.id);
      });
    }

    // 渲染右侧快速入房卡片
    const joinContainer = document.getElementById('hero-quick-join');
    if (joinContainer) {
      joinContainer.innerHTML = `
        <div class="quick-join-header">
          <div class="join-icon-box">
            ${window.GameIcons.linkChain}
          </div>
          <h3 class="quick-join-title">朋友已经开好局？</h3>
          <p class="quick-join-sub">拿着房间号或直接粘贴链接，直接入座。</p>
        </div>

        <div class="quick-join-form">
          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <input 
              type="text" 
              id="quick-room-code" 
              class="room-input" 
              placeholder="输入4位房号或粘贴链接..." 
              autocomplete="off"
            />
            <button class="btn-primary-yellow" id="btn-quick-join" style="width:auto; padding:0 18px; white-space:nowrap; font-weight:800;">
              加入
            </button>
          </div>
          <button class="btn-link-rules" style="width:100%; border:1.5px dashed #3B82F6; color:#2563EB; background:#EFF6FF; padding:6px 0; border-radius:8px; font-size:12.5px; font-weight:700;" onclick="window.app.openCreateRoomModal('draw-guess')">
            ✨ 我来建房叫朋友玩
          </button>
        </div>

        <!-- 当前在线可加入的公共房间列表 -->
        <div id="active-rooms-container" style="margin-bottom: 12px; max-height: 95px; overflow-y: auto;">
          <div style="font-size:11.5px; color:#9CA3AF;">暂无等待中的公共房间，点击上方开一局！</div>
        </div>

        <div class="quick-join-footer">
          <div class="avatar-group">
            <div class="avatar-mini">👓</div>
            <div class="avatar-mini">😊</div>
            <div class="avatar-mini">😉</div>
          </div>
          <span class="footer-quote">不用同一个地方，四处碰撞就好</span>
        </div>
      `;

      const quickInput = document.getElementById('quick-room-code');
      const quickJoinBtn = document.getElementById('btn-quick-join');

      // 智能识别粘贴的链接或口令，自动提取 4 位房号
      quickInput?.addEventListener('input', () => {
        const val = quickInput.value;
        if (val.length > 4) {
          const match = val.match(/room=(\d{4})/i) || val.match(/【(\d{4})】/) || val.match(/\b(\d{4})\b/);
          if (match && match[1]) {
            quickInput.value = match[1];
            this.showToast(`✨ 已为您自动识别房号：${match[1]}`, 'success');
          }
        }
      });

      quickJoinBtn?.addEventListener('click', () => {
        const code = quickInput ? quickInput.value : '';
        window.sounds.click();
        this.handleJoinRoom(code);
      });

      quickInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          quickJoinBtn?.click();
        }
      });
    }
  }

  // 渲染正在等待中的在线房间
  renderActiveRoomsList() {
    const container = document.getElementById('active-rooms-container');
    if (!container) return;

    if (this.activeRooms.length === 0) {
      container.innerHTML = `<div style="font-size:11.5px; color:#9CA3AF;">当前无等待中房间，点击按钮立即开房！</div>`;
      return;
    }

    container.innerHTML = `
      <div style="font-size: 11.5px; font-weight: 700; color: #4B5563; margin-bottom: 4px;">🔥 正在等待的好友房间：</div>
      <div style="display: flex; flex-direction: column; gap: 4px;">
        ${this.activeRooms.map(r => `
          <div style="display:flex; justify-content:space-between; align-items:center; background:#F8FAFC; border:1px solid #E2E8F0; padding:6px 10px; border-radius:8px; font-size:12px; transition:all 0.15s ease;">
            <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:180px; display:inline-flex; align-items:center; gap:5px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#10B981; display:inline-block; animation:pulse 2s infinite; flex-shrink:0;"></span>
              <b style="color:#2563EB;">[${r.code}]</b> ${r.gameTitle} <span class="count-pop" style="color:#64748B;">(${r.playerCount}/${r.maxPlayers}人)</span>
            </span>
            <button style="border:none; background:#FDE047; color:#18181B; font-weight:800; font-size:11px; padding:3px 10px; border-radius:6px; cursor:pointer;" onclick="window.app.handleJoinRoom('${r.code}')">
              立即进房
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 2. 渲染分类过滤标签 (带动态数量角标)
  renderCategoryChips() {
    const categories = ['全部', '🎮 独立对局', '经典桌游', '阵营推理', '聚会破冰', '轻松博弈'];
    const container = document.getElementById('category-filter-bar');
    if (!container) return;

    const getCount = (cat) => {
      if (cat === '全部') return (window.GAMES_LIST || []).length;
      if (cat === '🎮 独立对局') return (window.GAMES_LIST || []).filter(g => g.playable).length;
      return (window.GAMES_LIST || []).filter(g => g.category === cat).length;
    };

    container.innerHTML = categories.map(cat => `
      <button class="filter-chip ${cat === this.currentCategory ? 'active' : ''}" data-cat="${cat}">
        <span>${cat}</span>
        <span class="chip-count-pill">${getCount(cat)}</span>
      </button>
    `).join('');

    container.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        window.sounds.click();
        this.currentCategory = e.currentTarget.dataset.cat;
        container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.renderGameCards();
      });
    });
  }

  // 3. 渲染 17 款游戏卡片
  renderGameCards() {
    const grid = document.getElementById('games-grid');
    if (!grid) return;

    const filteredGames = window.GAMES_LIST.filter(g => {
      let matchCat = false;
      if (this.currentCategory === '全部') {
        matchCat = true;
      } else if (this.currentCategory === '🎮 独立对局') {
        matchCat = g.playable === true;
      } else {
        matchCat = g.category === this.currentCategory;
      }
      const matchSearch = !this.searchQuery || g.title.includes(this.searchQuery) || g.subtitle.includes(this.searchQuery);
      return matchCat && matchSearch;
    });

    const countPill = document.getElementById('games-count-pill');
    if (countPill) countPill.textContent = filteredGames.length;

    if (filteredGames.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; background: #FFFFFF; border: 1.5px dashed #D1D5DB; border-radius: 16px; padding: 40px 20px; text-align: center;">
          <div style="font-size: 32px; margin-bottom: 8px;">🔍</div>
          <h3 style="font-size: 16px; font-weight: 800; color: #111827; margin-bottom: 4px;">未找到匹配的游戏</h3>
          <p style="font-size: 13px; color: #6B7280; margin-bottom: 16px;">没有找到与 “${this.searchQuery}” 相关的游戏，换个词试试吧~</p>
          <button class="btn-primary-yellow" style="width: auto; padding: 6px 18px; font-size: 13px; font-weight: 800;" onclick="window.app.clearSearch()">
            清空搜索条件
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = filteredGames.map(game => {
      const iconSvg = window.GameIcons[game.iconType] || window.GameIcons['uno'];
      const isPlayable = game.playable;
      return `
        <div class="game-card ${isPlayable ? 'is-interactive-card' : ''}" data-game-id="${game.id}" data-badge-color="${game.badgeColor}">
          <div class="card-top">
            <span class="card-badge badge-${game.badgeColor}">${game.badge}</span>
            ${isPlayable ? '<span class="playable-hot-tag">🎮 独立可玩+AI</span>' : '<span class="arena-tag">🎭 联机舞台</span>'}
            <button class="btn-help-rule" data-game-id="${game.id}" title="查看玩法" onclick="event.stopPropagation(); window.app.openRuleModal('${game.id}')">?</button>
          </div>

          <div class="card-icon-stage">
            ${iconSvg}
          </div>

          <div class="card-bottom">
            <div class="card-title-row">
              <span class="card-title">${game.title}</span>
              <button class="btn-quick-add" data-game-id="${game.id}" title="快捷开局" onclick="event.stopPropagation(); window.app.openCreateRoomModal('${game.id}')">+</button>
            </div>
            <p class="card-subtitle">${game.subtitle}</p>
            <div class="card-host-lock">
              <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; margin-right:4px;"></span>
              ${isPlayable ? '<span class="playable-badge">⚡ 独立图形对局 · AI对弈</span>' : '<span>👥 联机房间 · 实时公屏+AI主持</span>'}
            </div>
            <div class="card-meta-row">
              <span>👥 ${game.players}</span>
              <span>⏱️ ${game.time}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    grid.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.gameId;
        window.sounds.click();
        this.openCreateRoomModal(id);
      });
    });
  }

  clearSearch() {
    this.searchQuery = '';
    const input = document.getElementById('search-games-input');
    if (input) input.value = '';
    this.renderGameCards();
  }

  // 4. 玩法介绍弹窗
  openRuleModal(gameId) {
    const game = window.GAMES_LIST.find(g => g.id === gameId) || window.FEATURED_GAME;
    if (!game) return;

    window.sounds.pop();
    const modalEl = document.getElementById('rule-modal');
    const contentEl = document.getElementById('rule-modal-body');
    const iconSvg = window.GameIcons[game.iconType] || window.GameIcons['heroPencil'];

    contentEl.innerHTML = `
      <div class="rule-header">
        <div class="rule-icon-box">${iconSvg}</div>
        <div>
          <span class="card-badge badge-${game.badgeColor || 'amber'}">${game.badge || game.mainBadge}</span>
          <h2 style="font-size: 22px; font-weight: 900; margin-top: 4px; color: #111827;">${game.title}</h2>
          <p style="font-size: 13px; color: #6B7280;">👥 支持 ${game.players} · ⏱️ 预计耗时 ${game.time}</p>
        </div>
      </div>

      <div class="rule-section">
        <div class="rule-section-title"><span>📜</span> 核心规则</div>
        <p class="rule-section-content">${game.rules}</p>
      </div>

      <div class="rule-section">
        <div class="rule-section-title"><span>💡</span> 聚会小贴士</div>
        <p class="rule-section-content">${game.tips}</p>
      </div>

      <div class="rule-section">
        <div class="rule-section-title"><span>🏆</span> 胜负判定</div>
        <p class="rule-section-content">${game.winCond}</p>
      </div>

      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn-primary-blue" style="flex: 1;" onclick="window.app.closeModal(); window.app.openCreateRoomModal('${game.id}')">
          立即开局这一款
        </button>
        <button class="btn-link-rules" onclick="window.app.closeModal()">
          暂不开局
        </button>
      </div>
    `;

    this.showModal(modalEl);

  }

  // 5. 创建房间弹窗
  openCreateRoomModal(gameId) {
    const game = window.GAMES_LIST.find(g => g.id === gameId) || window.FEATURED_GAME;
    window.sounds.pop();
    const modalEl = document.getElementById('create-room-modal');
    const contentEl = document.getElementById('create-room-body');

    const isTwoPlayer = game.id === 'gomoku' || game.maxPlayers === 2;
    const playerSelectHtml = isTwoPlayer ? `
      <div>
        <label style="font-size: 13px; font-weight: 700; color: #374151; display: block; margin-bottom: 6px;">人数上限</label>
        <select id="cr-max-players" class="room-input" style="background:#F9FAFB; border-color:#D1D5DB; font-weight:700; color:#18181B;" disabled>
          <option value="2" selected>2 人专属对决 (双人博弈)</option>
        </select>
        <span style="font-size: 11.5px; color: #D97706; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
          <span>⚠️</span> 五子棋严格限制最多 2 位选手（一人黑一人白），朋友没来可直接召唤 AI 陪玩！
        </span>
      </div>
    ` : `
      <div>
        <label style="font-size: 13px; font-weight: 700; color: #374151; display: block; margin-bottom: 6px;">人数上限</label>
        <select id="cr-max-players" class="room-input" style="cursor: pointer;">
          <option value="2">2 人对决</option>
          <option value="4">4 人局</option>
          <option value="6">6 人局</option>
          <option value="8" selected>8 人爆满</option>
          <option value="10">10 人大派对</option>
        </select>
      </div>
    `;

    contentEl.innerHTML = `
      <h2 style="font-size: 22px; font-weight: 900; color: #111827; margin-bottom: 6px;">创建【${game.title}】联机房间</h2>
      <p style="font-size: 13px; color: #6B7280; margin-bottom: 20px;">系统将生成专属 4 位房号与一键邀请链接，朋友点开即可直接入座！</p>

      <div style="display: flex; flex-direction: column; gap: 16px;">
        <div>
          <label style="font-size: 13px; font-weight: 700; color: #374151; display: block; margin-bottom: 6px;">游戏局标题</label>
          <input type="text" id="cr-room-name" class="room-input" value="今晚不散场的${game.title}局" />
          <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
            <button type="button" class="btn-link-rules" style="font-size:11.5px; padding:3px 9px; background:#F3F4F6; border:1px solid #E5E7EB; border-radius:9999px;" onclick="document.getElementById('cr-room-name').value='今晚不散场的${game.title}局'; window.sounds?.click();">🎉 今晚不散场</button>
            <button type="button" class="btn-link-rules" style="font-size:11.5px; padding:3px 9px; background:#F3F4F6; border:1px solid #E5E7EB; border-radius:9999px;" onclick="document.getElementById('cr-room-name').value='🔥 巅峰对决·输了喝一杯'; window.sounds?.click();">🔥 输了喝一杯</button>
            <button type="button" class="btn-link-rules" style="font-size:11.5px; padding:3px 9px; background:#F3F4F6; border:1px solid #E5E7EB; border-radius:9999px;" onclick="document.getElementById('cr-room-name').value='☕ 养生摸鱼欢乐小局'; window.sounds?.click();">☕ 摸鱼欢乐局</button>
          </div>
        </div>

        ${playerSelectHtml}
      </div>

      <div style="margin-top: 24px; display: flex; gap: 12px;">
        <button class="btn-primary-yellow" id="btn-confirm-create" style="flex: 1;" onclick="window.app.confirmCreateRoom('${game.id}')">
          🚀 立即生成房间与分享链接
        </button>
      </div>
    `;

    this.showModal(modalEl);

    // 回车键快捷确认建房
    setTimeout(() => {
      const nameInp = document.getElementById('cr-room-name');
      nameInp?.focus();
      nameInp?.select();
      nameInp?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.confirmCreateRoom(game.id);
        }
      });
    }, 60);
  }

  confirmCreateRoom(gameId) {
    if (this._isCreatingRoom) return;
    this._isCreatingRoom = true;
    setTimeout(() => { this._isCreatingRoom = false; }, 1000);

    const isTwoPlayer = gameId === 'gomoku';
    const maxP = isTwoPlayer ? 2 : (parseInt(document.getElementById('cr-max-players')?.value, 10) || 8);
    this.closeModal();
    window.roomManager.createRoom(gameId, { maxPlayers: maxP });
  }

  handleJoinRoom(code) {
    if (!code) {
      this.showToast('请输入 4 位房间号！', 'error');
      return;
    }
    // 自动兼容粘贴的完整网址或分享口令
    if (code.includes('room=')) {
      code = code.split('room=')[1].split('&')[0];
    }
    code = code.replace(/[^\d]/g, '').trim();
    if (!code || code.length !== 4) {
      this.showToast('房间号应为 4 位数字，请确认！', 'error');
      return;
    }
    window.roomManager.joinRoom(code);
  }

  openGamePlayOrLobby(gameId, extraData = {}) {
    if (gameId === 'draw-guess' || gameId === 'draw-guess-card') {
      this.openDrawGuessModal();
    } else if (gameId === 'number-bomb') {
      this.openNumberBombModal(true);
    } else if (gameId === 'liars-dice') {
      this.openLiarsDiceModal();
    } else if (gameId === 'gomoku') {
      this.openGomokuModal();
    } else if (gameId === 'undercover' || gameId === 'who-is-the-spy') {
      this.openUndercoverModal();
    } else if (gameId === 'turtle-soup') {
      this.openTurtleSoupModal();
    } else if (gameId === 'truth-or-dare') {
      this.openTruthDareModal();
    } else {
      this.openPartyArenaModal(gameId, extraData);
    }
  }

  // 6. 你画我猜弹窗
  openDrawGuessModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('draw-guess-modal');
    this.injectInviteHeader(modalEl, '你画我猜 · 实时局');
    this.showModal(modalEl);
    setTimeout(() => {
      const canvas = document.getElementById('dg-canvas');
      if (canvas) {
        window.drawGuessGame.init(canvas);
      }
    }, 100);
  }

  // 7. 数字炸弹弹窗
  openNumberBombModal(isHostStart = false) {
    window.sounds.pop();
    const modalEl = document.getElementById('number-bomb-modal');
    this.injectInviteHeader(modalEl, '数字炸弹 · 实时局');
    this.showModal(modalEl);
    if (isHostStart) {
      window.numberBombGame.restart();
    }
  }

  // 8. 大话骰弹窗
  openLiarsDiceModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('liars-dice-modal');
    this.injectInviteHeader(modalEl, '大话骰 · 实时局');
    this.showModal(modalEl);
    window.liarsDiceGame.render();
  }

  // 9. 五子棋弹窗
  openGomokuModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('gomoku-modal');
    this.injectInviteHeader(modalEl, '五子棋 · 实时对弈');
    this.showModal(modalEl);

  }

  // 10. 谁是卧底弹窗
  openUndercoverModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('undercover-modal');
    this.injectInviteHeader(modalEl, '谁是卧底 · 阵营推理');
    this.showModal(modalEl);

  }

  // 11. 海龟汤弹窗
  openTurtleSoupModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('turtle-soup-modal');
    this.injectInviteHeader(modalEl, '海龟汤 · 情境推理');
    this.showModal(modalEl);

  }

  // 12. 真心话大冒险弹窗
  openTruthDareModal() {
    window.sounds.pop();
    const modalEl = document.getElementById('truth-dare-modal');
    this.injectInviteHeader(modalEl, '真心话大冒险 · 破冰局');
    this.showModal(modalEl);

  }

  // 13. 通用联机舞台弹窗 (UNO, 狼人杀, 阿瓦隆等)
  openPartyArenaModal(gameId, extraData = {}) {
    window.sounds.pop();
    const modalEl = document.getElementById('party-arena-modal');
    const game = window.GAMES_LIST.find(g => g.id === gameId) || { title: extraData.gameTitle || '聚会游戏' };
    this.injectInviteHeader(modalEl, `${game.title} · 联机对局`);
    
    const arenaTitle = document.getElementById('arena-game-title');
    if (arenaTitle) arenaTitle.textContent = `${game.title} · 多人联机局`;

    this.renderArenaState(this.currentRoom);
    this.showModal(modalEl);
  }

  renderArenaState(room) {
    if (!room) return;
    const countEl = document.getElementById('arena-player-count');
    if (countEl) countEl.textContent = `${room.players ? room.players.length : 0}/${room.maxPlayers || 8}人`;

    const listEl = document.getElementById('arena-players-list');
    if (listEl && room.players) {
      listEl.innerHTML = room.players.map(p => {
        const isMe = p.id === window.partyNetwork?.playerId;
        const hostTag = p.isHost ? '<span style="font-size:9.5px; background:#FEF3C7; color:#B45309; padding:1px 4px; border-radius:4px; font-weight:700;">👑房主</span>' : '';
        const aiTag = p.isAI ? '<span class="ai-model-tag" style="border-radius:4px;">🤖 AI</span>' : '';
        const meTag = isMe ? '<span style="font-size:9px; background:#DBEAFE; color:#1E40AF; padding:1px 4px; border-radius:4px; font-weight:700;">我</span>' : '';
        return `
          <div style="background:#FFFFFF; border:1.5px solid ${isMe ? '#3B82F6' : '#E2E8F0'}; border-radius:10px; padding:6px 10px; display:flex; align-items:center; gap:6px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
            <span style="font-size:18px;">${p.avatar || '👤'}</span>
            <span style="font-size:12px; font-weight:700; color:#1E293B;">${p.name}</span>
            ${hostTag}
            ${aiTag}
            ${meTag}
          </div>
        `;
      }).join('');
    }

    const chatEl = document.getElementById('arena-chat-logs');
    if (chatEl && room.messages) {
      chatEl.innerHTML = room.messages.map(m => `
        <div style="margin-bottom: 3px;">
          <b style="color: ${m.sender === '系统' ? '#D97706' : '#2563EB'};">${m.sender}：</b>
          <span style="color: #374151;">${m.text}</span>
          ${m.time ? `<span style="font-size:10px; color:#9CA3AF; margin-left:6px;">${m.time}</span>` : ''}
        </div>
      `).join('');
      chatEl.scrollTop = chatEl.scrollHeight;
    }
  }

  // 聚会公共道具箱：掷骰子 (1-6)
  rollPartyDice() {
    window.sounds?.rollDice();
    this.triggerVibrate();
    const diceVal = Math.floor(1 + Math.random() * 6);
    const diceEmoji = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'][diceVal - 1];
    const text = `🎲 掷出了 ${diceEmoji} ${diceVal} 点！`;
    window.partyNetwork?.sendChat(text);
    this.showToast(`你掷出了 ${diceEmoji} ${diceVal} 点！`, 'success');
  }

  // 聚会公共道具箱：抛硬币 (正面/反面)
  flipPartyCoin() {
    window.sounds?.pop();
    this.triggerVibrate();
    const isHeads = Math.random() < 0.5;
    const text = `🪙 抛出硬币：${isHeads ? '🟡 正面 (YES)' : '⚪ 反面 (NO)'}！`;
    window.partyNetwork?.sendChat(text);
    this.showToast(`硬币结果：${isHeads ? '正面 (YES)' : '反面 (NO)'}`, 'success');
  }

  // 聚会公共道具箱：顺位抽签 (1~N号)
  drawPartyLottery() {
    window.sounds?.pop();
    this.triggerVibrate();
    const count = this.currentRoom?.players?.length || 4;
    const num = Math.floor(1 + Math.random() * count);
    const text = `🎯 抽签获得了第【${num}】顺位发言！`;
    window.partyNetwork?.sendChat(text);
    this.showToast(`抽签结果：第 ${num} 顺位`, 'success');
  }

  // 聚会公共道具箱：60秒发言倒计时
  startArenaTimer(seconds = 60) {
    if (this._arenaTimerInterval) clearInterval(this._arenaTimerInterval);
    let left = seconds;
    window.sounds?.click();
    window.partyNetwork?.sendChat(`⏱️ 启动了 ${seconds} 秒发言倒计时！请抓紧时间发言~`);
    const timerBox = document.getElementById('arena-timer-box');
    const timerDisplay = document.getElementById('arena-timer-display');
    const timerBar = document.getElementById('arena-timer-bar');
    if (timerBox) timerBox.style.display = 'block';

    this._arenaTimerInterval = setInterval(() => {
      left--;
      if (timerDisplay) timerDisplay.textContent = `⏱️ 发言倒计时: ${left}s`;
      if (timerBar) timerBar.style.width = `${(left / seconds) * 100}%`;
      if (left <= 5 && left > 0) window.sounds?.tick(true);

      if (left <= 0) {
        clearInterval(this._arenaTimerInterval);
        if (timerDisplay) timerDisplay.textContent = `⏱️ 叮！60秒时间到！发言结束！`;
        window.sounds?.bombExplode();
        window.partyNetwork?.sendChat(`🔔 叮！60秒发言时间到！请下一位玩家准备~`);
      }
    }, 1000);
  }

  // 为所有游戏弹窗顶部注入醒目的邀请与房号药丸
  injectInviteHeader(modalEl, title) {
    if (!modalEl || !this.currentRoom) return;
    const room = this.currentRoom;
    const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') + '/';
    const inviteLink = `${baseUrl}?room=${room.code}`;

    let topBar = modalEl.querySelector('.modal-game-topbar');
    if (!topBar) {
      topBar = document.createElement('div');
      topBar.className = 'modal-game-topbar';
      topBar.style.cssText = 'background:#FFFBEB; border:1.5px dashed #F59E0B; border-radius:10px; padding:6px 12px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;';
      const card = modalEl.querySelector('.modal-card');
      if (card) {
        card.insertBefore(topBar, card.firstChild.nextSibling);
      }
    }

    topBar.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="background:#FEF3C7; color:#B45309; font-weight:900; font-size:12px; padding:2px 8px; border-radius:4px; border:1px solid #F59E0B;">
          房号: ${room.code}
        </span>
        <span style="font-size:12.5px; font-weight:700; color:#18181B;">${title} (${room.players.length}人在线)</span>
      </div>
      <div style="display:flex; gap:6px;">
        <button style="background:#2563EB; color:#fff; border:none; font-size:11.5px; font-weight:700; padding:3px 10px; border-radius:6px; cursor:pointer;" onclick="window.app.copyText('${inviteLink}', '📋 邀请链接已复制！微信/QQ发给朋友即可！')">
          📋 复制邀请链接
        </button>
        <button style="background:#F59E0B; color:#fff; border:none; font-size:11.5px; font-weight:700; padding:3px 8px; border-radius:6px; cursor:pointer;" onclick="window.app.copyWeChatInvite('${room.code}', '${room.gameTitle}', '${inviteLink}')">
          💬 口令
        </button>
      </div>
    `;
  }

  // 14. 联机等待大厅 (包含超醒目邀请卡片与一键复制)
  openRoomLobbyModal(room) {
    this.currentRoom = room;
    this.updateStickyRoomBar(room);
    window.sounds.pop();
    const modalEl = document.getElementById('room-lobby-modal');
    const contentEl = document.getElementById('room-lobby-body');

    const baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '') + '/';
    const inviteLink = `${baseUrl}?room=${room.code}`;

    // 判断是否需要召唤 AI（真实玩家数 < 最小开局人数时才显示）
    const realPlayers = (room.players || []).filter(p => !p.isAI);
    const minPlayers = 2; // 大多数游戏最少2人
    const hasEnoughPlayers = realPlayers.length >= minPlayers;
    const hasAI = (room.players || []).some(p => p.isAI);

    let aiSection = '';
    if (hasAI) {
      // 已有 AI，不再显示召唤按钮
      aiSection = '';
    } else if (hasEnoughPlayers) {
      aiSection = `
        <div class="ai-enough-players">
          <span>✅</span>
          <span>人数已够，可以开始了！如需 AI 陪玩可在开局后加入</span>
        </div>
      `;
    } else {
      aiSection = `
        <button class="btn-summon-ai" onclick="window.partyNetwork.addAI()">
          <span style="font-size:16px;">🤖</span>
          <span>朋友还没到？先召唤 AI 陪玩</span>
        </button>
      `;
    }

    contentEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #F3F4F6; padding-bottom: 12px; margin-bottom: 14px;">
        <div>
          <span class="card-badge badge-blue">🟢 联机房间中</span>
          <h2 style="font-size: 19px; font-weight: 900; color: #111827; margin-top: 4px;">
            ${room.gameTitle || '聚会游戏'}
          </h2>
        </div>
        ${aiSection}
      </div>

      <!-- 核心醒目：房间号与邀请链接展示卡片 -->
      <div style="background: linear-gradient(135deg, #FFFBEB, #FEF3C7); border: 2px dashed #F59E0B; border-radius: 14px; padding: 14px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <span style="font-size: 13px; font-weight: 800; color: #B45309;">📢 邀请好友一起玩：</span>
          <span style="background: #FFFFFF; color: #B45309; font-size: 18px; font-weight: 900; padding: 3px 14px; border-radius: 8px; border: 1.5px solid #F59E0B; letter-spacing: 2px; box-shadow: 0 2px 4px rgba(0,0,0,0.06);">
            ${room.code}
          </span>
        </div>

        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input 
            type="text" 
            id="share-link-input" 
            class="room-input" 
            readonly 
            value="${inviteLink}" 
            style="font-size: 12px; background: rgba(255,255,255,0.8); font-weight: 600; color: #111827; cursor: text;" 
            onclick="this.select();" 
          />
          <button class="btn-primary-yellow" style="width: auto; padding: 0 16px; font-size: 13px; white-space: nowrap; font-weight:800;" onclick="window.app.copyText('${inviteLink}', '📋 邀请链接已复制！发给好友即可入座！')">
            📋 复制
          </button>
          <button class="btn-link-rules" style="border: 1px solid #D1D5DB; background: #fff; padding: 0 12px; font-size: 13px; white-space: nowrap;" onclick="window.app.copyWeChatInvite('${room.code}', '${room.gameTitle}', '${inviteLink}')">
            💬 口令
          </button>
        </div>

        <div style="font-size: 11.5px; color: #92400E; display: flex; align-items: center; gap: 4px;">
          <span>💡</span> 朋友打开链接自动入座，或首页输入房号 <b>${room.code}</b>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h4 style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 8px; display:flex; align-items:center; gap:6px;">
          <span>入座玩家</span>
          <span style="background:#EFF6FF; color:#2563EB; font-size:11px; padding:1px 7px; border-radius:9999px; border:1px solid #BFDBFE;">${room.players.length}/${room.maxPlayers}</span>
        </h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
          ${room.players.map(p => {
            const isMe = p.id === window.partyNetwork?.playerInfo?.id;
            return `
            <div class="player-card-lobby ${p.isHost ? 'is-host' : ''} ${p.isAI ? 'is-ai' : ''} ${isMe ? 'is-me' : ''} ${p.online === false ? 'is-offline' : ''}" ${isMe ? 'onclick="window.app.cycleMyAvatar()" style="cursor:pointer;" title="点击切换头像"' : ''}>
              <div style="font-size: 26px; margin-bottom: 3px;">${p.avatar}${isMe ? '<span style="font-size:10px; opacity:0.5; vertical-align:middle; margin-left:2px;">🔄</span>' : ''}</div>
              <div style="font-size: 12px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}${isMe ? ' (你)' : ''}</div>
              <div style="font-size: 10.5px; margin-top: 3px; color: ${p.isAI ? '#7C3AED' : (p.online === false ? '#9CA3AF' : '#16A34A')}; font-weight: 700;">
                ${p.isHost ? '👑 房主' : (p.isAI ? '<span class="ai-model-tag">🤖 Qwen 3.5</span>' : (p.online === false ? '○ 离线' : '● 在线'))}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </div>

      <div style="background: #F9FAFB; border-radius: 12px; padding: 10px 12px; margin-bottom: 16px; border: 1px solid #F3F4F6;">
        <div style="font-size: 12px; font-weight: 700; color: #6B7280; margin-bottom: 6px; display:flex; align-items:center; gap:4px;">💬 房间聊天</div>
        <div id="lobby-chat-logs" style="max-height: 80px; overflow-y: auto; font-size: 12px; line-height: 1.6;">
          ${(room.messages || []).map(m => `
            <div style="margin-bottom: 3px; display:flex; justify-content:space-between; align-items:baseline;">
              <span>
                <b style="color: ${m.sender === '系统' ? '#D97706' : '#2563EB'};">${m.sender}：</b>
                <span style="color: #374151;">${m.text}</span>
              </span>
              ${m.time ? `<span style="font-size:10px; color:#9CA3AF; margin-left:8px; white-space:nowrap; flex-shrink:0;">${m.time}</span>` : ''}
            </div>
          `).join('')}
        </div>
        <!-- 快捷热场 Emoji 药丸 -->
        <div style="display:flex; gap:5px; flex-wrap:wrap; margin:6px 0 6px;">
          <button type="button" class="btn-link-rules" style="font-size:11px; padding:2px 8px; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:9999px;" onclick="window.app.sendQuickChat('👏 朋友到齐，好戏开场！')">👏 开冲</button>
          <button type="button" class="btn-link-rules" style="font-size:11px; padding:2px 8px; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:9999px;" onclick="window.app.sendQuickChat('🔥 今晚必须战个痛快！')">🔥 战个痛快</button>
          <button type="button" class="btn-link-rules" style="font-size:11px; padding:2px 8px; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:9999px;" onclick="window.app.sendQuickChat('😂 哈哈哈哈太逗了')">😂 哈哈</button>
          <button type="button" class="btn-link-rules" style="font-size:11px; padding:2px 8px; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:9999px;" onclick="window.app.sendQuickChat('🤔 容我仔细思考...')">🤔 容我三思</button>
          <button type="button" class="btn-link-rules" style="font-size:11px; padding:2px 8px; background:#FFFFFF; border:1px solid #E5E7EB; border-radius:9999px;" onclick="window.app.sendQuickChat('🍺 愿赌服输，自罚一杯！')">🍺 认罚</button>
        </div>
        <div class="lobby-input-row">
          <input type="text" id="lobby-chat-input" class="room-input" placeholder="发消息打个招呼..." style="font-size:13px;" onkeypress="if(event.key==='Enter'){
            const val = this.value.trim();
            if(val){
              window.partyNetwork.sendChat(val);
              this.value = '';
            }
          }" />
          <button class="btn-primary-yellow" style="width: auto; padding: 0 14px; font-size:13px;" onclick="
            const inp = document.getElementById('lobby-chat-input');
            if(inp && inp.value.trim()){
              window.partyNetwork.sendChat(inp.value.trim());
              inp.value = '';
            }
          ">发送</button>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <button class="btn-primary-blue" style="flex: 1; padding: 12px 0; font-size:14px; font-weight:800; border-radius:12px;" onclick="window.app.startGameFromLobby('${room.gameId}')">
          🚀 开始游戏！
        </button>
        <button class="btn-link-rules" style="padding: 12px 16px; border-radius:12px;" onclick="window.app.closeModal()">
          后台等候
        </button>
      </div>
    `;

    this.showModal(modalEl);
  }

  getLobbyPlayersHtml(room) {
    if (!room || !room.players) return '';
    const myId = window.partyNetwork?.playerId;
    const canAddAI = room.players.length < room.maxPlayers;

    const playerItems = room.players.map(p => {
      const isMe = p.id === myId;
      const hostTag = p.isHost ? '<span style="font-size:9.5px; background:#FEF3C7; color:#B45309; padding:1px 4px; border-radius:4px; font-weight:700;">👑房主</span>' : '';
      const aiTag = p.isAI ? '<span class="ai-model-tag" style="border-radius:4px;">🤖 AI</span>' : '';
      const meTag = isMe ? '<span style="font-size:9px; background:#DBEAFE; color:#1E40AF; padding:1px 4px; border-radius:4px; font-weight:700;">我</span>' : '';
      const meClickAttr = isMe ? 'onclick="window.app.cycleMyAvatar()" title="点击换头像"' : '';
      const meCursor = isMe ? 'cursor:pointer;' : '';

      return `
        <div class="player-card-lobby ${p.isHost ? 'is-host' : ''} ${p.isAI ? 'is-ai' : ''} ${isMe ? 'is-me' : ''}" style="${meCursor} padding:8px 6px; text-align:center; position:relative;" ${meClickAttr}>
          <div style="font-size: 26px; line-height: 1.1; margin-bottom: 4px;">${p.avatar || '👤'}</div>
          <div style="font-size: 11px; font-weight: 700; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${p.name}">
            ${p.name || '玩家'}
          </div>
          <div style="display:flex; justify-content:center; gap:2px; margin-top:3px; flex-wrap:wrap;">
            ${hostTag}
            ${aiTag}
            ${meTag}
          </div>
          ${isMe ? '<div style="font-size:9px; color:#3B82F6; margin-top:2px;">🔄点我换头像</div>' : ''}
        </div>
      `;
    });

    // 填充剩余席位
    const emptyCount = Math.max(0, room.maxPlayers - room.players.length);
    for (let i = 0; i < emptyCount; i++) {
      if (i === 0 && canAddAI) {
        playerItems.push(`
          <div class="player-card-lobby" style="padding:8px 4px; border:1.5px dashed #CBD5E1; background:#F8FAFC; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center; cursor:pointer;" onclick="window.partyNetwork.addAI(); window.sounds?.pop();" title="缺少朋友？点击召唤AI陪玩">
            <div style="font-size:22px; line-height:1;">🤖➕</div>
            <div style="font-size:10.5px; font-weight:700; color:#7C3AED; margin-top:3px;">缺人召唤AI</div>
          </div>
        `);
      } else {
        playerItems.push(`
          <div class="player-card-lobby" style="padding:8px 4px; border:1.5px dashed #E5E7EB; background:#F9FAFB; opacity:0.6; text-align:center; display:flex; flex-direction:column; justify-content:center; align-items:center;">
            <div style="font-size:20px; line-height:1; color:#9CA3AF;">🪑</div>
            <div style="font-size:10px; color:#9CA3AF; margin-top:3px;">空位虚席</div>
          </div>
        `);
      }
    }

    return playerItems.join('');
  }

  renderLobbyPlayers(room) {
    if (!room) return;
    const grid = document.getElementById('lobby-players-grid');
    if (grid) {
      grid.innerHTML = this.getLobbyPlayersHtml(room);
    }
    const pill = document.getElementById('lobby-player-count-pill');
    if (pill) {
      pill.textContent = `${room.players.length}/${room.maxPlayers}`;
    }
  }

  sendQuickChat(text) {
    if (!text || !window.partyNetwork) return;
    window.sounds?.pop();
    this.triggerVibrate();
    window.partyNetwork.sendChat(text);
  }

  startGameFromLobby(gameId) {
    if (window.partyNetwork?.connected) {
      window.partyNetwork.startGame(gameId);
      this.closeModal();
      this.showToast('🚀 已通知全员开局！', 'success');
      this.openGamePlayOrLobby(gameId);
    } else {
      this.closeModal();
      this.openGamePlayOrLobby(gameId);
    }
  }

  // 智能分享：移动端调起系统原生分享面板，PC 端自动复制邀请链接
  shareOrCopyInvite(roomCode, gameTitle, inviteLink) {
    const text = `🎉 朋友到齐，好戏开场！我开了一局【${gameTitle}】，快来一起玩！\n房号：【${roomCode}】`;
    if (navigator.share && /mobile|android|iphone|ipad/i.test(navigator.userAgent)) {
      navigator.share({
        title: `朋友到齐，好戏开场 - ${gameTitle}`,
        text: text,
        url: inviteLink
      }).then(() => {
        this.showToast('✅ 邀请已成功分享！', 'success');
      }).catch((err) => {
        if (err && err.name === 'AbortError') return;
        this.copyWeChatInvite(roomCode, gameTitle, inviteLink);
      });
    } else {
      this.copyWeChatInvite(roomCode, gameTitle, inviteLink);
    }
  }

  // 一键复制微信/QQ好友邀请口令
  copyWeChatInvite(roomCode, gameTitle, inviteLink) {
    const text = `🎉 朋友到齐，好戏开场！我开了一局【${gameTitle}】，快来一起玩！\n👉 点击链接直接进房：${inviteLink}\n🏠 或者打开 http://ysgg.abrdns.com/game/ 输入房号【${roomCode}】直接入座！`;
    this.copyText(text, '📋 微信/QQ好友邀请语已复制！直接粘贴到群里即可！');
  }

  // 跨浏览器、跨 HTTP/HTTPS 安全复制函数
  copyText(text, successMsg) {
    // 方案 1: navigator.clipboard (支持现代安全上下文)
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        this.triggerVibrate();
        this.showToast(successMsg, 'success');
      }).catch(() => {
        this.fallbackCopy(text, successMsg);
      });
      return;
    }
    // 方案 2: textarea + execCommand (完美兼容所有 HTTP 网页与手机浏览器)
    this.fallbackCopy(text, successMsg);
  }

  fallbackCopy(text, successMsg) {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "0";
      textArea.style.top = "0";
      textArea.style.opacity = "0.01";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        this.triggerVibrate();
        this.showToast(successMsg, 'success');
        return;
      }
    } catch (_) {}

    prompt("请长按全选下方文字复制发给朋友：", text);
  }

  triggerVibrate() {
    try {
      if (window.navigator?.vibrate) {
        window.navigator.vibrate([15, 30, 15]);
      }
    } catch (_) {}
  }

  showModal(modalEl) {
    this.closeModal();
    if (!modalEl) return;
    this.activeModal = modalEl;
    modalEl.classList.add('active');
    setTimeout(() => {
      const logs = modalEl.querySelector('#lobby-chat-logs') || modalEl.querySelector('#dg-chat-logs') || modalEl.querySelector('#arena-chat-logs');
      if (logs) logs.scrollTop = logs.scrollHeight;
    }, 60);
  }

  closeModal() {
    if (this.activeModal) {
      this.activeModal.classList.remove('active');
      this.activeModal = null;
    }
  }

  showToast(message, type = 'normal') {
    const toast = document.getElementById('global-toast');
    if (!toast) return;
    // 根据 type 自动加 icon
    const icons = { success: '✅', error: '❌', normal: '💬' };
    const icon = icons[type] || '';
    toast.innerHTML = `${icon ? `<span>${icon}</span>` : ''}<span>${message}</span>`;
    toast.className = `toast-container active ${type}`;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('active');
    }, 3200);
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.closeModal();
      });
    });

    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        window.sounds.click();
        this.closeModal();
      });
    });

    const soundToggle = document.getElementById('sound-toggle-btn');
    if (soundToggle) {
      const savedMute = localStorage.getItem('party_sound_muted') === 'true';
      if (savedMute) {
        window.sounds.muted = true;
        soundToggle.textContent = '🔇';
        soundToggle.classList.add('muted');
      }
      soundToggle.addEventListener('click', () => {
        const isMuted = window.sounds.toggleMute();
        localStorage.setItem('party_sound_muted', isMuted);
        soundToggle.textContent = isMuted ? '🔇' : '🔊';
        soundToggle.classList.toggle('muted', isMuted);
        this.showToast(isMuted ? '已开启静音模式' : '已开启游戏音效');
      });
    }

    // 移动端初次交互静默解锁 Web Audio 上下文
    const unlockAudio = () => {
      window.sounds?.init();
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio, { passive: true });

    // 搜索游戏框实时过滤
    const searchInput = document.getElementById('search-games-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        this.searchQuery = searchInput.value.trim();
        this.renderGameCards();
      });
    }

    // 检查 URL 是否带 room 参数自动加入
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam) {
      // 优雅等待 WebSocket 连接后加入，避免超时离线回退
      const checkAndJoin = () => {
        if (window.partyNetwork?.connected) {
          const cleanCode = roomParam.replace(/[^\d]/g, '');
          this.showToast(`🎉 欢迎入座！正在连入好友房间 [${cleanCode}]...`, 'success');
          this.handleJoinRoom(roomParam);
        } else {
          setTimeout(checkAndJoin, 200);
        }
      };
      checkAndJoin();
    }
  }
}

window.app = new PartyApp();

document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
});
