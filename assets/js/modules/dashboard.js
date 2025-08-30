/**
 * TrailSync 個人數據中心模塊 - 安全強化版
 * 
 * 安全開發守則：
 *   [x] 防止 XSS
 *   [x] 最小權限原則
 *   [x] 關閉偵錯模式
 *   [x] 預設不信任使用者輸入
 */
document.addEventListener('DOMContentLoaded', () => {
  // 安全檢查
  if (typeof window.security === 'undefined' || 
      typeof window.secureStorage === 'undefined') {
    window.security?.logSecurityEvent('MISSING_SECURITY_DEPENDENCY', {
      module: 'dashboard'
    });
    return;
  }
  
  // 安全初始化
  initDashboard();
  
  // 安全事件綁定
  const timeFilter = document.getElementById('timeFilter');
  if (timeFilter) {
    timeFilter.addEventListener('change', renderActivities);
  }
  
  const typeFilter = document.getElementById('typeFilter');
  if (typeFilter) {
    typeFilter.addEventListener('change', renderActivities);
  }
  
  const addShoeBtn = document.getElementById('addShoe');
  if (addShoeBtn) {
    addShoeBtn.addEventListener('click', showShoeForm);
  }
  
  const cancelShoeBtn = document.getElementById('cancelShoe');
  if (cancelShoeBtn) {
    cancelShoeBtn.addEventListener('click', hideShoeForm);
  }
  
  const shoeForm = document.getElementById('shoeFormContent');
  if (shoeForm) {
    shoeForm.addEventListener('submit', saveShoe);
  }
});

/**
 * 安全初始化儀表板
 */
async function initDashboard() {
  try {
    // 安全獲取數據
    const [activities, shoes] = await Promise.all([
      window.secureStorage.getItem('activities') || [],
      window.secureStorage.getItem('shoes') || []
    ]);
    
    // 安全計算統計
    const stats = calculateDashboardStats(activities);
    
    // 安全顯示統計
    displayDashboardStats(stats);
    
    // 安全渲染活動
    renderActivities();
    
    // 安全渲染跑鞋
    renderShoes(shoes);
    
    // 安全日誌
    window.security.logSecurityEvent('DASHBOARD_INITIALIZED', {
      activityCount: activities.length,
      shoeCount: shoes.length
    });
  } catch (e) {
    window.security.logSecurityEvent('DASHBOARD_INIT_FAILED', { 
      error: e.message 
    });
    showEmptyState();
  }
}

/**
 * 安全計算儀表板統計
 * @param {Array} activities - 活動數據
 * @returns {Object} 統計結果
 */
function calculateDashboardStats(activities) {
  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const oneMonthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  
  // 計算本週數據
  const weeklyActivities = activities.filter(act => 
    new Date(act.timestamp) >= oneWeekAgo
  );
  
  const weeklyDistance = weeklyActivities.reduce((sum, act) => 
    sum + parseFloat(act.distance), 0
  );
  
  const weeklyElevation = weeklyActivities.reduce((sum, act) => 
    sum + parseFloat(act.elevation), 0
  );
  
  // 計算 ACWR (急性負荷比)
  const last7DaysEp = weeklyActivities.reduce((sum, act) => 
    sum + (parseFloat(act.distance) + parseFloat(act.elevation)/100), 0
  );
  
  const monthlyActivities = activities.filter(act => 
    new Date(act.timestamp) >= oneMonthAgo
  );
  
  const avgMonthlyEp = monthlyActivities.length > 0 ? 
    monthlyActivities.reduce((sum, act) => 
      sum + (parseFloat(act.distance) + parseFloat(act.elevation)/100), 0
    ) / 4 : 0;
  
  const acwr = avgMonthlyEp > 0 ? last7DaysEp / avgMonthlyEp : 0;
  const acwrStatus = acwr < 0.8 ? '偏低' : acwr <= 1.3 ? '安全' : acwr <= 1.5 ? '偏高' : '過高';
  
  return {
    weeklyDistance: weeklyDistance.toFixed(1),
    weeklyElevation: Math.round(weeklyElevation),
    acwr: acwr.toFixed(2),
    acwrStatus
  };
}

