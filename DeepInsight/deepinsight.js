// DeepInsight - Multi-Agent Decision Intelligence Frontend
// Magazine/Editorial Style Redesign

// ========================================
// Configuration
// ========================================
const API_BASE = "http://localhost:5000/api";

// ========================================
// State Management
// ========================================
const state = {
  currentTab: 'decision',
  isAnalyzing: false,
  currentEventSource: null,
  currentLanguage: 'zh',
  
  // Analysis data
  analysisResults: {
    policy: '',
    supply: '',
    tech: ''
  },
  analysisDone: {
    policy: false,
    supply: false,
    tech: false
  },
  divergenceData: { consensus: 0, disagree: 0 },
  finalReport: '',
  reportTimestamp: null,
  analysisStartTime: null,
  
  // Followup data
  followupHistory: [],
  followupInProgress: false,
  followupEventSource: null
};

// ========================================
// i18n - Internationalization
// ========================================
const i18n = {
  zh: {
    brandEn: 'DeepInsight',
    brandCn: '洞见',
    tabs: {
      decision: '决策预演',
      blindspot: '盲区扫描',
      competitor: '竞品雷达'
    },
    placeholder: '输入您需要分析的商业决策或行业事件，例如：「电动汽车关税政策对欧洲市场的影响」',
    startAnalysis: '开始分析',
    cancel: '取消',
    examples: {
      decision: '示例：欧盟碳关税对中国制造业的影响分析',
      blindspot: '示例：TikTok在美国市场面临的监管风险',
      competitor: '示例：分析比亚迪进入东南亚市场的机会'
    },
    placeholders: {
      decision: '输入您需要分析的商业决策或行业事件',
      blindspot: '输入您想扫描盲区的战略决策',
      competitor: '输入您想分析的竞品或市场'
    },
    phasePreparing: '分析准备中',
    agents: {
      policy: '政策风险分析师',
      supply: '供应链分析师',
      tech: '技术路线分析师'
    },
    status: {
      pending: '等待中',
      running: '分析中',
      done: '完成'
    },
    divergence: '分歧检测',
    consensus: '共识',
    disagree: '分歧',
    report: '交叉验证报告',
    reportMeta: {
      consensus: '共识度',
      disagree: '分歧度',
      duration: '耗时',
      rounds: '轮验证'
    },
    copy: '复制',
    exportPdf: '导出PDF',
    exportMarkdown: '导出Markdown',
    copied: '已复制',
    followup: '追问',
    followupPlaceholder: '输入您的追问...',
    sendFollowup: '发送',
    footer: 'DeepInsight v2.1 · Multi-Agent Decision Intelligence',
    errors: {
      network: '网络错误，请检查后端服务是否运行',
      rateLimit: '请求过于频繁，请稍后再试',
      server: '服务器错误，请重试',
      empty: '请输入分析内容'
    },
    phaseSteps: {
      preparing: '准备中',
      policy: '政策分析',
      supply: '供应链分析',
      tech: '技术路线分析',
      divergence: '分歧检测',
      report: '生成报告'
    }
  },
  en: {
    brandEn: 'DeepInsight',
    brandCn: 'Insights',
    tabs: {
      decision: 'Decision Rehearsal',
      blindspot: 'Blind Spot Scan',
      competitor: 'Competitor Radar'
    },
    placeholder: 'Enter a business decision or industry event to analyze, e.g.: "Impact of EV tariffs on European market"',
    startAnalysis: 'Start Analysis',
    cancel: 'Cancel',
    examples: {
      decision: 'Example: Impact analysis of EU carbon tariff on Chinese manufacturing',
      blindspot: 'Example: Regulatory risks faced by TikTok in US market',
      competitor: 'Example: Analyze BYD opportunities in Southeast Asia market'
    },
    placeholders: {
      decision: 'Enter the business decision or industry event to analyze',
      blindspot: 'Enter the strategic decision to scan for blind spots',
      competitor: 'Enter the competitor or market to analyze'
    },
    phasePreparing: 'Preparing Analysis',
    agents: {
      policy: 'Policy Risk Analyst',
      supply: 'Supply Chain Analyst',
      tech: 'Technology Analyst'
    },
    status: {
      pending: 'Pending',
      running: 'Analyzing',
      done: 'Done'
    },
    divergence: 'Divergence Detection',
    consensus: 'Consensus',
    disagree: 'Disagree',
    report: 'Cross-Validation Report',
    reportMeta: {
      consensus: 'Consensus',
      disagree: 'Disagree',
      duration: 'Duration',
      rounds: 'Rounds'
    },
    copy: 'Copy',
    exportPdf: 'Export PDF',
    exportMarkdown: 'Export Markdown',
    copied: 'Copied',
    followup: 'Follow-up',
    followupPlaceholder: 'Enter your follow-up question...',
    sendFollowup: 'Send',
    footer: 'DeepInsight v2.1 · Multi-Agent Decision Intelligence',
    errors: {
      network: 'Network error, please check if backend is running',
      rateLimit: 'Rate limit exceeded, please try again later',
      server: 'Server error, please retry',
      empty: 'Please enter content to analyze'
    },
    phaseSteps: {
      preparing: 'Preparing',
      policy: 'Policy Analysis',
      supply: 'Supply Chain Analysis',
      tech: 'Technology Analysis',
      divergence: 'Divergence Detection',
      report: 'Generating Report'
    }
  }
};

