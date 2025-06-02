// Hw.js - 整理版 (大量中文注释)

// --- 全局变量和 DOM 元素获取 ---
let arr = []; // 存储当前用于排序和显示的数组
const treeContainer = document.getElementById('tree-container'); // 树的可视化容器 DIV 元素
const barsContainer = document.getElementById('bars');   // 柱状图的可视化容器 DIV 元素
const descriptionTextElement = document.getElementById('description-text'); // 用于显示算法步骤说明的 P 元素

// 获取控制按钮的 DOM 元素，以便后续操作 (如禁用/启用)
const initArrayBtn = document.getElementById('initArrayBtn');     // "生成无序数组" 按钮
const startSortBtn = document.getElementById('startSortBtn');     // "开始" 按钮
const pauseBtn = document.getElementById('pauseBtn');         // "暂停/继续" 按钮
const paceSelect = document.getElementById('paceSelect');       // "倍速" 下拉选择框

// 状态标志和配置变量
let isPaused = false;    // 标记当前排序是否处于暂停状态 (true: 已暂停, false: 未暂停/运行中)
let isSorting = false;   // 标记当前是否正在进行排序过程 (true: 正在排序, false: 未开始或已结束)
let pace = 600;        // 动画基础步长/延迟时间 (单位: 毫秒)，影响动画快慢
let treeOffset = { dx: 0, dy: 0 }; // 整个树的拖拽偏移量 (dx: 水平偏移, dy: 垂直偏移)
let nodeOffsets = [];  // 存储每个节点单独的拖拽偏移量数组，数组索引对应节点索引

// --- 文字说明更新函数 ---
/**
 * 更新树形图旁边的说明文字。
 * @param {string} text - 要显示的说明文本。
 */
function updateDescription(text) {
  if (descriptionTextElement) { // 确保说明文本的 DOM 元素存在
    descriptionTextElement.textContent = text; // 设置 P 元素的文本内容
  }
}

// --- 动画效果处理函数 ---

/**
 * 鼠标进入元素时的动画效果 (通用处理函数)。
 * 应用于树节点 (.node), 单个柱子 (.bar), 以及标题字符 (.title-char)。
 */
function onElementMouseEnter() {
  // 可选：如果正在排序中，并且鼠标悬停的不是标题字符，则可以禁用节点和柱子的悬停动画，以避免视觉干扰。
  // if (isSorting && !this.classList.contains('title-char')) {
  //   return; // 直接返回，不执行动画
  // }
  anime.remove(this); // 移除该元素 (this 指向触发事件的元素) 上任何正在进行的旧 Anime.js 动画实例

  let scaleValue = 1.2; // 默认放大倍数 (主要用于节点)
  let transformOriginValue = 'center center'; // 默认变换原点 (从中心缩放)

  if (this.classList.contains('bar')) { // 如果悬停的是单个柱子 (.bar)
    // 为柱子应用特定的进入动画
    anime({
      targets: this, // 动画目标是当前柱子
      scaleY: 1.2, // Y轴 (高度) 放大 1.2 倍
      scaleX: 1.05,// X轴 (宽度) 轻微放大 1.05 倍
      transformOrigin: 'bottom center', // 从底部中心开始缩放 (保持底部对齐)
      duration: 300, // 动画持续时间 300ms
      easing: 'easeOutElastic(1, .7)' // 使用弹性缓动效果 (参数1: 幅度, 参数0.7: 周期)
    });
    return; // 重要：处理完柱子动画后直接返回，不执行下面的通用动画逻辑
  } else if (this.classList.contains('title-char')) { // 如果悬停的是标题字符 (.title-char)
    scaleValue = 1.3; // 设置标题字符的放大倍数
  } else if (this.classList.contains('node')) { // 如果悬停的是树节点 (.node)
    scaleValue = 1.15; // 设置树节点的放大倍数
  }

  // 为节点和标题字符应用通用的放大动画
  // (由于上面对 .bar 的处理有 return, 这段代码不会对 .bar 生效)
  anime({
    targets: this,
    scale: scaleValue, // 应用计算好的放大倍数 (对节点或标题字符是统一缩放)
    transformOrigin: transformOriginValue, // 应用变换原点 (通常是 'center center')
    duration: 200, // 动画持续时间 200ms
    easing: 'easeOutSine' // 使用 easeOutSine 缓动效果
  });
}

/**
 * 鼠标离开元素时的动画效果 (通用处理函数)。
 * 使元素恢复到原始大小。
 */
