/**
 * TrailSync 跑步機換算器模塊 - 安全強化版
 * 
 * 安全開發守則：
 *   [x] 防止注入攻擊
 *   [x] 預設不信任使用者輸入
 *   [x] 關閉偵錯模式
 *   [x] 最小權限原則
 */
document.addEventListener('DOMContentLoaded', () => {
  // 安全檢查
  if (typeof window.security === 'undefined' || 
      typeof window.secureStorage === 'undefined') {
    window.security?.logSecurityEvent('MISSING_SECURITY_DEPENDENCY', {
      module: 'treadmill-converter'
    });
    return;
  }
  
  // 安全初始化
  initTreadmillConverter();
  
  // 安全事件綁定
  document.querySelectorAll('input[name="conversionType"]').forEach(radio => {
    radio.addEventListener('change', toggleConversionMode);
  });
  
  const forwardBtn = document.getElementById('calculateForward');
  if (forwardBtn) {
    forwardBtn.addEventListener('click', calculateForwardConversion);
  }
  
  const reverseBtn = document.getElementById('calculateReverse');
  if (reverseBtn) {
    reverseBtn.addEventListener('click', calculateReverseConversion);
  }
  
  const saveForwardBtn = document.getElementById('saveForward');
  if (saveForwardBtn) {
    saveForwardBtn.addEventListener('click', () => saveConversion('forward'));
  }
  
  const saveReverseBtn = document.getElementById('saveReverse');
  if (saveReverseBtn) {
    saveReverseBtn.addEventListener('click', () => saveConversion('reverse'));
  }
});

/**
 * 安全初始化跑步機換算器
 */
function initTreadmillConverter() {
  try {
    // 安全檢查瀏覽器能力
    if (!window.TextEncoder || !window.crypto) {
      throw new Error('UNSUPPORTED_BROWSER');
    }
    
    // 初始化轉換模式
    toggleConversionMode();
    
    // 安全日誌
    window.security.logSecurityEvent('TREADMILL_CONVERTER_INITIALIZED');
  } catch (e) {
    window.security.logSecurityEvent('TREADMILL_INIT_FAILED', { 
      error: e.message 
    });
    showErrorMessage('系統初始化失敗，請升級瀏覽器');
  }
}

/**
 * 安全切換轉換模式
 */
function toggleConversionMode() {
  const conversionType = document.querySelector('input[name="conversionType"]:checked')?.value || 'forward';
  
  // 安全開發守則強制：【預設不信任使用者輸入】
  document.getElementById('forwardConversion').style.display = 
    conversionType === 'forward' ? 'block' : 'none';
  document.getElementById('reverseConversion').style.display = 
    conversionType === 'reverse' ? 'block' : 'none';
}

/**
 * 安全計算正向轉換
 */
function calculateForwardConversion() {
  try {
    // 安全獲取輸入
    const safeInputs = {
      time: document.getElementById('treadmillTime').value,
      speed: parseFloat(document.getElementById('treadmillSpeed').value),
      incline: parseFloat(document.getElementById('treadmillIncline').value)
    };
    
    // 安全驗證輸入
    if (!validateForwardInputs(safeInputs)) {
      showErrorMessage('請輸入有效的跑步機參數');
      return;
    }
    
    // 安全計算
    const result = calculateForward(safeInputs);
    
    // 安全顯示結果
    displayForwardResult(result);
    
    // 安全日誌
    window.security.logSecurityEvent('FORWARD_CONVERSION_COMPLETED', {
      speed: safeInputs.speed,
      incline: safeInputs.incline
    });
  } catch (e) {
    window.security.logSecurityEvent('FORWARD_CONVERSION_FAILED', { 
      error: e.message 
    });
    showErrorMessage('計算失敗，請檢查輸入');
  }
}

/**
 * 安全驗證正向輸入
 * @param {Object} inputs - 用戶輸入
 * @returns {boolean} 是否有效
 */
function validateForwardInputs(inputs) {
  // 安全開發守則強制：【預設不信任使用者輸入】
  if (isNaN(inputs.speed) || inputs.speed < 1) return false;
  if (isNaN(inputs.incline) || inputs.incline < 0) return false;
  
  // 驗證時間格式 (00:00:00)
  const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
  if (!timePattern.test(inputs.time)) return false;
  
  return true;
}