// ========================================
// Utility Functions
// ========================================
function t(key) {
  const keys = key.split('.');
  let value = i18n[state.currentLanguage];
  for (const k of keys) {
    value = value?.[k];
  }
  return value || key;
}

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========================================
// DOM Elements
// ========================================
let elements = {};

function initElements() {
  elements = {
    // Navigation
    navTabs: document.querySelectorAll('.nav-tab'),
    langButtons: document.querySelectorAll('.nav-lang button'),
    
    // Tab contents
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Input sections
    textareas: {
      decision: document.getElementById('textarea-decision'),
      blindspot: document.getElementById('textarea-blindspot'),
      competitor: document.getElementById('textarea-competitor')
    },
    exampleTags: {
      decision: document.querySelectorAll('#tab-decision .example-tag'),
      blindspot: document.querySelectorAll('#tab-blindspot .example-tag'),
      competitor: document.querySelectorAll('#tab-competitor .example-tag')
    },
    analyzeButtons: {
      decision: document.getElementById('btn-analyze-decision'),
      blindspot: document.getElementById('btn-analyze-blindspot'),
      competitor: document.getElementById('btn-analyze-competitor')
    },
    cancelButtons: {
      decision: document.getElementById('btn-cancel-decision'),
      blindspot: document.getElementById('btn-cancel-blindspot'),
      competitor: document.getElementById('btn-cancel-competitor')
    },
    
    // Analysis section
    analysisSections: {
      decision: document.getElementById('analysis-decision'),
      blindspot: document.getElementById('analysis-blindspot'),
      competitor: document.getElementById('analysis-competitor')
    },
    
    // Phase indicator
    phaseIndicators: {
      decision: document.getElementById('phase-decision'),
      blindspot: document.getElementById('phase-blindspot'),
      competitor: document.getElementById('phase-competitor')
    },
    
    // Agent blocks
    agentBlocks: {
      policy: {
        decision: document.getElementById('agent-policy-decision'),
        blindspot: document.getElementById('agent-policy-blindspot'),
        competitor: document.getElementById('agent-policy-competitor')
      },
      supply: {
        decision: document.getElementById('agent-supply-decision'),
        blindspot: document.getElementById('agent-supply-blindspot'),
        competitor: document.getElementById('agent-supply-competitor')
      },
      tech: {
        decision: document.getElementById('agent-tech-decision'),
        blindspot: document.getElementById('agent-tech-blindspot'),
        competitor: document.getElementById('agent-tech-competitor')
      }
    },
    
    // Agent contents
    agentContents: {
      policy: {
        decision: document.getElementById('agent-content-policy-decision'),
        blindspot: document.getElementById('agent-content-policy-blindspot'),
        competitor: document.getElementById('agent-content-policy-competitor')
      },
      supply: {
        decision: document.getElementById('agent-content-supply-decision'),
        blindspot: document.getElementById('agent-content-supply-blindspot'),
        competitor: document.getElementById('agent-content-supply-competitor')
      },
      tech: {
        decision: document.getElementById('agent-content-tech-decision'),
        blindspot: document.getElementById('agent-content-tech-blindspot'),
        competitor: document.getElementById('agent-content-tech-competitor')
      }
    },
    
    // Divergence
    divergenceSections: {
      decision: document.getElementById('divergence-decision'),
      blindspot: document.getElementById('divergence-blindspot'),
      competitor: document.getElementById('divergence-competitor')
    },
    consensusBars: {
      decision: document.getElementById('consensus-bar-decision'),
      blindspot: document.getElementById('consensus-bar-blindspot'),
      competitor: document.getElementById('consensus-bar-competitor')
    },
    disagreeBars: {
      decision: document.getElementById('disagree-bar-decision'),
      blindspot: document.getElementById('disagree-bar-blindspot'),
      competitor: document.getElementById('disagree-bar-competitor')
    },
    consensusStats: {
      decision: document.getElementById('consensus-stat-decision'),
      blindspot: document.getElementById('consensus-stat-blindspot'),
      competitor: document.getElementById('consensus-stat-competitor')
    },
    disagreeStats: {
      decision: document.getElementById('disagree-stat-decision'),
      blindspot: document.getElementById('disagree-stat-blindspot'),
      competitor: document.getElementById('disagree-stat-competitor')
    },
    
    // Reports
    reportSections: {
      decision: document.getElementById('report-decision'),
      blindspot: document.getElementById('report-blindspot'),
      competitor: document.getElementById('report-competitor')
    },
    reportContents: {
      decision: document.getElementById('report-content-decision'),
      blindspot: document.getElementById('report-content-blindspot'),
      competitor: document.getElementById('report-content-competitor')
    },
    reportMeta: {
      decision: document.getElementById('report-meta-decision'),
      blindspot: document.getElementById('report-meta-blindspot'),
      competitor: document.getElementById('report-meta-competitor')
    },
    reportTimestamps: {
      decision: document.getElementById('report-timestamp-decision'),
      blindspot: document.getElementById('report-timestamp-blindspot'),
      competitor: document.getElementById('report-timestamp-competitor')
    },
    
    // Followup
    followupSections: {
      decision: document.getElementById('followup-decision'),
      blindspot: document.getElementById('followup-blindspot'),
      competitor: document.getElementById('followup-competitor')
    },
    followupTextareas: {
      decision: document.getElementById('followup-textarea-decision'),
      blindspot: document.getElementById('followup-textarea-blindspot'),
      competitor: document.getElementById('followup-textarea-competitor')
    },
    followupHistoryContainers: {
      decision: document.getElementById('followup-history-decision'),
      blindspot: document.getElementById('followup-history-blindspot'),
      competitor: document.getElementById('followup-history-competitor')
    },
    followupButtons: {
      decision: document.getElementById('btn-followup-decision'),
      blindspot: document.getElementById('btn-followup-blindspot'),
      competitor: document.getElementById('btn-followup-competitor')
    },
    
    // Error/Notice
    errorNotices: {
      decision: document.getElementById('error-notice-decision'),
      blindspot: document.getElementById('error-notice-blindspot'),
      competitor: document.getElementById('error-notice-competitor')
    },
    rateLimitNotices: {
      decision: document.getElementById('rate-limit-notice-decision'),
      blindspot: document.getElementById('rate-limit-notice-blindspot'),
      competitor: document.getElementById('rate-limit-notice-competitor')
    }
  };
}