function onElementMouseLeave() {
  anime.remove(this); // 移除该元素上任何正在进行的旧 Anime.js 动画实例

  if (this.classList.contains('bar')) { // 如果鼠标离开的是单个柱子 (.bar)
    // 为柱子应用特定的恢复动画
    anime({
      targets: this,
      scaleY: 1, // Y轴恢复到原始大小 (1倍)
      scaleX: 1, // X轴恢复到原始大小 (1倍)
      transformOrigin: 'bottom center', // 从底部中心恢复
      duration: 400, // 动画持续时间 400ms
      easing: 'easeOutSine' // 使用 easeOutSine 缓动效果
    });
    return; // 重要：处理完柱子动画后直接返回
  }

  // 为节点和标题字符应用通用的恢复动画
  // (由于上面对 .bar 的处理有 return, 这段代码不会对 .bar 生效)
  anime({
    targets: this,
    scale: 1, // 恢复到原始大小 (1倍)
    transformOrigin: 'center center', // 节点和标题字符从中心恢复
    duration: 400, // 动画持续时间 400ms
    easing: 'easeOutSine'
  });
}

/**
 * 鼠标进入整个柱状图容器 (#bars) 时的动画效果。
 */
function onBarsContainerMouseEnter() {
    if (isSorting) return; // 如果正在排序，则不缩放容器，避免干扰
    anime.remove(this); // 'this' 指向 #bars 容器 DIV 元素
    anime({
        targets: this, // 动画目标是 #bars 容器
        scale: 1.03, // 容器整体轻微放大 3%
        duration: 250,
        easing: 'easeOutSine'
    });
}

/**
 * 鼠标离开整个柱状图容器 (#bars) 时的动画效果。
 */
function onBarsContainerMouseLeave() {
    anime.remove(this); // 'this' 指向 #bars 容器 DIV 元素
    anime({
        targets: this,
        scale: 1, // 容器整体恢复到原始大小
        duration: 500,
        easing: 'easeOutSine'
    });
}

/**
 * 页面加载时，标题 "堆排序" 的各个字符的循环动画。
 */
function animateTitleCharsLoop() {
  anime({
    targets: '.title-char', // 动画目标是所有 class 为 'title-char' 的 span 元素
    translateY: [ // Y轴平移动画，包含两个关键帧
      { value: '-2.75rem', duration: 600, easing: 'easeOutExpo' }, // 向上移动
      { value: '0rem',  duration: 800, easing: 'easeOutBounce', delay: 100 } // 向下弹回原位
    ],
    rotate: ['-1turn', '0turn'], // 旋转动画，从 -1圈 到 0圈
    delay: anime.stagger(100), // 对每个目标元素应用交错延迟，每个延迟100ms
    easing: 'easeInOutCirc', // 全局缓动函数 (如果关键帧内没有指定)
    loop: true, // 无限循环动画
    endDelay: 1000 // 每轮动画完整结束后，延迟 1000ms 再开始下一轮
  });
}

/**
 * 排序全部完成时，主标题 "H2" 整体播放的庆祝动画。
 */
function playEndSortTitleAnimation() {
  anime({
    targets: 'h2', // 动画目标是包含 "堆排序" 的 h2 元素
    scale: [ // 缩放动画，包含两个关键帧
      { value: 1.2, duration: 400, easing: 'easeOutExpo' }, // 放大
      { value: 1, duration: 600, easing: 'easeOutBounce' }    // 缩小弹回原大小
    ],
    rotate: { // 旋转属性的特定动画配置
      value: '1turn', // 旋转一整圈
      duration: 1000,
      easing: 'easeInOutCirc'
    }
  });
}

/**
 * 开始排序时，主标题 "H2" 整体播放的提示动画 (异步函数)。
 */
async function playStartSortTitleAnimation() {
  // 等待动画完成，使用了 .finished Promise (Anime.js v3+)
  await anime({
    targets: 'h2',
    scale: [ { value: 1.1, duration: 300, easing: 'easeOutExpo' }, { value: 1, duration: 400, easing: 'easeOutBounce' } ],
    easing: 'easeInOutQuad'
  }).finished;
}

/**
 * 节点在树中进行交换时的平移动画 (异步函数)。
 * @param {number} i - 第一个参与交换的节点的当前数组索引。
 * @param {number} j - 第二个参与交换的节点的当前数组索引。
 */
