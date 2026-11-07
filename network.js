/**
 * 实时多人在线 WebSocket 网络管理模块 (含重连断线恢复与消息安全队列)
 */

class PartyNetwork {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.myId = null;
    this.currentRoom = null;
    this.isDrawer = false;
    this.pendingQueue = [];
    
    // 初始化个人身份 (带唯一ID保证刷新不丢座)
    this.playerInfo = this.loadOrInitPlayer();
    
    // 事件回调集合
    this.listeners = {
      active_rooms_list: [],
      room_joined: [],
      room_state: [],
      chat: [],
      draw_round_start: [],
      draw_stroke: [],
      draw_clear: [],
      draw_tick: [],
      draw_guess_correct: [],
      draw_timeout: [],
      bomb_state: [],
      gomoku_state: [],
      dice_state: [],
      undercover_state: [],
      turtle_soup_state: [],
      truth_dare_state: [],
      arena_state: [],
      game_started: [],
      error: []
    };

    this.connect();
  }

  loadOrInitPlayer() {
    let playerId = localStorage.getItem('party_player_id');
    let name = localStorage.getItem('party_player_name');
    let avatar = localStorage.getItem('party_player_avatar');
    
    if (!playerId) {
      playerId = 'p_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem('party_player_id', playerId);
    }

    if (!name) {
      const funNames = ['快乐小柴', '机智狐狸', '摸鱼大熊猫', '吃瓜松鼠', '高冷考拉', '早睡小羊', '冲浪水獭'];
      const avatars = ['🦊', '🐼', '🐱', '🐶', '🐨', '🐰', '🦁', '🐯'];
      name = funNames[Math.floor(Math.random() * funNames.length)];
      avatar = avatars[Math.floor(Math.random() * avatars.length)];
      localStorage.setItem('party_player_name', name);
      localStorage.setItem('party_player_avatar', avatar);
    }
    return { id: playerId, name, avatar };
  }

  connect() {
    let protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let host = window.location.host;
    
    let wsUrl = '';
    if (window.location.port === '8080' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      wsUrl = `${protocol}//${window.location.hostname}:3002`;
    } else {
      wsUrl = `${protocol}//${host}/game/ws`;
    }

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected successfully!');
        this.connected = true;
        this.updateOnlineBadge(true);

        // 刷新清空待发消息队列
        while (this.pendingQueue.length > 0) {
          const item = this.pendingQueue.shift();
          this.ws.send(JSON.stringify(item));
        }

        // 检查 sessionStorage 是否有未退出的房间，自动重连
        const savedRoomCode = sessionStorage.getItem('party_active_room_code');
        if (savedRoomCode && !window.location.search.includes('room=')) {
          this.joinRoom(savedRoomCode);
        }
      };

      this.ws.onclose = () => {
        console.warn('[WebSocket] Disconnected, retrying in 2.5s...');
        this.connected = false;
        this.updateOnlineBadge(false);
        setTimeout(() => this.connect(), 2500);
      };

      this.ws.onerror = (err) => {
        console.error('[WebSocket] Error:', err);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleServerMessage(data);
        } catch (e) {
          console.error('[WebSocket] Bad JSON:', e);
        }
      };
    } catch (err) {
      console.warn('[WebSocket] Direct connection failed, falling back...');
    }
  }

  updateOnlineBadge(isOnline) {
    const badge = document.getElementById('network-status-badge');
    if (badge) {
      if (isOnline) {
        if (this._wasDisconnected) {
          window.app?.showToast('🟢 网络连接已恢复！', 'success');
          this._wasDisconnected = false;
        }
        badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981; margin-right:5px; box-shadow:0 0 6px #10B981;"></span>实时联机`;
        badge.style.background = '#ECFDF5';
        badge.style.color = '#059669';
        badge.style.borderColor = '#A7F3D0';
      } else {
        this._wasDisconnected = true;
        badge.innerHTML = `<span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#F59E0B; animation:pulse 1.2s infinite; margin-right:5px;"></span>重连中...`;
        badge.style.background = '#FFFBEB';
        badge.style.color = '#D97706';
        badge.style.borderColor = '#FDE68A';
      }
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.log('[WebSocket] Enqueuing message for when connection opens:', data.type);
      this.pendingQueue.push(data);
    }
  }

  on(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].push(callback);
    }
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in listener for ${event}:`, e); }
      });
    }
  }

  handleServerMessage(msg) {
    switch (msg.type) {
      case 'active_rooms_list':
        this.emit('active_rooms_list', msg.rooms);
        break;

      case 'room_joined':
        this.myId = msg.myId;
        this.currentRoom = msg.room;
        sessionStorage.setItem('party_active_room_code', msg.room.code);
        this.emit('room_joined', msg);
        break;

      case 'room_state':
        this.currentRoom = msg.room;
        this.emit('room_state', msg.room);
        break;

      case 'chat_broadcast':
        this.emit('chat', msg.message);
        break;

      case 'draw_round_start':
        this.isDrawer = msg.isDrawer;
        this.emit('draw_round_start', msg);
        break;

      case 'draw_stroke':
        this.emit('draw_stroke', msg.stroke);
        break;

      case 'draw_clear':
        this.emit('draw_clear', msg);
        break;

      case 'draw_tick':
        this.emit('draw_tick', msg.timeLeft);
        break;

      case 'draw_guess_correct':
        this.emit('draw_guess_correct', msg);
        break;

      case 'draw_timeout':
        this.emit('draw_timeout', msg);
        break;

      case 'bomb_state':
        this.emit('bomb_state', msg);
        break;

      case 'gomoku_state':
        this.emit('gomoku_state', msg);
        break;

      case 'dice_state':
        this.emit('dice_state', msg);
        break;

      case 'undercover_state':
        this.emit('undercover_state', msg);
        break;

      case 'turtle_soup_state':
        this.emit('turtle_soup_state', msg);
        break;

      case 'truth_dare_state':
        this.emit('truth_dare_state', msg);
        break;

      case 'arena_state':
        this.emit('arena_state', msg);
        break;

      case 'game_started':
        this.emit('game_started', msg);
        break;

      case 'error':
        window.app?.showToast(msg.message, 'error');
        this.emit('error', msg.message);
        break;
    }
  }

  // --- 发送业务操作 ---
  addAI(count = 1) {
    this.send({ type: 'add_ai', count: parseInt(count) || 1 });
  }

  removeAI(aiId) {
    this.send({ type: 'remove_ai', aiId });
  }

  updateProfile(name, avatar) {
    if (name) {
      this.playerInfo.name = name;
      localStorage.setItem('party_player_name', name);
    }
    if (avatar) {
      this.playerInfo.avatar = avatar;
      localStorage.setItem('party_player_avatar', avatar);
    }
    this.send({
      type: 'update_profile',
      name: this.playerInfo.name,
      avatar: this.playerInfo.avatar
    });
  }

  createRoom(gameId, gameTitle, maxPlayers = 8) {
    this.send({
      type: 'create_room',
      gameId: gameId,
      gameTitle: gameTitle,
      maxPlayers: parseInt(maxPlayers),
      playerId: this.playerInfo.id,
      name: this.playerInfo.name,
      avatar: this.playerInfo.avatar
    });
  }

  joinRoom(roomCode) {
    this.send({
      type: 'join_room',
      roomCode: roomCode,
      playerId: this.playerInfo.id,
      name: this.playerInfo.name,
      avatar: this.playerInfo.avatar
    });
  }

  sendChat(text) {
    this.send({
      type: 'chat',
      text: text
    });
  }

  startGame(gameId) {
    this.send({
      type: 'start_game',
      gameId: gameId
    });
  }

  sendStroke(x0, y0, x1, y1, color, size) {
    this.send({
      type: 'draw_stroke',
      stroke: { x0, y0, x1, y1, color, size }
    });
  }

  sendDrawClear() {
    this.send({ type: 'draw_clear' });
  }

  sendBombGuess(num) {
    this.send({
      type: 'bomb_guess',
      num: parseInt(num)
    });
  }

  sendGomokuMove(r, c) {
    this.send({
      type: 'gomoku_move',
      r, c
    });
  }

  sendDiceCall(count, pip) {
    this.send({
      type: 'dice_call',
      count: parseInt(count),
      pip: parseInt(pip)
    });
  }

  sendDiceShowdown() {
    this.send({ type: 'dice_showdown' });
  }

  sendDiceReroll() {
    this.send({ type: 'dice_reroll' });
  }

  sendUndercoverVote(targetId) {
    this.send({
      type: 'undercover_vote',
      targetId: targetId
    });
  }

  sendUndercoverSpeakDone() {
    this.send({ type: 'undercover_speak_done' });
  }

  sendTurtleSoupSolve() {
    this.send({ type: 'turtle_soup_solve' });
  }

  sendTruthDareDraw(mode) {
    this.send({
      type: 'truth_or_dare_draw',
      mode: mode
    });
  }
}

window.partyNetwork = new PartyNetwork();