// ========================================
// UI Update Functions
// ========================================
function updateUI() {
  // Update language
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  
  // Update placeholders
  Object.keys(elements.textareas).forEach(tab => {
    if (elements.textareas[tab]) {
      elements.textareas[tab].placeholder = t(`placeholders.${tab}`);
    }
  });
  
  // Update example tags
  Object.keys(elements.exampleTags).forEach(tab => {
    elements.exampleTags[tab].forEach((tag, index) => {
      const examples = tab === 'decision' ? [
        '欧盟碳关税影响分析',
        '新能源补贴退坡策略',
        '并购后整合风险评估'
      ] : tab === 'blindspot' ? [
        'TikTok美国监管风险',
        '供应链韧性评估',
        '技术路线选择盲区'
      ] : [
        '比亚迪东南亚市场',
        '苹果汽车项目分析',
        '华为汽车业务竞争'
      ];
      tag.textContent = examples[index] || '';
    });
  });
  
  // Update button states
  Object.keys(elements.analyzeButtons).forEach(tab => {
    if (elements.analyzeButtons[tab]) {
      elements.analyzeButtons[tab].textContent = state.isAnalyzing ? t('cancel') : t('startAnalysis');
    }
  });
}

function switchTab(tabName) {
  state.currentTab = tabName;
  
  // Update nav tabs
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update tab contents
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === `tab-${tabName}`);
  });
}

