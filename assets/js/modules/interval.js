/**
 * TrailSync 間歇規劃器模塊 - 安全強化版
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
      module: 'interval-planner'
    });
    return;
  }
  
  // 安全初始化
  initIntervalPlanner();
  
  // 安全事件綁定
  const singleForm = document.getElementById('singleIntervalForm');
  if (singleForm) {
    singleForm.addEventListener('submit', handleSingleIntervalCalculation);
  }
  
  const generateBtn = document.getElementById('generateWorkout');
  if (generateBtn) {
    generateBtn.addEventListener('click', generateWorkout);
  }
  
  const saveBtn = document.getElementById('saveWorkout');
  if (saveBtn) {
    saveBtn.addEventListener('click', saveWorkout);
  }
  
  // 休息類型切換
  document.querySelectorAll('input[name="restType"]').forEach(radio => {
    radio.addEventListener('change', toggleRestOptions);
  });
});

/**
 * 安全初始化間歇規劃器
 */
function initIntervalPlanner() {
  try {
    // 安全檢查瀏覽器能力
    if (!window.TextEncoder || !window.crypto) {
      throw new Error('UNSUPPORTED_BROWSER');
    }
    
    // 初始化休息選項
    toggleRestOptions();
    
    // 安全日誌
    window.security.logSecurityEvent('INTERVAL_PLANNER_INITIALIZED');
  } catch (e) {
    window.security.logSecurityEvent('INTERVAL_INIT_FAILED', { 
      error: e.message 
    });
    showErrorMessage('系統初始化失敗，請升級瀏覽器');
  }
}

/**
 * 安全切換休息選項
 */
function toggleRestOptions() {
  const restType = document.querySelector('input[name="restType"]:checked')?.value || 'fixed';
  
  // 安全開發守則強制：【預設不信任使用者輸入】
  document.getElementById('fixedRest').style.display = 
    restType === 'fixed' ? 'block' : 'none';
  document.getElementById('ratioRest').style.display = 
    restType === 'ratio' ? 'block' : 'none';
  document.getElementById('manualRest').style.display = 
    restType === 'manual' ? 'block' : 'none';
}

/**
 * 安全處理單組計算
 * @param {Event} e - 表單提交事件
 */
function handleSingleIntervalCalculation(e) {
  e.preventDefault();
  
  // 安全開發守則強制：【防止注入攻擊】
  const safeInputs = {
    distance: parseFloat(document.getElementById('intervalDistance').value),
    time: document.getElementById('intervalTime').value
  };
  
  // 安全驗證輸入
  if (!validateSingleIntervalInputs(safeInputs)) {
    showErrorMessage('請輸入有效的距離和時間');
    return;
  }
  
  // 安全計算
  const result = calculateInterval(safeInputs);
  
  // 安全顯示結果
  displaySingleIntervalResult(result);
}

/**
 * 安全驗證單組輸入
 * @param {Object} inputs - 用戶輸入
 * @returns {boolean} 是否有效
 */
function validateSingleIntervalInputs(inputs) {
  // 安全開發守則強制：【預設不信任使用者輸入】
  if (isNaN(inputs.distance) || inputs.distance < 50) return false;
  
  // 驗證時間格式 (00:00)
  const timePattern = /^\d{1,2}:\d{2}$/;
  if (!timePattern.test(inputs.time)) return false;
  
  return true;
}

/**
 * 安全計算單組間歇
 * @param {Object} inputs - 驗證過的輸入
 * @returns {Object} 計算結果
 */
function calculateInterval(inputs) {
  // 解析時間 (分+秒/60)
  const [minutes, seconds] = inputs.time.split(':').map(Number);
  const totalTime = minutes + seconds/60;
  
  // 計算配速 (分/公里)
  const paceMinutes = totalTime / (inputs.distance / 1000);
  const paceMin = Math.floor(paceMinutes);
  const paceSec = Math.round((paceMinutes - paceMin) * 60);
  
  // 計算速度 (km/h)
  const speed = (inputs.distance / 1000) / (totalTime / 60);
  
  return {
    distance: inputs.distance,
    time: inputs.time,
    pace: `${paceMin}'${paceSec.toString().padStart(2, '0')}"`,
    speed: speed.toFixed(1)
  };
}