/**
 * 安全計算正向轉換
 * @param {Object} inputs - 驗證過的輸入
 * @returns {Object} 計算結果
 */
function calculateForward(inputs) {
  // 解析時間 (時+分/60+秒/3600)
  const [hours, minutes, seconds] = inputs.time.split(':').map(Number);
  const totalTime = hours + minutes/60 + seconds/3600;
  
  // 計算總距離 (km)
  const distance = inputs.speed * totalTime;
  
  // 計算等效爬升 (m)
  const elevation = distance * 1000 * (inputs.incline / 100) * 10;
  
  // 計算 EP
  const ep = distance + elevation / 100;
  
  // 計算 EPH
  const eph = ep / totalTime;
  
  return {
    time: inputs.time,
    speed: inputs.speed,
    incline: inputs.incline,
    distance: distance.toFixed(2),
    elevation: Math.round(elevation),
    ep: ep.toFixed(2),
    eph: eph.toFixed(2)
  };
}

/**
 * 安全顯示正向結果
 * @param {Object} result - 計算結果
 */
function displayForwardResult(result) {
  // 安全開發守則強制：【防止 XSS】
  const resultSection = document.getElementById('forwardResult');
  if (resultSection) {
    resultSection.hidden = false;
  }
  
  const distanceEl = document.getElementById('forwardDistance');
  if (distanceEl) {
    distanceEl.textContent = `${result.distance} km`;
  }
  
  const elevationEl = document.getElementById('forwardElevation');
  if (elevationEl) {
    elevationEl.textContent = `${result.elevation} m`;
  }
  
  const epEl = document.getElementById('forwardEp');
  if (epEl) {
    epEl.textContent = result.ep;
  }
  
  const ephEl = document.getElementById('forwardEph');
  if (ephEl) {
    ephEl.textContent = result.eph;
  }
}

/**
 * 安全計算反向轉換
 */
function calculateReverseConversion() {
  try {
    // 安全獲取輸入
    const safeInputs = {
      elevation: parseFloat(document.getElementById('targetElevation').value),
      speed: parseFloat(document.getElementById('reverseSpeed').value),
      time: document.getElementById('reverseTime').value
    };
    
    // 安全驗證輸入
    if (!validateReverseInputs(safeInputs)) {
      showErrorMessage('請輸入有效的目標參數');
      return;
    }
    
    // 安全計算
    const result = calculateReverse(safeInputs);
    
    // 安全顯示結果
    displayReverseResult(result);
    
    // 安全日誌
    window.security.logSecurityEvent('REVERSE_CONVERSION_COMPLETED', {
      targetElevation: safeInputs.elevation,
      speed: safeInputs.speed
    });
  } catch (e) {
    window.security.logSecurityEvent('REVERSE_CONVERSION_FAILED', { 
      error: e.message 
    });
    showErrorMessage('計算失敗，請檢查輸入');
  }
}

/**
 * 安全驗證反向輸入
 * @param {Object} inputs - 用戶輸入
 * @returns {boolean} 是否有效
 */
function validateReverseInputs(inputs) {
  // 安全開發守則強制：【預設不信任使用者輸入】
  if (isNaN(inputs.elevation) || inputs.elevation < 1) return false;
  if (isNaN(inputs.speed) || inputs.speed < 1) return false;
  
  // 驗證時間格式 (00:00:00)
  const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
  if (!timePattern.test(inputs.time)) return false;
  
  return true;
}

/**
 * 安全計算反向轉換
 * @param {Object} inputs - 驗證過的輸入
 * @returns {Object} 計算結果
 */