function updatePhaseIndicator(tab, currentPhase) {
  const indicator = elements.phaseIndicators[tab];
  if (!indicator) return;
  
  const phases = ['preparing', 'policy', 'supply', 'tech', 'divergence', 'report'];
  const phaseNames = {
    preparing: t('phaseSteps.preparing'),
    policy: t('phaseSteps.policy'),
    supply: t('phaseSteps.supply'),
    tech: t('phaseSteps.tech'),
    divergence: t('phaseSteps.divergence'),
    report: t('phaseSteps.report')
  };
  
  const currentIndex = phases.indexOf(currentPhase);
  
  indicator.innerHTML = `
    <div class="phase-title">${t('phasePreparing')}</div>
    <div class="phase-steps">
      ${phases.map((phase, index) => {
        let className = 'phase-step';
        if (index < currentIndex) className += ' done';
        else if (index === currentIndex) className += ' active';
        
        const arrow = index < phases.length - 1 ? '<span class="phase-arrow">→</span>' : '';
        return `<span class="${className}"><span class="phase-dot"></span>${phaseNames[phase]}</span>${arrow}`;
      }).join('')}
    </div>
  `;
}

function updateAgentBlock(tab, agent, status, content = null) {
  const block = elements.agentBlocks[agent]?.[tab];
  const contentEl = elements.agentContents[agent]?.[tab];
  const statusEl = block?.querySelector('.agent-status');
  
  if (!block) return;
  
  // Update status class
  block.classList.toggle('active', status === 'running');
  
  if (statusEl) {
    statusEl.className = 'agent-status ' + status;
    if (status === 'running') {
      statusEl.innerHTML = `<span class="typing-indicator"><span></span><span></span><span></span></span>`;
    } else if (status === 'done') {
      statusEl.textContent = t('status.done');
    }
  }
  
  if (content && contentEl) {
    contentEl.innerHTML = content;
  }
}

