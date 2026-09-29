(() => {
  'use strict';

  const STORAGE_KEY = 'smarthome-demo-v1';
  const deviceCards = [...document.querySelectorAll('.device-card')];
  const notificationList = document.getElementById('notificationList');
  const toastStack = document.getElementById('toastStack');
  const modal = document.getElementById('cameraModal');
  const defaultSettings = { darkMode: true, notifications: true, motion: true, autoSecurity: true };
  const defaultNotifications = [
    { message: 'Front door locked', icon: 'i-lock', createdAt: Date.now() - 2 * 60000, read: false },
    { message: 'Living Room Light turned ON', icon: 'i-light', createdAt: Date.now() - 5 * 60000, read: false },
    { message: 'Motion detected at Front Door · simulated', icon: 'i-activity', createdAt: Date.now() - 8 * 60000, read: true },
    { message: 'Energy usage updated · 4.8 kWh', icon: 'i-bolt', createdAt: Date.now() - 10 * 60000, read: true }
  ];
  const initialDevices = Object.fromEntries(deviceCards.map((card) => [card.dataset.device, card.dataset.defaultOn === 'true']));

  // Local Storage
  function loadState() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return {};
      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  const saved = loadState();
  const state = {
    devices: { ...initialDevices, ...(saved.devices || {}) },
    temperature: Number.isFinite(saved.temperature) ? Math.min(30, Math.max(16, saved.temperature)) : 24,
    fanSpeed: Number.isFinite(saved.fanSpeed) ? Math.min(100, Math.max(0, saved.fanSpeed)) : 60,
    settings: { ...defaultSettings, ...(saved.settings || {}) },
    notifications: Array.isArray(saved.notifications) ? saved.notifications : defaultNotifications
  };
  let previousFocus = null;
  let toastTimer = 0;

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The dashboard remains interactive when browser storage is unavailable.
    }
  }

  function iconMarkup(id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('icon');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `#${id}`);
    svg.append(use);
    return svg;
  }

  function updateClock() {
    const now = new Date();
    document.getElementById('clockTime').textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    document.getElementById('clockDate').textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    document.getElementById('fullDate').textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    document.querySelectorAll('.camera-time').forEach((time) => { time.textContent = now.toLocaleTimeString('en-US', { hour12: false }); });
    document.querySelectorAll('.last-updated').forEach((time) => {
      const updatedAt = Number(time.closest('.device-card').dataset.updatedAt || 0);
      time.textContent = updatedAt ? relativeTime(updatedAt) : 'just now';
    });
  }

  function relativeTime(timestamp) {
    const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} day ago`;
  }

  // Energy Management
  function renderEnergyChart() {
    const values = [4.2, 5.1, 3.9, 4.6, 5.4, 4.6, 4.8];
    const chart = document.getElementById('energyChart');
    const today = new Date();
    chart.replaceChildren();
    values.forEach((value, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() - (values.length - 1 - index));
      const column = document.createElement('div');
      column.className = `chart-column${index === values.length - 1 ? ' today' : ''}`;
      column.setAttribute('aria-label', `${date.toLocaleDateString('en-US', { weekday: 'long' })}: ${value} kilowatt hours`);
      const track = document.createElement('div');
      track.className = 'bar-track';
      const bar = document.createElement('div');
      bar.className = 'bar';
      bar.style.height = `${value / 6 * 100}%`;
      track.append(bar);
      const label = document.createElement('span');
      label.className = 'chart-day';
      label.textContent = date.toLocaleDateString('en-US', { weekday: 'short' });
      column.append(track, label);
      chart.append(column);
    });
    chart.setAttribute('aria-label', `Seven-day energy use ending today: ${values.join(', ')} kilowatt hours`);
  }

  // Notification System
  function showToast(message) {
    if (!state.settings.notifications) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.append(iconMarkup('i-check'));
    const text = document.createElement('span');
    text.textContent = message;
    toast.append(text);
    toastStack.append(toast);
    window.setTimeout(() => toast.remove(), 3500);
  }

  function renderNotifications() {
    notificationList.replaceChildren();
    const items = [...state.notifications].sort((first, second) => second.createdAt - first.createdAt).slice(0, 30);
    state.notifications = items;
    items.forEach((notification) => {
      const item = document.createElement('article');
      item.className = `notification-item${notification.read ? '' : ' unread'}`;
      const icon = document.createElement('span');
      icon.className = 'notification-icon';
      icon.append(iconMarkup(notification.icon || 'i-bell'));
      const content = document.createElement('div');
      const message = document.createElement('p');
      message.className = 'notification-message';
      message.textContent = notification.message;
      const time = document.createElement('div');
      time.className = 'notification-time';
      time.textContent = relativeTime(notification.createdAt);
      content.append(message, time);
      item.append(icon, content);
      notificationList.append(item);
    });
    document.getElementById('emptyNotifications').hidden = items.length > 0;
    saveState();
  }

  function addNotification(message, icon = 'i-bell') {
    state.notifications.unshift({ message, icon, createdAt: Date.now(), read: false });
    renderNotifications();
    showToast(message);
  }

  document.getElementById('markRead').addEventListener('click', () => {
    state.notifications.forEach((notification) => { notification.read = true; });
    renderNotifications();
    showToast('All notifications marked as read');
  });

  document.getElementById('clearNotifications').addEventListener('click', () => {
    state.notifications = [];
    renderNotifications();
    showToast('Notifications cleared');
  });

  // Device Management
  function updateDeviceCard(card, updatedAt = Number(card.dataset.updatedAt || 0)) {
    const name = card.dataset.device;
    const isOn = Boolean(state.devices[name]);
    card.dataset.on = String(isOn);
    if (updatedAt) card.dataset.updatedAt = String(updatedAt);
    card.querySelector('.switch').setAttribute('aria-checked', String(isOn));
    const status = card.querySelector('.device-status');
    if (name === 'Smart Door') status.textContent = isOn ? 'Currently Locked' : 'Currently Unlocked';
    else status.textContent = `Currently ${isOn ? 'ON' : 'OFF'}`;
  }

  function refreshDashboard() {
    const active = deviceCards.filter((card) => state.devices[card.dataset.device]).length;
    document.getElementById('activeCount').textContent = active;
    document.getElementById('deviceSummary').textContent = `${active} of ${deviceCards.length} devices on`;
    document.getElementById('deviceCountNote').textContent = `${active} devices currently running`;

    document.querySelectorAll('.room-card').forEach((room) => {
      const initialActive = Number(room.dataset.initialActive);
      const currentRoomDevices = deviceCards.filter((card) => card.dataset.room === room.dataset.room);
      const delta = currentRoomDevices.reduce((total, card) => total + Number(state.devices[card.dataset.device]) - Number(card.dataset.defaultOn === 'true'), 0);
      const roomActive = Math.max(0, Math.min(Number(room.querySelector('.room-total').textContent), initialActive + delta));
      room.querySelector('.room-active').textContent = roomActive;
      room.querySelector('.room-progress span').style.width = `${roomActive / Number(room.querySelector('.room-total').textContent) * 100}%`;
      const roomStatus = room.querySelector('.room-state');
      const isActive = roomActive > 0;
      roomStatus.classList.toggle('idle', !isActive);
      roomStatus.querySelector('span:last-child').textContent = isActive ? 'Active' : 'Idle';
    });

    const locked = Boolean(state.devices['Smart Door']);
    document.getElementById('doorSecurityStatus').textContent = locked ? 'Locked' : 'Unlocked';
    const secure = locked;
    document.getElementById('securityStat').textContent = secure ? 'SECURE' : 'CHECK DOOR';
    document.getElementById('securityNote').textContent = secure ? 'No active alerts' : 'Front door is unlocked';
    document.getElementById('securityNote').classList.toggle('good', secure);
    document.getElementById('secureBannerTitle').textContent = secure ? 'HOME SECURE' : 'SECURITY CHECK';
    document.getElementById('secureBannerCopy').textContent = secure ? 'Your home is locked and protected' : 'Front door is unlocked';
    document.getElementById('securePillText').textContent = secure ? 'ALL CLEAR' : 'CHECK ENTRY';
    document.querySelector('.secure-pill .status-dot').style.background = secure ? '' : 'var(--amber)';
    document.getElementById('acStatus').textContent = state.devices['Air Conditioner'] ? 'ON' : 'OFF';
    document.getElementById('acStatus').classList.toggle('good', Boolean(state.devices['Air Conditioner']));
  }

  deviceCards.forEach((card) => {
    updateDeviceCard(card, Number(saved.deviceUpdatedAt?.[card.dataset.device] || 0));
    card.querySelector('.switch').addEventListener('click', () => {
      const name = card.dataset.device;
      state.devices[name] = !state.devices[name];
      const now = Date.now();
      card.dataset.updatedAt = String(now);
      state.deviceUpdatedAt = { ...(state.deviceUpdatedAt || {}), [name]: now };
      updateDeviceCard(card, now);
      refreshDashboard();
      saveState();
      const action = name === 'Smart Door' ? (state.devices[name] ? 'locked' : 'unlocked') : `turned ${state.devices[name] ? 'ON' : 'OFF'}`;
      addNotification(`${name} ${action}`, name === 'Smart Door' ? 'i-lock' : 'i-light');
    });
  });

  // Temperature Control
  function updateTemperature(next) {
    state.temperature = Math.min(30, Math.max(16, next));
    document.getElementById('temperature').textContent = state.temperature;
    document.getElementById('statTemp').textContent = state.temperature;
    const progress = ((state.temperature - 16) / 14) * 100;
    document.querySelector('.temp-dial').style.background = `conic-gradient(var(--cyan) 0 ${progress}%, #203743 ${progress}% 100%)`;
    saveState();
  }
  document.getElementById('tempDown').addEventListener('click', () => updateTemperature(state.temperature - 1));
  document.getElementById('tempUp').addEventListener('click', () => updateTemperature(state.temperature + 1));
  document.getElementById('fanSpeed').addEventListener('input', (event) => {
    state.fanSpeed = Number(event.target.value);
    document.getElementById('fanSpeedValue').textContent = `${state.fanSpeed}%`;
    saveState();
  });

  // Settings
  function applySetting(name, enabled) {
    state.settings[name] = enabled;
    document.querySelector(`[data-setting="${name}"]`).setAttribute('aria-checked', String(enabled));
    if (name === 'darkMode') {
      document.body.classList.toggle('light-mode', !enabled);
      document.querySelector('meta[name="theme-color"]').content = enabled ? '#07111b' : '#edf4f6';
    }
    if (name === 'motion') {
      document.getElementById('motionSecurityStatus').textContent = enabled ? 'Active' : 'Paused';
      document.getElementById('motionSummary').textContent = enabled ? 'ACTIVE · DEMO' : 'PAUSED';
      document.querySelectorAll('.camera-meta span:last-child').forEach((label) => { label.textContent = `Motion Detection ${enabled ? 'ON' : 'OFF'}`; });
      document.getElementById('modalMotion').textContent = `${enabled ? 'ON' : 'OFF'} · simulated`;
    }
    if (name === 'autoSecurity') {
      document.getElementById('securityHeaderStatus').innerHTML = `<span class="status-dot"></span>${enabled ? 'MONITORING' : 'MANUAL MODE'}`;
    }
    saveState();
  }

  document.querySelectorAll('[data-setting]').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.dataset.setting;
      const enabled = button.getAttribute('aria-checked') !== 'true';
      applySetting(name, enabled);
      showToast(`${button.getAttribute('aria-label')} ${enabled ? 'enabled' : 'disabled'}`);
    });
  });

  // Security Camera System
  function closeCameraModal() {
    modal.classList.remove('open');
    window.setTimeout(() => {
      modal.hidden = true;
      if (previousFocus) previousFocus.focus();
    }, 200);
  }

  document.querySelectorAll('.camera-card .view-button').forEach((button) => {
    button.addEventListener('click', () => {
      const card = button.closest('.camera-card');
      previousFocus = button;
      document.getElementById('modalTitle').textContent = card.dataset.camera.toUpperCase();
      document.getElementById('modalLocation').textContent = `${card.dataset.location} · DEMO FEED`;
      document.getElementById('modalFeed').className = `camera-feed modal-feed scene-${card.dataset.scene}`;
      document.getElementById('modalMotion').textContent = `${state.settings.motion ? 'ON' : 'OFF'} · simulated`;
      modal.hidden = false;
      requestAnimationFrame(() => modal.classList.add('open'));
      document.getElementById('closeModal').focus();
    });
  });

  document.getElementById('closeModal').addEventListener('click', closeCameraModal);
  document.getElementById('closeCamera').addEventListener('click', closeCameraModal);
  modal.addEventListener('click', (event) => { if (event.target === modal) closeCameraModal(); });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !modal.hidden) closeCameraModal();
    if (event.key === 'Tab' && !modal.hidden) {
      const focusable = [...modal.querySelectorAll('button:not([disabled])')];
      if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable.at(-1).focus(); }
      else if (!event.shiftKey && document.activeElement === focusable.at(-1)) { event.preventDefault(); focusable[0].focus(); }
    }
  });

  // Responsive Navigation
  const sidebar = document.getElementById('sidebar');
  const menuButton = document.getElementById('menuButton');
  menuButton.addEventListener('click', () => {
    const open = sidebar.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  document.querySelectorAll('.nav-link, .brand').forEach((link) => link.addEventListener('click', () => {
    sidebar.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Open navigation');
  }));
  document.querySelectorAll('.nav-link').forEach((link) => link.addEventListener('click', () => {
    document.querySelectorAll('.nav-link').forEach((item) => item.classList.remove('active'));
    link.classList.add('active');
  }));

  // Simulated Motion Detection
  function simulateMotion() {
    if (!state.settings.motion || Math.random() > 0.38) return;
    const locations = ['Front Door', 'Living Room', 'Backyard', 'Garage'];
    const location = locations[Math.floor(Math.random() * locations.length)];
    addNotification(`Motion detected at ${location} · simulated demo event`, 'i-activity');
  }

  function initialize() {
    document.querySelectorAll('[data-setting]').forEach((button) => {
      button.setAttribute('aria-checked', String(state.settings[button.dataset.setting]));
    });
    document.body.classList.toggle('light-mode', !state.settings.darkMode);
    document.querySelector('meta[name="theme-color"]').content = state.settings.darkMode ? '#07111b' : '#edf4f6';
    document.getElementById('fanSpeed').value = state.fanSpeed;
    document.getElementById('fanSpeedValue').textContent = `${state.fanSpeed}%`;
    state.devices = { ...initialDevices, ...state.devices };
    deviceCards.forEach((card) => updateDeviceCard(card, Number(saved.deviceUpdatedAt?.[card.dataset.device] || 0)));
    updateTemperature(state.temperature);
    applySetting('motion', state.settings.motion);
    applySetting('autoSecurity', state.settings.autoSecurity);
    refreshDashboard();
    renderEnergyChart();
    renderNotifications();
    updateClock();
    saveState();
    window.setInterval(updateClock, 1000);
    window.setInterval(simulateMotion, 9000);
  }

  initialize();
})();