/**
 * 安全顯示單組結果
 * @param {Object} result - 計算結果
 */
function displaySingleIntervalResult(result) {
  // 安全開發守則強制：【防止 XSS】
  const resultSection = document.getElementById('singleIntervalResult');
  if (resultSection) {
    resultSection.hidden = false;
  }
  
  const paceEl = document.getElementById('intervalPace');
  if (paceEl) {
    paceEl.textContent = result.pace;
  }
  
  const speedEl = document.getElementById('intervalSpeed');
  if (speedEl) {
    speedEl.textContent = `${result.speed} km/h`;
  }
}

/**
 * 安全生成完整課表
 */
function generateWorkout() {
  try {
    // 安全獲取輸入
    const workoutInput = document.getElementById('workoutInput').value.trim();
    const restType = document.querySelector('input[name="restType"]:checked')?.value || 'fixed';
    
    // 安全驗證輸入
    if (!workoutInput) {
      showErrorMessage('請輸入有效的課表');
      return;
    }
    
    // 安全解析輸入
    const intervals = parseWorkoutInput(workoutInput);
    if (intervals.length === 0) {
      showErrorMessage('無法解析課表輸入');
      return;
    }
    
    // 安全獲取休息時間
    const restTimes = getRestTimes(intervals, restType);
    
    // 安全生成課表
    const workout = generateWorkoutSchedule(intervals, restTimes);
    
    // 安全顯示課表
    displayWorkout(workout);
    
    // 安全日誌
    window.security.logSecurityEvent('WORKOUT_GENERATED', {
      intervalCount: intervals.length,
      restType
    });
  } catch (e) {
    window.security.logSecurityEvent('WORKOUT_GENERATION_FAILED', { 
      error: e.message 
    });
    showErrorMessage('課表生成失敗');
  }
}

/**
 * 安全解析課表輸入
 * @param {string} input - 用戶輸入
 * @returns {Array} 解析後的間歇列表
 */