async function animateNodeSwapVisual(i, j) {
  const nodes = Array.from(treeContainer.querySelectorAll('.node')); // 获取当前DOM中所有的节点元素
  const nodeA = nodes[i]; // 根据索引获取第一个节点DOM对象
  const nodeB = nodes[j]; // 根据索引获取第二个节点DOM对象

  if (!nodeA || !nodeB) { // 如果找不到节点 (理论上不应发生，除非索引错误)
      console.warn(`动画交换：未找到节点，索引 ${i}, ${j}`);
      return; // 提前退出
  }

  // 获取节点A和B以及它们父容器treeContainer的边界信息 (位置和尺寸)
  const rectA = nodeA.getBoundingClientRect();
  const rectB = nodeB.getBoundingClientRect();
  const treeContainerRect = treeContainer.getBoundingClientRect();

  // 计算节点A要移动到节点B位置所需的相对平移距离 (dx, dy)
  // 这是相对于 treeContainer 的相对位置差
  const dx = (rectB.left - treeContainerRect.left) - (rectA.left - treeContainerRect.left);
  const dy = (rectB.top - treeContainerRect.top) - (rectA.top - treeContainerRect.top);

  // 保存节点A和B在动画开始前的原始 transform 样式值
  // 动画结束后需要恢复，以便 renderTree 函数能根据最新的 arr 数组正确重新定位节点
  const originalTransformA = nodeA.style.transform;
  const originalTransformB = nodeB.style.transform;

  // 创建并执行节点A和B的平移动画
  // 节点A移动 (dx, dy)，节点B反向移动 (-dx, -dy)
  const animA = anime({ targets: nodeA, translateX: dx, translateY: dy, duration: pace, easing: 'easeInOutQuad' });
  const animB = anime({ targets: nodeB, translateX: -dx, translateY: -dy, duration: pace, easing: 'easeInOutQuad' });

  await Promise.all([animA.finished, animB.finished]); // 等待两个动画都播放完成

  // 动画完成后，重置节点的 transform 样式为空字符串或其原始值
  // 这样，下一次 renderTree 调用时，节点会根据其在 arr 中的新位置被正确绘制，而不是停留在动画结束时的视觉位置
  nodeA.style.transform = originalTransformA || '';
  nodeB.style.transform = originalTransformB || '';
}


// --- DOM 更新与渲染函数 ---

/**
 * 根据节点在数组中的索引计算其在树形可视化容器中的像素位置。
 * @param {number} index - 节点的数组索引 (从0开始)。
 * @returns {object} 包含 left 和 top 像素值的对象。
 */
function getNodePosition(index) {
  const level = Math.floor(Math.log2(index + 1));       // 节点所在层级 (根节点在第0层)
  const maxNodesAtLevel = 2 ** level;                   // 当前层级理论上最多可以有多少个节点
  const posInLevel = index - (maxNodesAtLevel - 1);     // 节点在其所在层级的位置 (从左到右，0开始计数)

  const containerWidth = treeContainer.clientWidth || 600; // 获取树容器的当前宽度，若获取不到则用默认值600
  const nodeSpace = containerWidth / (maxNodesAtLevel + 1); // 计算当前层级每个节点可占据的平均水平空间
  const nodeWidth = 38; // 节点的宽度 (应与CSS中.node的width一致)

  // 计算节点的left (水平) 和 top (垂直) 坐标
  const left = nodeSpace * (posInLevel + 1) - (nodeWidth / 2); // 水平居中放置
  const top = 40 + level * 70; // 垂直位置，40是顶边距，每层增加70px的间距
  return { left, top };
}

/**
 * 渲染二叉堆树的可视化表示。
 * 会清空并重新绘制整个树结构，包括节点和连接线。
 * @param {number[]} [highlight=[]] - 一个数组，包含需要高亮显示的节点的索引。
 */