function updateDivergence(tab, consensus, disagree) {
  const section = elements.divergenceSections[tab];
  const consensusBar = elements.consensusBars[tab];
  const disagreeBar = elements.disagreeBars[tab];
  const consensusStat = elements.consensusStats[tab];
  const disagreeStat = elements.disagreeStats[tab];
  
  if (!section) return;
  
  section.style.display = 'block';
  
  const total = consensus + disagree;
  const consensusPercent = total > 0 ? Math.round((consensus / total) * 100) : 0;
  const disagreePercent = 100 - consensusPercent;
  
  if (consensusBar) consensusBar.style.width = consensusPercent + '%';
  if (disagreeBar) disagreeBar.style.width = disagreePercent + '%';
  if (consensusStat) consensusStat.textContent = consensusPercent + '%';
  if (disagreeStat) disagreeStat.textContent = disagreePercent + '%';
}

function updateReport(tab, content, meta) {
  const section = elements.reportSections[tab];
  const contentEl = elements.reportContents[tab];
  const metaEl = elements.reportMeta[tab];
  const timestampEl = elements.reportTimestamps[tab];
  
  if (!section) return;
  
  section.style.display = 'block';
  
  if (contentEl) {
    contentEl.innerHTML = content;
  }
  
  if (metaEl) {
    metaEl.innerHTML = `
      <span class="report-meta-item">
        <span class="stat-dot consensus"></span>
        <span class="stat-value">${meta.consensus}%</span>
        <span class="stat-label">${t('reportMeta.consensus')}</span>
      </span>
      <span class="report-meta-item">
        <span class="stat-dot disagree"></span>
        <span class="stat-value">${meta.disagree}%</span>
        <span class="stat-label">${t('reportMeta.disagree')}</span>
      </span>
      <span class="report-meta-item">
        <span class="stat-value">${meta.duration}</span>
        <span class="stat-label">${t('reportMeta.duration')}</span>
      </span>
      <span class="report-meta-item">
        <span class="stat-value">${meta.rounds}</span>
        <span class="stat-label">${t('reportMeta.rounds')}</span>
      </span>
    `;
  }
  
  if (timestampEl) {
    timestampEl.textContent = new Date().toLocaleString(state.currentLanguage === 'zh' ? 'zh-CN' : 'en-US');
  }
}

function showError(tab, message) {
  const notice = elements.errorNotices[tab];
  if (notice) {
    notice.textContent = message;
    notice.style.display = 'block';
    setTimeout(() => {
      notice.style.display = 'none';
    }, 5000);
  }
}

function showRateLimit(tab, retryAfter) {
  const notice = elements.rateLimitNotices[tab];
  if (notice) {
    notice.innerHTML = `<span class="loading-spinner"></span> ${t('errors.rateLimit')} (${retryAfter}s)`;
    notice.style.display = 'flex';
  }
}

function hideRateLimit(tab) {
  const notice = elements.rateLimitNotices[tab];
  if (notice) {
    notice.style.display = 'none';
  }
}

function addFollowupItem(tab, question, answer) {
  const container = elements.followupHistoryContainers[tab];
  if (!container) return;
  
  const item = document.createElement('div');
  item.className = 'followup-item';
  item.innerHTML = `
    <div class="followup-question">${escapeHtml(question)}</div>
    <div class="followup-answer">${answer}</div>
  `;
  container.appendChild(item);
}