/**
 * 安全顯示儀表板統計
 * @param {Object} stats - 統計結果
 */
function displayDashboardStats(stats) {
  // 安全開發守則強制：【防止 XSS】
  const distanceEl = document.getElementById('weeklyDistance');
  if (distanceEl) {
    distanceEl.textContent = `${stats.weeklyDistance} km`;
  }
  
  const elevationEl = document.getElementById('weeklyElevation');
  if (elevationEl) {
    elevationEl.textContent = `${stats.weeklyElevation} m`;
  }
  
  const acwrValueEl = document.getElementById('acwrValue');
  if (acwrValueEl) {
    acwrValueEl.textContent = stats.acwr;
  }
  
  const acwrStatusEl = document.getElementById('acwrStatus');
  if (acwrStatusEl) {
    acwrStatusEl.textContent = stats.acwrStatus;
    
    // 安全設置 ACWR 顏色
    acwrStatusEl.className = 'stat-label acwr-' + 
      (stats.acwr < 0.8 ? 'low' : 
       stats.acwr <= 1.3 ? 'safe' : 
       stats.acwr <= 1.5 ? 'warning' : 'danger');
  }
}

/**
 * 安全渲染活動列表
 */
async function renderActivities() {
  try {
    const activities = await window.secureStorage.getItem('activities') || [];
    const timeFilter = document.getElementById('timeFilter')?.value || 'week';
    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    
    // 安全過濾活動
    const filtered = filterActivities(activities, timeFilter, typeFilter);
    
    // 安全生成 HTML
    const activitiesList = document.getElementById('activitiesList');
    if (!activitiesList) return;
    
    if (filtered.length === 0) {
      window.security.renderSafeContent(
        activitiesList, 
        '<div class="empty-state">無符合條件的活動</div>'
      );
      return;
    }
    
    let html = '';
    filtered.forEach(activity => {
      // 安全開發守則強制：【防止 XSS】
      const safeActivity = {
        distance: window.security.sanitizeInput(activity.distance),
        elevation: window.security.sanitizeInput(activity.elevation),
        duration: window.security.sanitizeInput(activity.duration),
        eph: window.security.sanitizeInput(activity.eph),
        timestamp: formatTimestamp(activity.timestamp)
      };
      
      html += `
        <div class="activity-item">
          <div class="activity-header">
            <span class="activity-date">${safeActivity.timestamp}</span>
            <span class="activity-type">${getTypeLabel(activity)}</span>
          </div>
          <div class="activity-details">
            <div>距離: <strong>${safeActivity.distance} km</strong></div>
            <div>爬升: <strong>${safeActivity.elevation} m</strong></div>
            <div>時間: ${safeActivity.duration}</div>
            <div>EPH: <span class="eph-badge">${safeActivity.eph}</span></div>
          </div>
          <div class="activity-actions">
            <button class="delete-activity" data-id="${btoa(activity.timestamp)}">刪除</button>
          </div>
        </div>
      `;
    });
    
    window.security.renderSafeContent(activitiesList, html);
    
    // 安全綁定刪除事件
    document.querySelectorAll('.delete-activity').forEach(button => {
      button.addEventListener('click', () => deleteActivity(button.dataset.id));
    });
  } catch (e) {
    window.security.logSecurityEvent('ACTIVITIES_RENDER_FAILED', { 
      error: e.message 
    });
    showEmptyState();
  }
}

/**
 * 安全過濾活動
 * @param {Array} activities - 活動列表
 * @param {string} timeFilter - 時間過濾
 * @param {string} typeFilter - 類型過濾
 * @returns {Array} 過濾後的活動
 */