function renderTree(highlight = []) {
  treeContainer.innerHTML = ''; // 清空 treeContainer 内所有旧的DOM元素
  if (arr.length === 0) return; // 如果当前数组为空，则不执行渲染

  // 创建SVG元素用于绘制连接线
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '100%'); // SVG宽度占满容器
  svg.setAttribute('height', '100%'); // SVG高度占满容器

  // 遍历数组，为每个非根节点绘制连接到其父节点的线
  arr.forEach((_, i) => { // 第一个参数 (value) 未使用，用 _ 表示
    if (i === 0) return; // 根节点 (索引0) 没有父节点，不画线
    const parentIndex = Math.floor((i - 1) / 2); // 计算当前节点的父节点索引
    if (parentIndex >= 0 && parentIndex < arr.length) { // 确保父节点索引有效
      const fromPos = getNodePosition(parentIndex); // 获取父节点的位置
      const toPos = getNodePosition(i);             // 获取当前节点的位置
      const nodeSize = 38; // 节点直径 (应与CSS中.node的width/height一致)

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line'); // 创建SVG line元素
      // 设置线的起点 (父节点中心) 和终点 (当前节点中心)
      // 坐标计算时需要考虑整个树的拖拽偏移 (treeOffset) 和单个节点的拖拽偏移 (nodeOffsets)
      line.setAttribute('x1', fromPos.left + nodeSize / 2 + treeOffset.dx + (nodeOffsets[parentIndex]?.dx || 0));
      line.setAttribute('y1', fromPos.top + nodeSize / 2 + treeOffset.dy + (nodeOffsets[parentIndex]?.dy || 0));
      line.setAttribute('x2', toPos.left + nodeSize / 2 + treeOffset.dx + (nodeOffsets[i]?.dx || 0));
      line.setAttribute('y2', toPos.top + nodeSize / 2 + treeOffset.dy + (nodeOffsets[i]?.dy || 0));
      // line 的 stroke 和 stroke-width 等样式已在 CSS 文件中通过 'svg line' 选择器定义
      svg.appendChild(line); // 将线添加到SVG元素
    }
  });
  treeContainer.appendChild(svg); // 先将包含所有线的SVG元素添加到DOM (线条在节点下方)

  // 遍历数组，为每个元素创建并显示一个树节点DIV
  arr.forEach((value, i) => {
    const node = document.createElement('div');
    node.className = 'node' + (highlight.includes(i) ? ' highlight' : '');
    const pos = getNodePosition(i);
    // 保证 nodeOffsets[i] 有值
    if (!nodeOffsets[i]) nodeOffsets[i] = { dx: 0, dy: 0 };
    node.style.left = (pos.left + treeOffset.dx + nodeOffsets[i].dx) + 'px';
    node.style.top = (pos.top + treeOffset.dy + nodeOffsets[i].dy) + 'px';
    node.innerText = value;

    // 悬停动画
    node.addEventListener('mouseenter', onElementMouseEnter);
    node.addEventListener('mouseleave', onElementMouseLeave);

    // 拖拽逻辑
    let dragging = false, startX, startY, currentDragDx, currentDragDy;
    node.onmousedown = function(e) {
      if (e.button !== 0 || isSorting) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      if (i === 0) {
        currentDragDx = treeOffset.dx;
        currentDragDy = treeOffset.dy;
      } else {
        currentDragDx = nodeOffsets[i].dx;
        currentDragDy = nodeOffsets[i].dy;
      }
      node.style.zIndex = 20;
      document.onmousemove = function(ev) {
        if (!dragging) return;
        let dx = ev.clientX - startX;
        let dy = ev.clientY - startY;
        if (i === 0) {
          treeOffset.dx = currentDragDx + dx;
          treeOffset.dy = currentDragDy + dy;
        } else {
          nodeOffsets[i].dx = currentDragDx + dx;
          nodeOffsets[i].dy = currentDragDy + dy;
        }
        renderTree(highlight);
      };
      document.onmouseup = function() {
        dragging = false;
        node.style.zIndex = 10;
        document.onmousemove = null;
        document.onmouseup = null;
      };
      e.preventDefault();
    };
    treeContainer.appendChild(node);
  });
}

/**
 * 渲染数组的柱状图表示。
 * 会清空并重新绘制所有柱子。
 * @param {number[]} [active=[]] - 一个数组，包含需要标记为 "active" (活动) 状态的柱子的索引。
 * @param {number[]} [swap=[]] - 一个数组，包含需要标记为 "swap" (交换) 状态的柱子的索引。
 */
function renderBars(active = [], swap = []) {
  barsContainer.innerHTML = ''; // 清空柱状图容器内所有旧的DOM元素
  if (arr.length === 0) return; // 如果当前数组为空，则不执行渲染

  // 遍历数组，为每个元素创建柱子相关的DOM结构
  arr.forEach((value, i) => {
    const wrap = document.createElement('div'); // 每个柱子的外部包装器，用于包含索引和柱子本身
    wrap.className = 'bar-wrap'; // 应用CSS类

    const idx = document.createElement('div'); // 用于显示柱子对应数组索引的DIV
    idx.className = 'bar-index'; // 应用CSS类
    idx.innerText = i; // 设置索引文本

    const bar = document.createElement('div'); // 代表实际柱子的DIV
    bar.className = 'bar'; // 应用CSS类
    // 根据是否在 swap 或 active 数组中，决定是否添加相应的状态类
    if (swap.includes(i)) bar.classList.add('swap');
    else if (active.includes(i)) bar.classList.add('active');

    // 计算柱子的高度，基于数组元素的值，并设置最小高度为5px
    const barHeight = Math.max(5, (Number(value) || 0) * 2);
    bar.style.height = barHeight + 'px'; // 设置柱子高度
    bar.innerText = value; // 在柱子内部显示其代表的数值

    // 为每个柱子添加鼠标悬停的进入和离开事件监听器
    bar.addEventListener('mouseenter', onElementMouseEnter);
    bar.addEventListener('mouseleave', onElementMouseLeave);

    wrap.appendChild(idx); // 将索引DIV添加到包装器
    wrap.appendChild(bar);  // 将柱子DIV添加到包装器
    barsContainer.appendChild(wrap); // 将整个柱子包装器添加到柱状图容器
  });
}