// ========================================
// Analysis Functions
// ========================================
function startAnalysis(tab) {
  const textarea = elements.textareas[tab];
  const content = textarea?.value.trim();
  
  if (!content) {
    showError(tab, t('errors.empty'));
    return;
  }
  
  // Reset state
  state.isAnalyzing = true;
  state.analysisResults = { policy: '', supply: '', tech: '' };
  state.analysisDone = { policy: false, supply: false, tech: false };
  state.divergenceData = { consensus: 0, disagree: 0 };
  state.finalReport = '';
  state.analysisStartTime = Date.now();
  
  // Update UI
  updateAnalyzeButton(tab, true);
  showAnalysisSection(tab);
  resetAnalysisSection(tab);
  hideError(tab);
  hideRateLimit(tab);
  
  // Update phase
  updatePhaseIndicator(tab, 'preparing');
  
  // Start SSE connection
  const endpoint = tab === 'decision' ? '/analyze/stream' : 
                   tab === 'blindspot' ? '/blindspot/stream' : '/competitor/stream';
  
  const eventSource = new EventSource(`${API_BASE}${endpoint}?query=${encodeURIComponent(content)}`);
  state.currentEventSource = eventSource;
  
  let reportBuffer = '';
  let roundsCount = 0;
  
  eventSource.addEventListener('phase', (e) => {
    const phase = e.data;
    updatePhaseIndicator(tab, phase);
    
    // Activate agent blocks based on phase
    if (phase === 'policy') {
      updateAgentBlock(tab, 'policy', 'running');
    } else if (phase === 'supply') {
      state.analysisDone.policy = true;
      updateAgentBlock(tab, 'policy', 'done');
      updateAgentBlock(tab, 'supply', 'running');
    } else if (phase === 'tech') {
      state.analysisDone.supply = true;
      updateAgentBlock(tab, 'supply', 'done');
      updateAgentBlock(tab, 'tech', 'running');
    }
  });
  
  eventSource.addEventListener('agent_done', (e) => {
    const data = JSON.parse(e.data);
    const agent = data.agent;
    const content = data.content;
    
    state.analysisResults[agent] = content;
    state.analysisDone[agent] = true;
    
    updateAgentBlock(tab, agent, 'done', marked.parse(content));
    
    // Update phase
    if (agent === 'policy') {
      updatePhaseIndicator(tab, 'supply');
      updateAgentBlock(tab, 'supply', 'running');
    } else if (agent === 'supply') {
      updatePhaseIndicator(tab, 'tech');
      updateAgentBlock(tab, 'tech', 'running');
    } else if (agent === 'tech') {
      state.analysisDone.tech = true;
      updatePhaseIndicator(tab, 'divergence');
    }
  });
  
  eventSource.addEventListener('divergence', (e) => {
    const data = JSON.parse(e.data);
    state.divergenceData = {
      consensus: data.consensus || 0,
      disagree: data.disagree || 0
    };
    updateDivergence(tab, state.divergenceData.consensus, state.divergenceData.disagree);
    updatePhaseIndicator(tab, 'report');
  });
  
  eventSource.addEventListener('report_chunk', (e) => {
    reportBuffer += e.data;
    roundsCount++;
    
    // Debounced render
    debouncedRenderReport(tab, reportBuffer);
  });
  
  eventSource.addEventListener('done', (e) => {
    finishAnalysis(tab, reportBuffer, roundsCount);
    eventSource.close();
  });
  
  eventSource.addEventListener('error', (e) => {
    const errorData = JSON.parse(e.data || '{}');
    
    if (errorData.code === 429) {
      // Rate limit
      showRateLimit(tab, errorData.retry_after || 60);
    } else {
      showError(tab, t('errors.server'));
      cancelAnalysis();
    }
    
    eventSource.close();
  });
}

function debouncedRenderReport = debounce((tab, rawMarkdown) => {
  const rendered = marked.parse(rawMarkdown);
  state.finalReport = rendered;
  
  const duration = formatDuration(Date.now() - state.analysisStartTime);
  
  updateReport(tab, rendered, {
    consensus: state.divergenceData.consensus,
    disagree: state.divergenceData.disagree,
    duration: duration,
    rounds: state.roundsCount || 0
  });
}, 200);

function finishAnalysis(tab, rawMarkdown, rounds) {
  state.isAnalyzing = false;
  state.reportTimestamp = new Date();
  state.roundsCount = rounds;
  
  // Final render
  const rendered = marked.parse(rawMarkdown);
  state.finalReport = rendered;
  
  const duration = formatDuration(Date.now() - state.analysisStartTime);
  
  updateReport(tab, rendered, {
    consensus: state.divergenceData.consensus,
    disagree: state.divergenceData.disagree,
    duration: duration,
    rounds: rounds
  });
  
  // Update phase indicator
  updatePhaseIndicator(tab, 'report');
  
  // Show followup section
  const followupSection = elements.followupSections[tab];
  if (followupSection) {
    followupSection.style.display = 'block';
  }
  
  // Update button
  updateAnalyzeButton(tab, false);
}

