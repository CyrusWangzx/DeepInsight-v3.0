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
  currentAbortController: null,
  currentLanguage: 'zh',
  analysisLanguage: null,  // 分析开始时锁定的语言，分析完成后清除
  
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
  followupInProgress: false
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
    placeholder: '输入您需要分析的商业决策或行业事件，例如：电动汽车关税政策对欧洲市场的影响',
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
  if (seconds < 60) return seconds + 's';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return minutes + 'm ' + remainingSeconds + 's';
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
      elements.textareas[tab].placeholder = t('placeholders.' + tab);
    }
  });
  
  // Update example tags
  var examplesByLang = {
    zh: {
      decision: ['欧盟碳关税影响分析', '新能源补贴退坡策略', '并购后整合风险评估'],
      blindspot: ['TikTok美国监管风险', '供应链韧性评估', '技术路线选择盲区'],
      competitor: ['比亚迪东南亚市场', '苹果汽车项目分析', '华为汽车业务竞争']
    },
    en: {
      decision: ['EU carbon tariff impact', 'EV subsidy phase-out strategy', 'Post-M&A integration risk'],
      blindspot: ['TikTok US regulatory risk', 'Supply chain resilience', 'Technology route blind spots'],
      competitor: ['BYD Southeast Asia', 'Apple car project', 'Huawei auto business']
    }
  };
  Object.keys(elements.exampleTags).forEach(tab => {
    elements.exampleTags[tab].forEach((tag, index) => {
      var examples = examplesByLang[state.currentLanguage]?.[tab] || examplesByLang.zh[tab];
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
    content.classList.toggle('active', content.id === 'tab-' + tabName);
  });
}

function updatePhaseIndicator(tab, currentPhase) {
  const indicator = elements.phaseIndicators[tab];
  if (!indicator) return;
  
  // Map backend phase names to frontend display phases
  var backendToFrontend = {
    'anonymizing': 'preparing',
    'planning': 'preparing',
    'planned': 'preparing',
    'agents_running': 'policy',
    'policy_done': 'supply',
    'supply_done': 'tech',
    'divergence_check': 'divergence',
    'refinement': 'divergence',
    'synthesis': 'report'
  };
  
  var mappedPhase = backendToFrontend[currentPhase] || currentPhase;
  const phases = ['preparing', 'policy', 'supply', 'tech', 'divergence', 'report'];
  const currentIndex = phases.indexOf(mappedPhase);
  
  var currentStepName = t('phaseSteps.' + mappedPhase) || mappedPhase;
  
  indicator.innerHTML = '<div class="phase-title">' + currentStepName + '</div><div class="phase-steps">' +
    phases.map(function(phase, index) {
      var className = 'phase-step';
      if (index < currentIndex) className += ' done';
      else if (index === currentIndex) className += ' active';
      
      var arrow = index < phases.length - 1 ? '<span class="phase-arrow">\u2192</span>' : '';
      return '<span class="' + className + '"><span class="phase-dot"></span>' + t('phaseSteps.' + phase) + '</span>' + arrow;
    }).join('') + '</div>';
}

function updateAgentBlock(tab, agent, status, content) {
  const block = elements.agentBlocks[agent]?.[tab];
  const contentEl = elements.agentContents[agent]?.[tab];
  const statusEl = block?.querySelector('.agent-status');
  
  if (!block) return;
  
  // Update status class
  block.classList.toggle('active', status === 'running');
  
  if (statusEl) {
    statusEl.className = 'agent-status ' + status;
    if (status === 'running') {
      statusEl.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';
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
    metaEl.innerHTML = '<span class="report-meta-item"><span class="stat-dot consensus"></span><span class="stat-value">' + meta.consensus + '%</span><span class="stat-label">' + t('reportMeta.consensus') + '</span></span>' +
      '<span class="report-meta-item"><span class="stat-dot disagree"></span><span class="stat-value">' + meta.disagree + '%</span><span class="stat-label">' + t('reportMeta.disagree') + '</span></span>' +
      '<span class="report-meta-item"><span class="stat-value">' + meta.duration + '</span><span class="stat-label">' + t('reportMeta.duration') + '</span></span>' +
      '<span class="report-meta-item"><span class="stat-value">' + meta.rounds + '</span><span class="stat-label">' + t('reportMeta.rounds') + '</span></span>';
  }
  
  if (timestampEl) {
    var now = new Date();
    var y = now.getFullYear();
    var mo = String(now.getMonth() + 1).padStart(2, '0');
    var d = String(now.getDate()).padStart(2, '0');
    var h = String(now.getHours()).padStart(2, '0');
    var mi = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    timestampEl.textContent = y + '年' + mo + '月' + d + '日 ' + h + '时' + mi + '分' + s + '秒';
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
    notice.innerHTML = '<span class="loading-spinner"></span> ' + t('errors.rateLimit') + ' (' + retryAfter + 's)';
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
  item.innerHTML = '<div class="followup-question">' + escapeHtml(question) + '</div><div class="followup-answer">' + answer + '</div>';
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
  state.analysisLanguage = state.currentLanguage;  // 锁定当前语言
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
  
  // Map tab to feature_type
  const featureMap = { decision: 'decision', blindspot: 'blindspot', competitor: 'competitor' };
  
  // Use fetch POST (EventSource only supports GET)
  const controller = new AbortController();
  state.currentAbortController = controller;
  
  fetch(API_BASE + '/analyze/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: content,
      lang: state.analysisLanguage || state.currentLanguage,
      feature_type: featureMap[tab] || 'decision'
    }),
    signal: controller.signal
  }).then(function(response) {
    if (response.status === 429) {
      showRateLimit(tab, 60);
      cancelAnalysis();
      return;
    }
    if (!response.ok) {
      showError(tab, t('errors.server'));
      cancelAnalysis();
      return;
    }
    
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    
    function read() {
      reader.read().then(function(result) {
        if (result.done) {
          cancelAnalysis();
          return;
        }
        buffer += decoder.decode(result.value, { stream: true });
        
        var lines = buffer.split('\n\n');
        buffer = lines.pop();
        
        for (var i = 0; i < lines.length; i++) {
          var block = lines[i].trim();
          if (!block) continue;
          
          var eventType = '';
          var eventData = null;
          var blockLines = block.split('\n');
          for (var j = 0; j < blockLines.length; j++) {
            if (blockLines[j].indexOf('event: ') === 0) {
              eventType = blockLines[j].substring(7).trim();
            } else if (blockLines[j].indexOf('data: ') === 0) {
              try { eventData = JSON.parse(blockLines[j].substring(6)); } catch(e) { eventData = blockLines[j].substring(6); }
            }
          }
          
          if (!eventType) continue;
          
          switch (eventType) {
            case 'phase':
              var phase = (typeof eventData === 'object') ? eventData.phase : eventData;
              updatePhaseIndicator(tab, phase);
              if (phase === 'agents_running') {
                // All 3 agents run in parallel
                updateAgentBlock(tab, 'policy', 'running');
                updateAgentBlock(tab, 'supply', 'running');
                updateAgentBlock(tab, 'tech', 'running');
              }
              break;
              
            case 'agent_done':
              // Map backend agent names to frontend keys
              var agentMap = { 'policy': 'policy', 'supply_chain': 'supply', 'tech_route': 'tech' };
              var agent = agentMap[eventData.agent] || eventData.agent;
              var agentContent = eventData.output || eventData.content || '';
              state.analysisResults[agent] = agentContent;
              state.analysisDone[agent] = true;
              updateAgentBlock(tab, agent, 'done', marked.parse(agentContent));
              // Update phase indicator when all agents complete
              if (state.analysisDone.policy && state.analysisDone.supply && state.analysisDone.tech) {
                updatePhaseIndicator(tab, 'divergence_check');
              }
              break;
              
            case 'divergence':
              // Backend sends {score, points, need_refinement} for intermediate updates
              // Don't overwrite consensus/divergence data here - wait for the done event
              break;
              
            case 'report_chunk':
              reportBuffer += (eventData.chunk || eventData);
              roundsCount++;
              debouncedRenderReport(tab, reportBuffer);
              break;
              
            case 'done':
              // Extract final consensus/divergence from done event
              // 后端发送 consensus_level (0~1) 和 divergence_score (0~1)，直接 ×100 转百分比
              if (eventData && typeof eventData === 'object') {
                var consensusLevel = eventData.consensus_level;
                var divergenceScore = eventData.divergence_score;
                // 确保值为有效数字
                if (typeof consensusLevel === 'number' && typeof divergenceScore === 'number') {
                  state.divergenceData = {
                    consensus: Math.round(consensusLevel * 100),
                    disagree: Math.round(divergenceScore * 100)
                  };
                } else {
                  state.divergenceData = { consensus: 0, disagree: 0 };
                }
              }
              finishAnalysis(tab, reportBuffer, eventData.rounds || roundsCount);
              break;
              
            case 'error':
              showError(tab, (typeof eventData === 'object') ? eventData.message : (eventData || t('errors.server')));
              cancelAnalysis();
              break;
          }
        }
        
        read();
      });
    }
    read();
  }).catch(function(err) {
    if (err.name === 'AbortError') {
      // User cancelled
    } else {
      showError(tab, t('errors.network'));
      cancelAnalysis();
    }
  });
  
  let reportBuffer = '';
  let roundsCount = 0;
}