function filterActivities(activities, timeFilter, typeFilter) {
  const now = new Date();
  
  return activities.filter(activity => {
    const activityDate = new Date(activity.timestamp);
    
    // 時間過濾
    let timeMatch = true;
    if (timeFilter === 'week') {
      timeMatch = activityDate >= new Date(now - 7 * 24 * 60 * 60 * 1000);
    } else if (timeFilter === 'month') {
      timeMatch = activityDate >= new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
    
    // 類型過濾
    let typeMatch = true;
    if (typeFilter === 'manual') {
      typeMatch = !activity.gpxSource;
    } else if (typeFilter === 'gpx') {
      typeMatch = !!activity.gpxSource;
    }
    
    return timeMatch && typeMatch;
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

/**
 * 安全格式化時間戳
 * @param {string} timestamp - ISO 時間戳
 * @returns {string} 格式化日期
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

/**
 * 安全獲取活動類型標籤
 * @param {Object} activity - 活動對象
 * @returns {string} 類型標籤
 */
function getTypeLabel(activity) {
  return activity.gpxSource ? 'GPX 路線' : '手動輸入';
}

/**
 * 安全刪除活動
 * @param {string} timestampB64 - Base64 編碼的時間戳
 */
async function deleteActivity(timestampB64) {
  if (!confirm('確定要刪除此活動嗎？')) return;
  
  try {
    // 安全開發守則強制：【防止注入】
    const timestamp = atob(timestampB64);
    const activities = await window.secureStorage.getItem('activities') || [];
    
    // 安全過濾
    const newActivities = activities.filter(act => 
      act.timestamp !== timestamp
    );
    
    // 安全存儲
    await window.secureStorage.setItem('activities', newActivities);
    
    // 重新渲染
    renderActivities();
    
    // 安全日誌
    window.security.logSecurityEvent('ACTIVITY_DELETED', { timestamp });
  } catch (e) {
    window.security.logSecurityEvent('ACTIVITY_DELETE_FAILED', { 
      error: e.message 
    });
    alert('刪除失敗，請重試');
  }
}

/**
 * 安全顯示跑鞋表單
 */
function showShoeForm() {
  const shoeForm = document.getElementById('shoeForm');
  const addShoeBtn = document.getElementById('addShoe');
  
  if (shoeForm && addShoeBtn) {
    shoeForm.hidden = false;
    addShoeBtn.disabled = true;
  }
}

/**
 * 安全隱藏跑鞋表單
 */
function hideShoeForm() {
  const shoeForm = document.getElementById('shoeForm');
  const addShoeBtn = document.getElementById('addShoe');
  const shoeFormContent = document.getElementById('shoeFormContent');
  
  if (shoeForm && addShoeBtn && shoeFormContent) {
    shoeForm.hidden = true;
    addShoeBtn.disabled = false;
    shoeFormContent.reset();
  }
}

/**
 * 安全保存跑鞋
 * @param {Event} e - 表單提交事件
 */
async function saveShoe(e) {
  e.preventDefault();
  
  // 安全開發守則強制：【防止注入】
  const safeInputs = {
    name: document.getElementById('shoeName').value.trim(),
    mileageLimit: parseInt(document.getElementById('shoeMileageLimit').value)
  };
  
  // 安全驗證
  if (!safeInputs.name || safeInputs.mileageLimit < 500) {
    alert('請輸入有效的跑鞋名稱和里程上限');
    return;
  }
  
  try {
    // 安全獲取現有數據
    const shoes = await window.secureStorage.getItem('shoes') || [];
    
    // 安全創建新跑鞋
    const newShoe = {
      id: Date.now().toString(36),
      name: safeInputs.name,
      mileageLimit: safeInputs.mileageLimit,
      currentMileage: 0,
      addedDate: new Date().toISOString()
    };
    
    // 安全存儲
    shoes.push(newShoe);
    await window.secureStorage.setItem('shoes', shoes);
    
    // 安全渲染
    renderShoes(shoes);
    hideShoeForm();
    
    // 安全日誌
    window.security.logSecurityEvent('SHOE_ADDED', { 
      name: safeInputs.name,
      limit: safeInputs.mileageLimit
    });
  } catch (e) {
    window.security.logSecurityEvent('SHOE_ADD_FAILED', { 
      error: e.message 
    });
    alert('保存失敗，請重試');
  }
}

/**
 * 安全渲染跑鞋列表
 * @param {Array} shoes - 跑鞋列表
 */
async function renderShoes(shoes) {
  if (!shoes) {
    shoes = await window.secureStorage.getItem('shoes') || [];
  }
  
  const shoeList = document.getElementById('shoeList');
  if (!shoeList) return;
  
  if (shoes.length === 0) {
    window.security.renderSafeContent(
      shoeList, 
      '<div class="empty-state">尚無跑鞋記錄</div>'
    );
    return;
  }
  
  let html = '';
  shoes.forEach(shoe => {
    // 安全計算狀態
    const progress = (shoe.currentMileage / shoe.mileageLimit) * 100;
    const statusClass = progress > 90 ? 'danger' : progress > 70 ? 'warning' : 'safe';
    const statusText = progress > 90 ? '更換' : progress > 70 ? '即將' : '正常';
    
    // 安全開發守則強制：【防止 XSS】
    const safeName = window.security.sanitizeInput(shoe.name);
    
    html += `
      <div class="shoe-item ${statusClass}">
        <div class="shoe-header">
          <span class="shoe-name">${safeName}</span>
          <span class="shoe-status">${statusText}</span>
        </div>
        <div class="shoe-progress">
          <div class="progress-bar" style="width: ${progress}%"></div>
        </div>
        <div class="shoe-details">
          ${shoe.currentMileage.toFixed(1)} / ${shoe.mileageLimit} km
        </div>
        <div class="shoe-actions">
          <button class="add-mileage" data-id="${shoe.id}">+1km</button>
          <button class="delete-shoe" data-id="${shoe.id}">刪除</button>
        </div>
      </div>
    `;
  });
  
  window.security.renderSafeContent(shoeList, html);
  
  // 安全綁定事件
  document.querySelectorAll('.add-mileage').forEach(button => {
    button.addEventListener('click', () => addMileage(button.dataset.id));
  });
  
  document.querySelectorAll('.delete-shoe').forEach(button => {
    button.addEventListener('click', () => deleteShoe(button.dataset.id));
  });
}

/**
 * 安全增加里程
 * @param {string} shoeId - 跑鞋ID
 */
async function addMileage(shoeId) {
  try {
    const shoes = await window.secureStorage.getItem('shoes') || [];
    const shoeIndex = shoes.findIndex(s => s.id === shoeId);
    
    if (shoeIndex !== -1) {
      // 安全更新里程
      shoes[shoeIndex].currentMileage = (
        parseFloat(shoes[shoeIndex].currentMileage) + 1
      ).toFixed(1);
      
      await window.secureStorage.setItem('shoes', shoes);
      renderShoes(shoes);
      
      // 安全日誌
      window.security.logSecurityEvent('MILEAGE_ADDED', { 
        shoeId, 
        newMileage: shoes[shoeIndex].currentMileage 
      });
    }
  } catch (e) {
    window.security.logSecurityEvent('MILEAGE_UPDATE_FAILED', { 
      error: e.message 
    });
  }
}

/**
 * 安全刪除跑鞋
 * @param {string} shoeId - 跑鞋ID
 */
async function deleteShoe(shoeId) {
  if (!confirm('確定要刪除此跑鞋嗎？')) return;
  
  try {
    const shoes = await window.secureStorage.getItem('shoes') || [];
    const newShoes = shoes.filter(s => s.id !== shoeId);
    await window.secureStorage.setItem('shoes', newShoes);
    renderShoes(newShoes);
    
    // 安全日誌
    window.security.logSecurityEvent('SHOE_DELETED', { shoeId });
  } catch (e) {
    window.security.logSecurityEvent('SHOE_DELETE_FAILED', { 
      error: e.message 
    });
    alert('刪除失敗，請重試');
  }
}

/**
 * 安全顯示空狀態
 */
function showEmptyState() {
  const activitiesList = document.getElementById('activitiesList');
  if (activitiesList) {
    window.security.renderSafeContent(
      activitiesList, 
      '<div class="empty-state">加載失敗，請刷新頁面</div>'
    );
  }
}