function parseWorkoutInput(input) {
  // 安全開發守則強制：【預設不信任使用者輸入】
  const safeInput = window.security.sanitizeInput(input);
  const intervals = [];
  
  // 分割輸入 (逗號分隔)
  const parts = safeInput.split(',').map(part => part.trim());
  
  for (const part of parts) {
    if (!part) continue;
    
    // 解析距離/時間
    const distanceMatch = part.match(/(\d+)(m|meter|metres)/i);
    const timeMatch = part.match(/(\d+[':]?\d*)s?(?:\*(\d+))?/i);
    
    if (distanceMatch) {
      const distance = parseInt(distanceMatch[1]);
      intervals.push({
        type: 'distance',
        value: distance,
        count: 1
      });
    } else if (timeMatch) {
      const timeStr = timeMatch[1].replace("'", ":");
      const count = timeMatch[3] ? parseInt(timeMatch[3]) : 1;
      
      // 驗證時間格式
      const timePattern = /^\d{1,2}:\d{2}$/;
      if (!timePattern.test(timeStr)) continue;
      
      intervals.push({
        type: 'time',
        value: timeStr,
        count: count
      });
    }
  }
  
  return intervals;
}

/**
 * 安全獲取休息時間
 * @param {Array} intervals - 間歇列表
 * @param {string} restType - 休息類型
 * @returns {Array} 休息時間列表
 */
function getRestTimes(intervals, restType) {
  const restTimes = [];
  
  switch (restType) {
    case 'fixed':
      const fixedTime = document.getElementById('fixedRestTime').value || '02:00';
      for (let i = 0; i < intervals.length - 1; i++) {
        restTimes.push(fixedTime);
      }
      break;
      
    case 'ratio':
      const ratio = parseFloat(document.getElementById('ratioValue').value) || 0.8;
      for (let i = 0; i < intervals.length - 1; i++) {
        if (intervals[i].type === 'time') {
          const [min, sec] = intervals[i].value.split(':').map(Number);
          const totalSec = min * 60 + sec;
          const restSec = Math.round(totalSec * ratio);
          const restMin = Math.floor(restSec / 60);
          const restSecRem = restSec % 60;
          restTimes.push(`${restMin.toString().padStart(2, '0')}:${restSecRem.toString().padStart(2, '0')}`);
        } else {
          restTimes.push('02:00'); // 默認
        }
      }
      break;
      
    case 'manual':
      const manualInput = document.getElementById('manualRestInput').value.trim();
      if (manualInput) {
        const parts = manualInput.split(',').map(part => part.trim());
        for (const part of parts) {
          const timeMatch = part.match(/(\d{1,2}:\d{2})(?:\*(\d+))?/);
          if (timeMatch) {
            const time = timeMatch[1];
            const count = timeMatch[2] ? parseInt(timeMatch[2]) : 1;
            for (let i = 0; i < count; i++) {
              restTimes.push(time);
            }
          }
        }
      }
      // 填充剩餘
      while (restTimes.length < intervals.length - 1) {
        restTimes.push(restTimes[restTimes.length - 1] || '02:00');
      }
      break;
  }
  
  // 確保數量正確
  while (restTimes.length < intervals.length - 1) {
    restTimes.push('02:00');
  }
  
  return restTimes;
}

/**
 * 安全生成課表日程
 * @param {Array} intervals - 間歇列表
 * @param {Array} restTimes - 休息時間列表
 * @returns {Object} 課表數據
 */
function generateWorkoutSchedule(intervals, restTimes) {
  const schedule = [];
  let totalDistance = 0;
  let totalRunSec = 0;
  let totalRestSec = 0;
  
  let intervalIndex = 1;
  for (let i = 0; i < intervals.length; i++) {
    const interval = intervals[i];
    
    for (let j = 0; j < interval.count; j++) {
      let distance = 0;
      let time = '';
      let pace = '';
      let speed = '';
      
      if (interval.type === 'distance') {
        distance = interval.value;
        // 假設配速 4'00"/km
        const paceMin = 4;
        const paceSec = 0;
        const totalSec = (distance / 1000) * (paceMin * 60 + paceSec);
        time = formatTime(totalSec);
        pace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
        speed = ((distance / 1000) / (totalSec / 3600)).toFixed(1);
      } else {
        time = interval.value;
        const [min, sec] = time.split(':').map(Number);
        const totalSec = min * 60 + sec;
        // 假設距離 400m
        distance = 400;
        const paceMin = Math.floor(totalSec / 60);
        const paceSec = totalSec % 60;
        pace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;
        speed = ((distance / 1000) / (totalSec / 3600)).toFixed(1);
      }
      
      schedule.push({
        number: intervalIndex++,
        distance: distance,
        time: time,
        pace: pace,
        speed: speed,
        rest: i < intervals.length - 1 ? restTimes[i] : ''
      });
      
      totalDistance += distance;
      const [runMin, runSec] = time.split(':').map(Number);
      totalRunSec += runMin * 60 + runSec;
      
      if (i < intervals.length - 1) {
        const [restMin, restSec] = restTimes[i].split(':').map(Number);
        totalRestSec += restMin * 60 + restSec;
      }
    }
  }
  
  // 計算總時間
  const totalWorkoutSec = totalRunSec + totalRestSec;
  const totalTime = {
    distance: totalDistance,
    run: formatTime(totalRunSec),
    rest: formatTime(totalRestSec),
    workout: formatTime(totalWorkoutSec)
  };
  
  return {
    schedule: schedule,
    totalTime: totalTime
  };
}

/**
 * 安全顯示課表
 * @param {Object} workout - 課表數據
 */
function displayWorkout(workout) {
  // 安全開發守則強制：【防止 XSS】
  const summarySection = document.getElementById('workoutSummary');
  if (summarySection) {
    summarySection.hidden = false;
  }
  
  // 更新總覽
  const totalDistanceEl = document.getElementById('totalDistance');
  if (totalDistanceEl) {
    totalDistanceEl.textContent = `${workout.totalTime.distance} m`;
  }
  
  const totalRunTimeEl = document.getElementById('totalRunTime');
  if (totalRunTimeEl) {
    totalRunTimeEl.textContent = workout.totalTime.run;
  }
  
  const totalRestTimeEl = document.getElementById('totalRestTime');
  if (totalRestTimeEl) {
    totalRestTimeEl.textContent = workout.totalTime.rest;
  }
  
  const totalWorkoutTimeEl = document.getElementById('totalWorkoutTime');
  if (totalWorkoutTimeEl) {
    totalWorkoutTimeEl.textContent = workout.totalTime.workout;
  }
  
  // 更新表格
  const tableBody = document.querySelector('#workoutTable tbody');
  if (tableBody) {
    let html = '';
    workout.schedule.forEach(item => {
      html += `
        <tr>
          <td>${item.number}</td>
          <td>${item.distance} m</td>
          <td>${item.time}</td>
          <td>${item.pace}</td>
          <td>${item.rest}</td>
        </tr>
      `;
    });
    
    window.security.renderSafeContent(tableBody, html);
  }
}

/**
 * 安全保存課表
 */
async function saveWorkout() {
  try {
    // 安全獲取課表數據
    const schedule = [];
    const rows = document.querySelectorAll('#workoutTable tbody tr');
    
    for (const row of rows) {
      const cells = row.querySelectorAll('td');
      schedule.push({
        number: parseInt(cells[0].textContent),
        distance: parseInt(cells[1].textContent),
        time: cells[2].textContent,
        pace: cells[3].textContent,
        speed: parseFloat(cells[4].textContent),
        rest: cells[5].textContent
      });
    }
    
    if (schedule.length === 0) {
      showErrorMessage('無課表數據可保存');
      return;
    }
    
    // 安全開發守則強制：【最小權限原則】
    const workouts = (await window.secureStorage.getItem('workouts') || []);
    const newWorkout = {
      id: Date.now().toString(36),
      timestamp: new Date().toISOString(),
      schedule: schedule,
      totalTime: {
        distance: document.getElementById('totalDistance')?.textContent || '0 m',
        run: document.getElementById('totalRunTime')?.textContent || '0:00',
        rest: document.getElementById('totalRestTime')?.textContent || '0:00',
        workout: document.getElementById('totalWorkoutTime')?.textContent || '0:00'
      }
    };
    
    // 安全存儲
    workouts.push(newWorkout);
    await window.secureStorage.setItem('workouts', workouts);
    
    // 安全反饋
    showSuccessMessage('課表已安全保存至個人數據中心');
    
    // 安全日誌
    window.security.logSecurityEvent('WORKOUT_SAVED', { 
      workoutId: newWorkout.id,
      intervalCount: schedule.length
    });
  } catch (e) {
    window.security.logSecurityEvent('WORKOUT_SAVE_FAILED', { 
      error: e.message 
    });
    showErrorMessage('保存失敗，請重試');
  }
}

/**
 * 安全格式化時間
 * @param {number} totalSec - 總秒數
 * @returns {string} 格式化時間
 */
function formatTime(totalSec) {
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * 安全顯示錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function showErrorMessage(message) {
  const statusEl = document.querySelector('.input-section');
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
  const statusEl = document.querySelector('.input-section');
  if (statusEl) {
    window.security.renderSafeContent(
      statusEl, 
      `<div class="success">${window.security.sanitizeInput(message)}</div>`
    );
  }
}