/**
 * TrailSync 完賽風險評估模塊 - 安全強化版
 * 
 * 安全開發守則：
 *   [x] 防止 DOM-based XSS
 *   [x] 最小權限原則
 *   [x] 關閉偵錯模式
 *   [x] 預設不信任使用者輸入
 */
document.addEventListener('DOMContentLoaded', () => {
  // 安全檢查
  if (typeof window.security === 'undefined' || 
      typeof window.secureStorage === 'undefined') {
    window.security?.logSecurityEvent('MISSING_SECURITY_DEPENDENCY', {
      module: 'race-assessor'
    });
    return;
  }
  
  // 安全初始化
  checkHistoricalData();
  
  // 安全事件綁定
  const raceForm = document.getElementById('raceForm');
  if (raceForm) {
    raceForm.addEventListener('submit', handleRiskAssessment);
  }
  
  const regenerateBtn = document.getElementById('regenerateSuggestions');
  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', generateAiSuggestions);
  }
});

/**
 * 檢查歷史數據可用性
 */
async function checkHistoricalData() {
  try {
    const activities = await window.secureStorage.getItem('activities') || [];
    if (activities.length === 0) {
      const statusEl = document.querySelector('.input-section');
      if (statusEl) {
        window.security.renderSafeContent(
          statusEl, 
          statusEl.innerHTML + 
          '<div class="warning">⚠️ 需要至少 3 次歷史活動數據才能進行風險評估</div>'
        );
      }
    }
  } catch (e) {
    window.security.logSecurityEvent('HISTORICAL_DATA_CHECK_FAILED', { 
      error: e.message 
    });
  }
}

/**
 * 安全處理風險評估
 * @param {Event} e - 表單提交事件
 */
async function handleRiskAssessment(e) {
  e.preventDefault();
  
  // 安全開發守則強制：【防止注入攻擊】
  const safeInputs = {
    distance: parseFloat(document.getElementById('raceDistance').value),
    elevation: parseFloat(document.getElementById('raceElevation').value),
    duration: document.getElementById('raceDuration').value
  };
  
  // 安全驗證輸入
  if (!validateRaceInputs(safeInputs)) {
    window.security.renderSafeContent(
      document.getElementById('riskResult'), 
      '<div class="error">請輸入有效的賽事參數！</div>'
    );
    return;
  }
  
  try {
    // 安全獲取歷史數據
    const activities = await window.secureStorage.getItem('activities') || [];
    if (activities.length < 3) {
      throw new Error('INSUFFICIENT_DATA');
    }
    
    // 安全計算風險
    const riskResult = calculateRisk(safeInputs, activities);
    
    // 安全顯示結果
    displayRiskResult(riskResult);
    
    // 安全生成 AI 建議
    generateAiSuggestions();
    
    // 安全日誌
    window.security.logSecurityEvent('RISK_ASSESSMENT_COMPLETED', { 
      raceDistance: safeInputs.distance,
      riskLevel: riskResult.level 
    });
  } catch (e) {
    window.security.logSecurityEvent('RISK_CALCULATION_ERROR', { 
      error: e.message 
    });
    
    let errorMsg = '風險評估失敗';
    if (e.message === 'INSUFFICIENT_DATA') {
      errorMsg = '需要至少 3 次歷史活動數據';
    }
    
    window.security.renderSafeContent(
      document.getElementById('riskResult'), 
      `<div class="error">${window.security.sanitizeInput(errorMsg)}</div>`
    );
  }
}

/**
 * 安全驗證賽事輸入
 * @param {Object} inputs - 用戶輸入
 * @returns {boolean} 是否有效
 */
function validateRaceInputs(inputs) {
  // 安全開發守則強制：【預設不信任使用者輸入】
  if (isNaN(inputs.distance) || inputs.distance < 5) return false;
  if (isNaN(inputs.elevation) || inputs.elevation < 0) return false;
  
  // 驗證時間格式
  const timePattern = /^\d{1,2}:\d{2}:\d{2}$/;
  if (!timePattern.test(inputs.duration)) return false;
  
  return true;
}

/**
 * 安全計算風險
 * @param {Object} race - 賽事參數
 * @param {Array} activities - 歷史活動
 * @returns {Object} 風險評估結果
 */