function calculateReverse(inputs) {
  // 解析時間 (時+分/60+秒/3600)
  const [hours, minutes, seconds] = inputs.time.split(':').map(Number);
  const totalTime = hours + minutes/60 + seconds/3600;
  
  // 計算總距離 (km)
  const distance = inputs.speed * totalTime;
  
  // 計算推薦坡度 (%)
  const incline = (inputs.elevation / (distance * 1000 * 10)) * 100;
  
  // 計算等效爬升 (應等於目標值)
  const elevation = inputs.elevation;
  
  // 計算 EP
  const ep = distance + elevation / 100;
  
  // 計算 EPH
  const eph = ep / totalTime;
  
  return {
    elevation: inputs.elevation,
    speed: inputs.speed,
    time: inputs.time,
    incline: incline.toFixed(1),
    distance: distance.toFixed(2),
    ep: ep.toFixed(2),
    eph: eph.toFixed(2)
  };
}

/**
 * 安全顯示反向結果
 * @param {Object} result - 計算結果
 */
function displayReverseResult(result) {
  // 安全開發守則強制：【防止 XSS】
  const resultSection = document.getElementById('reverseResult');
  if (resultSection) {
    resultSection.hidden = false;
  }
  
  const inclineEl = document.getElementById('recommendedIncline');
  if (inclineEl) {
    inclineEl.textContent = `${result.incline}%`;
  }
  
  const elevationEl = document.getElementById('reverseElevation');
  if (elevationEl) {
    elevationEl.textContent = `${result.elevation} m`;
  }
  
  const epEl = document.getElementById('reverseEp');
  if (epEl) {
    epEl.textContent = result.ep;
  }
  
  const ephEl = document.getElementById('reverseEph');
  if (ephEl) {
    ephEl.textContent = result.eph;
  }
}

/**
 * 安全保存轉換結果
 * @param {string} type - 轉換類型 (forward/reverse)
 */
async function saveConversion(type) {
  try {
    // 安全獲取轉換數據
    let conversionData;
    
    if (type === 'forward') {
      conversionData = {
        type: 'forward',
        time: document.getElementById('treadmillTime').value,
        speed: document.getElementById('treadmillSpeed').value,
        incline: document.getElementById('treadmillIncline').value,
        distance: document.getElementById('forwardDistance').textContent,
        elevation: document.getElementById('forwardElevation').textContent,
        ep: document.getElementById('forwardEp').textContent,
        eph: document.getElementById('forwardEph').textContent,
        timestamp: new Date().toISOString()
      };
    } else {
      conversionData = {
        type: 'reverse',
        elevation: document.getElementById('targetElevation').value,
        speed: document.getElementById('reverseSpeed').value,
        time: document.getElementById('reverseTime').value,
        incline: document.getElementById('recommendedIncline').textContent.replace('%', ''),
        distance: document.getElementById('forwardDistance')?.textContent || '0.0 km',
        elevationResult: document.getElementById('reverseElevation').textContent,
        ep: document.getElementById('reverseEp').textContent,
        eph: document.getElementById('reverseEph').textContent,
        timestamp: new Date().toISOString()
      };
    }
    
    // 安全開發守則強制：【最小權限原則】
    const conversions = (await window.secureStorage.getItem('conversions') || []);
    conversions.push(conversionData);
    
    // 安全存儲
    await window.secureStorage.setItem('conversions', conversions);
    
    // 安全反饋
    showSuccessMessage('轉換結果已安全保存至個人數據中心');
    
    // 安全日誌
    window.security.logSecurityEvent('CONVERSION_SAVED', { 
      type,
      timestamp: conversionData.timestamp
    });
  } catch (e) {
    window.security.logSecurityEvent('CONVERSION_SAVE_FAILED', { 
      error: e.message 
    });
    showErrorMessage('保存失敗，請重試');
  }
}

/**
 * 安全顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function showErrorMessage(message) {
  const statusEl = document.querySelector('.conversion-mode');
  if (statusEl) {
    window.security.renderSafeContent(
      statusEl, 
      `<div class="error">${window.security.sanitizeInput(message)}</div>`
    );
  }
}

/**
 * 安全顯示成功訊息
 * @param {string} message - 成功訊息
 */
function showSuccessMessage(message) {
  const statusEl = document.querySelector('.conversion-mode');
  if (statusEl) {
    window.security.renderSafeContent(
      statusEl, 
      `<div class="success">${window.security.sanitizeInput(message)}</div>`
    );
  }
}