function cancelAnalysis() {
  state.isAnalyzing = false;
  
  if (state.currentEventSource) {
    state.currentEventSource.close();
    state.currentEventSource = null;
  }
  
  // Reset all tabs
  ['decision', 'blindspot', 'competitor'].forEach(tab => {
    updateAnalyzeButton(tab, false);
  });
}

function updateAnalyzeButton(tab, isAnalyzing) {
  const btn = elements.analyzeButtons[tab];
  if (btn) {
    btn.textContent = isAnalyzing ? t('cancel') : t('startAnalysis');
    btn.disabled = false;
  }
}

function showAnalysisSection(tab) {
  const section = elements.analysisSections[tab];
  if (section) {
    section.style.display = 'block';
  }
}

function resetAnalysisSection(tab) {
  // Reset agents
  ['policy', 'supply', 'tech'].forEach(agent => {
    updateAgentBlock(tab, agent, 'pending', '');
  });
  
  // Hide divergence
  const divergenceSection = elements.divergenceSections[tab];
  if (divergenceSection) {
    divergenceSection.style.display = 'none';
  }
  
  // Hide report
  const reportSection = elements.reportSections[tab];
  if (reportSection) {
    reportSection.style.display = 'none';
  }
  
  // Hide followup
  const followupSection = elements.followupSections[tab];
  if (followupSection) {
    followupSection.style.display = 'none';
  }
  
  // Clear followup history
  const followupHistory = elements.followupHistoryContainers[tab];
  if (followupHistory) {
    followupHistory.innerHTML = '';
  }
}

function hideError(tab) {
  const notice = elements.errorNotices[tab];
  if (notice) {
    notice.style.display = 'none';
  }
}

// ========================================
// Followup Functions
// ========================================
function startFollowup(tab) {
  const textarea = elements.followupTextareas[tab];
  const question = textarea?.value.trim();
  
  if (!question) return;
  
  // Clear textarea
  if (textarea) textarea.value = '';
  
  // Get current report context
  const currentReport = state.finalReport;
  
  // Start SSE
  state.followupInProgress = true;
  updateFollowupButton(tab, true);
  
  const eventSource = new EventSource(
    `${API_BASE}/followup/stream?question=${encodeURIComponent(question)}&report=${encodeURIComponent(currentReport)}`
  );
  state.followupEventSource = eventSource;
  
  let answerBuffer = '';
  
  eventSource.addEventListener('chunk', (e) => {
    answerBuffer += e.data;
    // Live update could be added here
  });
  
  eventSource.addEventListener('done', (e) => {
    // Add to history
    state.followupHistory.push({ question, answer: answerBuffer });
    addFollowupItem(tab, question, marked.parse(answerBuffer));
    
    eventSource.close();
    state.followupInProgress = false;
    updateFollowupButton(tab, false);
  });
  
  eventSource.addEventListener('error', (e) => {
    showError(tab, t('errors.server'));
    eventSource.close();
    state.followupInProgress = false;
    updateFollowupButton(tab, false);
  });
}

function updateFollowupButton(tab, isLoading) {
  const btn = elements.followupButtons[tab];
  if (btn) {
    btn.disabled = isLoading;
    btn.innerHTML = isLoading ? '<span class="loading-spinner"></span>' : t('sendFollowup');
  }
}

// ========================================
// Export Functions
// ========================================
async function copyReport(tab) {
  const content = state.finalReport;
  const textarea = document.createElement('textarea');
  textarea.value = content;
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  
  // Show feedback
  const btn = document.querySelector(`#report-${tab} .btn-text:first-of-type`);
  if (btn) {
    const originalText = btn.textContent;
    btn.textContent = t('copied');
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }
}