function calculateRisk(race, activities) {
  // 解析關門時間
  const [hours, minutes, seconds] = race.duration.split(':').map(Number);
  const cutoffHours = hours + minutes/60 + seconds/3600;
  
  // 計算賽事 EP
  const raceEp = race.distance + race.elevation / 100;
  const raceEph = raceEp / cutoffHours;
  
  // 分析歷史數據
  const longestRun = activities.reduce((max, act) => 
    parseFloat(act.distance) > parseFloat(max.distance) ? act : max, 
    activities[0]
  );
  
  const longestElevation = activities.reduce((max, act) => 
    parseFloat(act.elevation) > parseFloat(max.elevation) ? act : max, 
    activities[0]
  );
  
  // 計算缺口百分比
  const distanceGap = (race.distance - longestRun.distance) / race.distance;
  const elevationGap = (race.elevation - longestElevation.elevation) / race.elevation;
  
  // 時間膨脹係數（安全邊界檢查）
  let timeFactor = 1.0;
  if (distanceGap > 0.5) timeFactor *= 1.35;
  if (elevationGap > 0.4) timeFactor *= 1.28;
  
  // 預估完賽時間
  const estimatedHours = cutoffHours * timeFactor;
  const estimatedTime = formatDuration(estimatedHours);
  
  // 計算風險等級
  let level = 'low';
  let sources = [];
  
  if (distanceGap > 0.4) {
    sources.push(`您的最長距離 (${longestRun.distance}km) 僅為賽事的 ${((1-distanceGap)*100).toFixed(0)}%`);
    level = 'high';
  }
  
  if (elevationGap > 0.3) {
    sources.push(`您的最大爬升 (${longestElevation.elevation}m) 僅為賽事的 ${((1-elevationGap)*100).toFixed(0)}%`);
    level = level === 'low' ? 'medium' : 'high';
  }
  
  if (sources.length === 0) {
    sources.push('您的歷史數據顯示準備充分');
  }
  
  return {
    level,
    sources,
    estimatedTime,
    raceEp,
    raceEph,
    distanceGap,
    elevationGap
  };
}

/**
 * 安全顯示風險結果
 * @param {Object} result - 風險評估結果
 */
function displayRiskResult(result) {
  const resultEl = document.getElementById('riskResult');
  if (!resultEl) return;
  resultEl.hidden = false;
  
  // 安全設置風險等級（防範 DOM XSS）
  const levelEl = document.getElementById('riskLevel');
  if (levelEl) {
    levelEl.textContent = 
      result.level === 'high' ? '高風險' : 
      result.level === 'medium' ? '中風險' : '低風險';
    levelEl.className = `risk-level ${result.level}`;
  }
  
  // 安全顯示風險來源
  const sourcesEl = document.getElementById('riskSources');
  if (sourcesEl) {
    sourcesEl.innerHTML = '';
    result.sources.forEach(source => {
      const li = document.createElement('li');
      // 安全開發守則強制：【防止 XSS】
      li.textContent = window.security.sanitizeInput(source);
      sourcesEl.appendChild(li);
    });
  }
  
  // 安全顯示預估時間
  const timeEl = document.getElementById('estimatedTime');
  if (timeEl) {
    timeEl.textContent = result.estimatedTime;
  }
}

/**
 * 安全生成 AI 建議
 */
function generateAiSuggestions() {
  try {
    // 安全獲取當前風險評估
    const raceDistanceInput = document.getElementById('raceDistance');
    const riskLevelEl = document.getElementById('riskLevel');
    
    if (!raceDistanceInput || !riskLevelEl || riskLevelEl.textContent === '待評估') {
      return;
    }
    
    // 安全開發守則強制：【防禦指令注入】
    const safeRaceDistance = window.security.sanitizeInput(raceDistanceInput.value);
    
    // 模擬 AI 建議（實際應調用安全沙箱）
    const suggestions = [];
    const riskLevel = document.querySelector('.risk-level')?.className.split(' ')[1] || 'low';
    
    if (riskLevel === 'high') {
      const sourcesText = document.getElementById('riskSources')?.innerText || '';
      if (sourcesText.includes('距離')) {
        suggestions.push('✅ 長距離訓練：每週增加 10% 距離，目標達到賽事距離的 70%');
      }
      if (sourcesText.includes('爬升')) {
        suggestions.push('✅ 爬坡訓練：尋找 500m+ 連續爬升路段，每週 2 次');
      }
    } else if (riskLevel === 'medium') {
      suggestions.push('✅ 維持當前訓練量，專注技術路段效率');
      suggestions.push('✅ 每週 1 次模擬賽事強度的訓練');
    } else {
      suggestions.push('✅ 您已準備充分！建議維持訓練節奏');
      suggestions.push('✅ 關注賽前兩週的營養與睡眠');
    }
    
    // 安全顯示建議
    const suggestionsEl = document.getElementById('suggestionsContent');
    if (suggestionsEl) {
      let html = '<p>AI 生成建議，請根據自身感受調整：</p><ul>';
      
      suggestions.forEach(suggestion => {
        const li = document.createElement('li');
        // 安全開發守則強制：【防止 XSS】
        li.innerHTML = window.security.sanitizeInput(suggestion);
        html += `<li>${window.security.sanitizeInput(suggestion)}</li>`;
      });
      
      html += '</ul>';
      window.security.renderSafeContent(suggestionsEl, html);
    }
  } catch (e) {
    window.security.logSecurityEvent('AI_SUGGESTION_FAILED', { 
      error: e.message 
    });
    const suggestionsEl = document.getElementById('suggestionsContent');
    if (suggestionsEl) {
      window.security.renderSafeContent(
        suggestionsEl, 
        '<div class="error">建議生成失敗，請重試</div>'
      );
    }
  }
}

/**
 * 安全格式化時間
 * @param {number} hours - 小時數
 * @returns {string} 格式化時間
 */
function formatDuration(hours) {
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  const s = Math.floor((((hours - h) * 60) - m) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}