const debouncedRenderReport = debounce((tab, rawMarkdown) => {
  const rendered = marked.parse(rawMarkdown);
  state.finalReport = rendered;
  
  // 仅更新报告内容，不更新元数据（分歧度/共识度由 done 事件统一更新）
  const section = elements.reportSections[tab];
  const contentEl = elements.reportContents[tab];
  if (section) section.style.display = 'block';
  if (contentEl) contentEl.innerHTML = rendered;
}, 200);

function finishAnalysis(tab, rawMarkdown, rounds) {
  state.isAnalyzing = false;
  state.analysisLanguage = null;  // 解除语言锁定
  state.reportTimestamp = new Date();
  state.roundsCount = rounds;
  
  // Final render
  const rendered = marked.parse(rawMarkdown);
  state.finalReport = rendered;
  
  const duration = formatDuration(Date.now() - state.analysisStartTime);
  
  // Update divergence display
  updateDivergence(tab, state.divergenceData.consensus, state.divergenceData.disagree);
  
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
  state.analysisLanguage = null;  // 解除语言锁定
  
  if (state.currentAbortController) {
    state.currentAbortController.abort();
    state.currentAbortController = null;
  }
  
  // Reset all tabs
  ['decision', 'blindspot', 'competitor'].forEach(t => {
    updateAnalyzeButton(t, false);
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
  
  // Start SSE via fetch POST
  state.followupInProgress = true;
  updateFollowupButton(tab, true);
  
  let answerBuffer = '';
  let answerEl = null;
  
  // Create placeholder for streaming answer
  const historyContainer = elements.followupHistoryContainers[tab];
  if (historyContainer) {
    const itemDiv = document.createElement('div');
    itemDiv.className = 'followup-item';
    itemDiv.innerHTML = '<div class="followup-question">' + question + '</div><div class="followup-answer"></div>';
    historyContainer.appendChild(itemDiv);
    answerEl = itemDiv.querySelector('.followup-answer');
  }
  
  fetch(API_BASE + '/followup/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: question,
      previous_report: currentReport
    })
  }).then(function(response) {
    if (!response.ok) {
      showError(tab, t('errors.server'));
      state.followupInProgress = false;
      updateFollowupButton(tab, false);
      return;
    }
    
    var reader = response.body.getReader();
    var decoder = new TextDecoder();
    var buffer = '';
    
    function read() {
      reader.read().then(function(result) {
        if (result.done) {
          // Finalize
          state.followupHistory.push({ question: question, answer: answerBuffer });
          if (answerEl) answerEl.innerHTML = marked.parse(answerBuffer);
          state.followupInProgress = false;
          updateFollowupButton(tab, false);
          return;
        }
        buffer += decoder.decode(result.value, { stream: true });
        
        var lines = buffer.split('\n\n');
        buffer = lines.pop();
        
        for (var i = 0; i < lines.length; i++) {
          var block = lines[i].trim();
          if (!block) continue;
          
          var eventType = '';
          var eventData = null;
          var blockLines = block.split('\n');
          for (var j = 0; j < blockLines.length; j++) {
            if (blockLines[j].indexOf('event: ') === 0) {
              eventType = blockLines[j].substring(7).trim();
            } else if (blockLines[j].indexOf('data: ') === 0) {
              try { eventData = JSON.parse(blockLines[j].substring(6)); } catch(e) { eventData = blockLines[j].substring(6); }
            }
          }
          
          if (eventType === 'followup_chunk') {
            var chunk = (typeof eventData === 'object') ? (eventData.chunk || '') : (eventData || '');
            answerBuffer += chunk;
            if (answerEl) answerEl.textContent = answerBuffer;
          } else if (eventType === 'done') {
            state.followupHistory.push({ question: question, answer: answerBuffer });
            if (answerEl) answerEl.innerHTML = marked.parse(answerBuffer);
            state.followupInProgress = false;
            updateFollowupButton(tab, false);
            return;
          }
        }
        
        read();
      });
    }
    read();
  }).catch(function(err) {
    if (err.name !== 'AbortError') {
      showError(tab, t('errors.network'));
    }
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
  const btn = document.querySelector('#report-' + tab + ' .btn-text:first-of-type');
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
    const response = await fetch(API_BASE + '/export/markdown', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report: state.finalReport })
    });
    
    if (response.ok) {
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'deepinsight-report-' + Date.now() + '.md';
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
  const reportContent = document.getElementById('report-content-' + tab);
  if (!reportContent) return;
  
  const opt = {
    margin: [10, 10, 10, 10],
    filename: 'deepinsight-report-' + Date.now() + '.pdf',
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
      if (state.isAnalyzing) {
        // 分析进行中禁止切换语言
        btn.classList.add('shake');
        setTimeout(() => btn.classList.remove('shake'), 500);
        return;
      }
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
  var examplesClickByLang = {
    zh: {
      decision: ['欧盟碳关税对中国制造业的影响分析', '新能源汽车补贴退坡后的市场策略调整', '跨国并购后的文化整合风险评估'],
      blindspot: ['TikTok在美国市场面临的监管风险扫描', '公司供应链韧性的潜在盲区分析', '技术路线选择过程中的认知盲区'],
      competitor: ['比亚迪进入东南亚汽车市场的机会分析', '苹果公司汽车项目的竞争态势评估', '华为智能汽车业务的竞争格局分析']
    },
    en: {
      decision: ['Impact of EU carbon tariff on Chinese manufacturing', 'Market strategy after EV subsidy phase-out', 'Cultural integration risk in cross-border M&A'],
      blindspot: ['Regulatory risks faced by TikTok in US market', 'Supply chain resilience blind spot analysis', 'Cognitive blind spots in technology route selection'],
      competitor: ['BYD opportunities in Southeast Asia auto market', 'Apple car project competitive assessment', 'Huawei smart auto business competitive landscape']
    }
  };
  Object.keys(elements.exampleTags).forEach(tab => {
    elements.exampleTags[tab].forEach((tag, index) => {
      tag.addEventListener('click', () => {
        var examples = examplesClickByLang[state.currentLanguage]?.[tab] || examplesClickByLang.zh[tab];
        fillExample(tab, examples[index]);
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