async function exportMarkdown(tab) {
  try {
    const response = await fetch(`${API_BASE}/export/markdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: state.finalReport })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `deepinsight-report-${Date.now()}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      showError(tab, t('errors.server'));
    }
  } catch (err) {
    showError(tab, t('errors.network'));
  }
}

async function exportPdf(tab) {
  const reportContent = document.getElementById(`report-content-${tab}`);
  if (!reportContent) return;
  
  const opt = {
    margin: [10, 10, 10, 10],
    filename: `deepinsight-report-${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  try {
    await html2pdf().set(opt).from(reportContent).save();
  } catch (err) {
    showError(tab, t('errors.server'));
  }
}

// ========================================
// Example Fill Functions
// ========================================
function fillExample(tab, exampleText) {
  const textarea = elements.textareas[tab];
  if (textarea) {
    textarea.value = exampleText;
    textarea.focus();
  }
}

// ========================================
// Event Listeners Setup
// ========================================
function setupEventListeners() {
  // Tab switching
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // Language switching
  elements.langButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      state.currentLanguage = btn.dataset.lang;
      elements.langButtons.forEach(b => b.classList.toggle('active', b === btn));
      updateUI();
    });
  });
  
  // Analyze buttons
  Object.keys(elements.analyzeButtons).forEach(tab => {
    const btn = elements.analyzeButtons[tab];
    if (btn) {
      btn.addEventListener('click', () => {
        if (state.isAnalyzing) {
          cancelAnalysis();
        } else {
          startAnalysis(tab);
        }
      });
    }
  });
  
  // Cancel buttons
  Object.keys(elements.cancelButtons).forEach(tab => {
    const btn = elements.cancelButtons[tab];
    if (btn) {
      btn.addEventListener('click', cancelAnalysis);
    }
  });
  
  // Example tags
  Object.keys(elements.exampleTags).forEach(tab => {
    elements.exampleTags[tab].forEach((tag, index) => {
      tag.addEventListener('click', () => {
        const examples = {
          decision: [
            '欧盟碳关税对中国制造业的影响分析',
            '新能源汽车补贴退坡后的市场策略调整',
            '跨国并购后的文化整合风险评估'
          ],
          blindspot: [
            'TikTok在美国市场面临的监管风险扫描',
            '公司供应链韧性的潜在盲区分析',
            '技术路线选择过程中的认知盲区'
          ],
          competitor: [
            '比亚迪进入东南亚汽车市场的机会分析',
            '苹果公司汽车项目的竞争态势评估',
            '华为智能汽车业务的竞争格局分析'
          ]
        };
        fillExample(tab, examples[tab][index]);
      });
    });
  });
  
  // Followup buttons
  Object.keys(elements.followupButtons).forEach(tab => {
    const btn = elements.followupButtons[tab];
    const textarea = elements.followupTextareas[tab];
    
    if (btn) {
      btn.addEventListener('click', () => startFollowup(tab));
    }
    
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          startFollowup(tab);
        }
      });
    }
  });
  
  // Export buttons
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.closest('.tab-content')?.id?.replace('tab-', '');
      if (tab) copyReport(tab);
    });
  });
  
  document.querySelectorAll('.btn-export-md').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.closest('.tab-content')?.id?.replace('tab-', '');
      if (tab) exportMarkdown(tab);
    });
  });
  
  document.querySelectorAll('.btn-export-pdf').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.closest('.tab-content')?.id?.replace('tab-', '');
      if (tab) exportPdf(tab);
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isAnalyzing) {
      cancelAnalysis();
    }
  });
}

// ========================================
// Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  initElements();
  setupEventListeners();
  updateUI();
  
  // Set initial language
  state.currentLanguage = 'zh';
  elements.langButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === 'zh');
  });
});
