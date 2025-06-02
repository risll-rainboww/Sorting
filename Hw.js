/*这一部分写的很乱，因为总是删删减减的，建议看说明文档*/

// --- 全局变量和 DOM 元素获取 ------------------------------------------------------------------------------------
let arr = []; // 存储当前用于排序和显示的数组
const treeContainer = document.getElementById('tree-container'); // 树的可视化容器 DIV 元素
const barsContainer = document.getElementById('bars');   // 柱状图的可视化容器 DIV 元素
const descriptionTextElement = document.getElementById('description-text'); // 用于显示算法步骤说明的 P 元素

// 获取控制按钮的 DOM 元素，以便后续操作 (如禁用/启用)
// 确保这些ID与HTML中的ID一致
const initArrayBtn = document.getElementById('initArrayBtn');     // "生成无序数组" 按钮
const startSortBtn = document.getElementById('startSortBtn');     // "开始" 按钮
const pauseBtn = document.getElementById('pauseBtn');         // "暂停/继续" 按钮
const paceSelect = document.getElementById('paceSelect');       // "倍速" 下拉选择框

// 状态标志和配置变量
let isPaused = false;    // 标记当前排序是否处于暂停状态 (true: 已暂停, false: 未暂停/运行中)
let isSorting = false;   // 标记当前是否正在进行排序过程 (true: 正在排序, false: 未开始或已结束)
let pace = 900;        // 动画基础步长/延迟时间 (单位: 毫秒)，影响动画快慢 (HTML中默认值是900)
let treeOffset = { dx: 0, dy: 0 }; // 整个树的拖拽偏移量 (dx: 水平偏移, dy: 垂直偏移)
let nodeOffsets = [];  // 存储每个节点单独的拖拽偏移量数组，数组索引对应节点索引

// --- 文字说明更新函数 ------------------------------------------------------------------------------
/**
 * 更新树形图旁边的说明文字。
 * @param {string} text - 要显示的说明文本。
 */
function updateDescription(text) {
  if (descriptionTextElement) { // 确保说明文本的 DOM 元素存在
    descriptionTextElement.textContent = text; // 设置 P 元素的文本内容
  }
}

// --- 动画效果处理函数 -----------------------------------------------------------------------------------------

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

  let scaleValue = 1.2; // 节点默认放大倍数
  let transformOriginValue = 'center center'; // 节点默认变换原点 (从中心缩放)

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


// --- DOM 更新与渲染函数 --------------------------------------------------------------------------------------------------------

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
      // line 的样式已在 CSS 中通过 'svg line' 选择器设置
      svg.appendChild(line); // 将线添加到SVG元素
    }
  });
  treeContainer.appendChild(svg); // 先将包含所有线的SVG元素添加到DOM (线条在节点下方)

  // 遍历数组，为每个元素创建并显示一个树节点DIV
  arr.forEach((value, i) => {
    const node = document.createElement('div'); // 创建节点DIV
    // 根据是否在 highlight 数组中，决定是否添加 'highlight' 类以高亮显示
    node.className = 'node' + (highlight.includes(i) ? ' highlight' : '');
    const pos = getNodePosition(i); // 获取节点应在的位置
    // 设置节点的left和top样式，同样考虑拖拽偏移
    node.style.left = (pos.left + treeOffset.dx + (nodeOffsets[i]?.dx || 0)) + 'px';
    node.style.top = (pos.top + treeOffset.dy + (nodeOffsets[i]?.dy || 0)) + 'px';
    node.innerText = value; // 在节点上显示其数值

    // 为节点添加鼠标悬停的进入和离开事件监听器
    node.addEventListener('mouseenter', onElementMouseEnter);
    node.addEventListener('mouseleave', onElementMouseLeave);

    // 实现节点的拖拽功能
    let dragging = false, startX, startY, currentDragDx, currentDragDy;
    node.onmousedown = function(e) { // 鼠标在节点上按下时触发
      // 只响应鼠标左键，并且在排序过程中禁止拖拽
      if (e.button !== 0 || isSorting) return;
      dragging = true; //标记开始拖拽
      startX = e.clientX; // 记录鼠标按下时的X坐标
      startY = e.clientY; // 记录鼠标按下时的Y坐标

      // 记录开始拖拽时，节点原有的偏移量
      if (i === 0) { // 如果拖拽的是根节点 (索引0)
        currentDragDx = treeOffset.dx; // 移动整个树的偏移
        currentDragDy = treeOffset.dy;
      } else { // 如果拖拽的是其他节点
        currentDragDx = nodeOffsets[i]?.dx || 0; // 移动该节点自身的偏移
        currentDragDy = nodeOffsets[i]?.dy || 0; // 使用可选链和或运算符确保有默认值0
      }
      node.style.zIndex = 20; // 将被拖拽的节点置于顶层，以免被其他节点遮挡

      document.onmousemove = function(ev) { // 鼠标在文档上移动时触发 (只要拖拽未结束)
        if (!dragging) return; // 如果未处于拖拽状态，则不处理
        let dx = ev.clientX - startX; // 计算鼠标水平移动的距离
        let dy = ev.clientY - startY; // 计算鼠标垂直移动的距离

        // 更新偏移量
        if (i === 0) { // 更新整个树的偏移
          treeOffset.dx = currentDragDx + dx;
          treeOffset.dy = currentDragDy + dy;
        } else { // 更新单个节点的偏移
          nodeOffsets[i].dx = currentDragDx + dx;
          nodeOffsets[i].dy = currentDragDy + dy;
        }
        renderTree(highlight); // 实时重绘整个树以反映拖拽效果
      };
      document.onmouseup = function() { // 鼠标在文档上松开时触发
        dragging = false; // 标记拖拽结束
        node.style.zIndex = 10; // 恢复节点的默认 z-index
        // 清除 document 上的 mousemove 和 mouseup 事件监听器
        document.onmousemove = null;
        document.onmouseup = null;
      };
      e.preventDefault(); // 阻止浏览器默认的拖拽行为 (例如，拖拽图片或选中文本)
    };
    treeContainer.appendChild(node); // 将创建的节点DIV添加到树容器中
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


// --- 数据处理与辅助函数 -------------------------------------------------------------------------------------------------------------

/**
 * 从用户输入框获取数组，如果输入无效或为空，则生成随机数组。
 * @returns {number[]} 处理后的数组。
 */
function getArr() {
  const userInput = document.getElementById('userArray').value.trim(); // 获取输入框内容并去除首尾空格
  if (userInput) { // 如果用户有输入
    // 将用户输入的逗号分隔字符串转换为数字数组
    // 1. split(',') 按逗号分割
    // 2. map(s => parseInt(s.trim())) 将每个子串去除空格后转换为整数
    // 3. filter(n => !isNaN(n)) 过滤掉转换失败的非数字项 (NaN)
    const parsedArray = userInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
    // 如果解析后的数组有效 (长度大于0)，则返回它；否则返回一个默认的随机数组
    return parsedArray.length > 0 ? parsedArray : getDefaultArray();
  }
  // 如果用户未输入任何内容，则直接返回一个默认的随机数组
  return getDefaultArray();
}

/**
 * 生成一个包含10个随机整数的默认数组。
 * 每个随机数在10到99之间 (包含10和99)。
 * @returns {number[]} 默认的随机数组。
 */
function getDefaultArray() {
    // Array.from({ length: 10 }) 创建一个长度为10的空数组 (元素为undefined)
    // 然后对这个数组的每个位置执行回调函数生成随机数
    return Array.from({ length: 10 }, () => Math.floor(Math.random() * 90 + 10));
}

/**
 * 异步延迟函数，用于在动画步骤之间创建停顿，以便用户观察。
 * 此函数会响应全局的 isPaused 状态，如果已暂停，则会在此等待直到取消暂停。
 * @param {number} ms - 需要延迟的毫秒数。
 */
async function sleep(ms) {
  return new Promise(async resolve => { // 返回一个Promise，当延迟结束后解决
    let remaining = ms; // 剩余需要延迟的时间
    while (remaining > 0) { // 只要还有剩余时间
      // 检查是否需要暂停：只有在 isSorting 为 true (正在排序) 且 isPaused 为 true (用户点击了暂停) 时
      if (isPaused && isSorting) {
        await new Promise(r => setTimeout(r, 100)); // 短暂等待100ms，然后重新检查暂停状态
      } else {
        // 如果不需暂停，则执行一小段延迟 (最多10ms)，以保证对暂停状态的快速响应
        const delay = Math.min(remaining, 10);
        await new Promise(r => setTimeout(r, delay));
        remaining -= delay; // 减去已延迟的时间
      }
    }
    resolve(); // 所有延迟完成后，解决Promise
  });
}


// --- 堆排序算法逻辑 (MODIFIED to include updateDescription calls) ---

/**
 * 维护最大堆性质的核心函数 (通常称为 "heapify down" 或 "sift down")。
 * 假设以节点 i 为根的左右子树都已经是最大堆，此函数调整节点 i，
 * 使得以节点 i 为根的整个子树也成为最大堆。
 * @param {number} n - 当前堆的大小 (即数组中参与堆排序部分的长度)。
 * @param {number} i - 当前需要调整的子树的根节点在数组中的索引。
 */
async function heapify(n, i) {
  if (isPaused && isSorting) await sleep(100); // 检查并响应暂停状态
  if (!isSorting) return; // 如果排序过程已被取消 (例如用户点击了"生成新数组")，则提前退出

  let largest = i;          // 假设当前节点 i (根) 是其与子节点中值最大的
  const l = 2 * i + 1;      // 计算左子节点的索引
  const r = 2 * i + 2;      // 计算右子节点的索引

  // 更新步骤说明文字，显示当前正在调整的节点及其子节点信息
  updateDescription(`调整节点 ${i} (值 ${arr[i]}) 使其满足大顶堆性质...\n比较其与子节点: \n左子节点 ${l<n ? l + ' (值 ' + arr[l] + ')' : '无'}\n右子节点 ${r<n ? r + ' (值 ' + arr[r] + ')' : '无'}`);
  // 高亮显示当前节点 i 以及其左右子节点 (如果存在且在堆范围内 n 以内)
  renderTree([i, l < n ? l : -1, r < n ? r : -1].filter(idx => idx !== -1 && idx < n));
  renderBars([i, l < n ? l : -1, r < n ? r : -1].filter(idx => idx !== -1 && idx < n));
  await sleep(pace); // 等待一段时间，以便用户观察高亮和说明
  if (!isSorting) return; // 再次检查排序状态

  // 比较当前节点 i 与其左子节点 l
  if (l < n && arr[l] > arr[largest]) { // 如果左子节点存在 (l < n) 并且其值大于当前 largest 节点的值
    updateDescription(`节点 ${l} (值 ${arr[l]}) > 节点 ${largest} (值 ${arr[largest]}).\n将 ${l} 设为 largest (最大值索引).`);
    largest = l; // 更新 largest 为左子节点的索引
    await sleep(pace/2); // 短暂等待，让用户看到文字更新
  }
  // 比较当前 largest 节点 (可能是 i 或 l) 与其右子节点 r
  if (r < n && arr[r] > arr[largest]) { // 如果右子节点存在 (r < n) 并且其值大于当前 largest 节点的值
    updateDescription(`节点 ${r} (值 ${arr[r]}) > 节点 ${largest} (值 ${arr[largest]}).\n将 ${r} 设为 largest (最大值索引).`);
    largest = r; // 更新 largest 为右子节点的索引
    await sleep(pace/2);
  }
  if (!isSorting) return; // 再次检查排序状态

  // 如果 largest 不是最初的根节点 i (意味着 i 不是最大的，需要调整)
  if (largest !== i) {
    updateDescription(`节点 ${largest} (值 ${arr[largest]}) 是最大的.\n准备交换节点 ${i} (值 ${arr[i]}) 与节点 ${largest} (值 ${arr[largest]}).`);
    renderTree([i, largest]); // 高亮显示即将交换的两个节点
    renderBars([], [i, largest]); // 在柱状图中用特定颜色标记这两个节点
    await sleep(pace / 2);
    if (!isSorting) return;

    await animateNodeSwapVisual(i, largest); // 执行节点交换的视觉动画
    [arr[i], arr[largest]] = [arr[largest], arr[i]]; // 实际交换数组中这两个元素的值

    // 交换后更新显示
    renderTree([i, largest]);
    renderBars([], [i, largest]);
    await sleep(pace / 2);
    if (!isSorting) return;

    // 由于节点 i 的值被换到了 largest 的位置，这个交换可能破坏了以 largest 为根的子树的最大堆性质
    // 因此，需要对这个新的子树 (根在 largest) 递归调用 heapify
    updateDescription(`交换完成. 继续对以新位置 ${largest} (原节点 ${i} 的值) 为根的子树进行 heapify 调整.`);
    await heapify(n, largest);
  } else {
    // 如果 largest 等于 i，说明当前节点 i 就是其与子节点中最大的，无需交换调整
    updateDescription(`节点 ${i} (值 ${arr[i]}) 已是其子树中的最大值，此子树无需调整.`);
    renderTree([i]); // 只高亮当前节点
    renderBars([i]);
    await sleep(pace);
  }
}

/**
 * 构建最大堆。
 * 从数组的最后一个非叶子节点开始，向前逐个调用 heapify，
 * 使得整个数组满足最大堆的性质。
 * 最后一个非叶子节点的索引是 Math.floor(arr.length / 2) - 1。
 */
async function buildMaxHeap() {
  updateDescription("开始构建大顶堆...\n从最后一个非叶子节点开始，向上逐个调整子树。");
  await sleep(pace); // 初始等待
  for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) { // 遍历所有非叶子节点
    if (isPaused && isSorting) await sleep(100); // 响应暂停
    if (!isSorting) return; // 响应排序取消
    updateDescription(`构建大顶堆: 对索引为 ${i} 的节点 (值为 ${arr[i]}) 执行 heapify 操作。`);
    await heapify(arr.length, i); // 对当前非叶子节点为根的子树执行 heapify
    if (!isSorting) return;
  }
  updateDescription("大顶堆构建完成！数组顶端 (索引0) 为当前最大元素。");
  await sleep(pace); // 构建完成后等待
}

/**
 * 执行堆排序的主流程。
 * 1. 构建最大堆。
 * 2. 循环地将堆顶元素（当前最大值）与堆末尾元素交换，
 *    然后缩小堆的范围，并对新的堆顶重新执行 heapify 以维护最大堆性质。
 */
async function heapSort() {
  await buildMaxHeap(); // 首先确保整个数组是一个最大堆
  if (!isSorting) return; // 响应排序取消

  updateDescription("大顶堆已构建完毕. 现在开始排序阶段：\n将堆顶元素与堆的末尾元素交换，然后调整剩余堆。");
  await sleep(pace);
  if (!isSorting) return;

  // 从数组的最后一个元素开始，向前迭代到第二个元素 (索引1)
  // 每次迭代，堆的大小减1 (变量 i 代表当前堆的有效大小，也是待放置已排序元素的位置)
  for (let i = arr.length - 1; i > 0; i--) {
    if (isPaused && isSorting) await sleep(100); // 响应暂停
    if (!isSorting) return;

    // 将堆顶元素 (arr[0]，当前堆中的最大值) 与当前堆的最后一个元素 (arr[i]) 交换
    updateDescription(`排序阶段: 将堆顶元素 (索引 0, 值 ${arr[0]}) 与当前堆的末尾元素 (索引 ${i}, 值 ${arr[i]}) 进行交换.`);
    renderTree([0, i]); // 高亮这两个要交换的节点
    renderBars([], [0, i]); // 在柱状图中标记
    await sleep(pace / 2);
    if (!isSorting) return;

    await animateNodeSwapVisual(0, i); // 执行视觉交换动画
    [arr[0], arr[i]] = [arr[i], arr[0]]; // 实际交换数组元素 (最大值移到末尾)

    // 交换后，元素 arr[i] (原来的堆顶) 已经放到了其最终排序好的位置
    // 接下来需要处理的是从索引 0 到 i-1 的部分，使其恢复最大堆性质
    updateDescription(`交换完成. 元素 ${arr[i]} (原堆顶) 已放置到其最终排序位置 (索引 ${i}).\n现在缩小堆的范围 (从索引 0 到 ${i-1}), 并对新的堆顶 (索引 0, 值 ${arr[0]}) 执行 heapify.`);
    renderTree([0, i]); // 更新显示 (数据已交换)
    renderBars([], [0, i]);
    await sleep(pace / 2);
    if (!isSorting) return;

    await heapify(i, 0); // 对缩小后的堆 (大小为 i，范围是 0 到 i-1) 的根节点 (索引0) 执行 heapify
    if (!isSorting) return;
  }

  // 当循环结束 (i减到0)，所有元素都已放到正确位置，排序完成
  if (isSorting) { // 确保是在排序自然完成的情况下执行这些操作
      updateDescription("堆排序完成！所有元素已按升序排列。");
      renderTree([]); // 清除所有高亮
      renderBars([]);
      playEndSortTitleAnimation(); // 播放标题庆祝动画
      document.getElementById('intro-animation').textContent = '排序完成！'; // 更新页面提示文字
      document.getElementById('intro-animation').style.opacity = '1';
      document.getElementById('intro-animation').style.display = 'block';

      // 重置按钮状态和标志
      if(startSortBtn) startSortBtn.disabled = false; // 启用 "开始" 按钮
      if(initArrayBtn) initArrayBtn.disabled = false; // 启用 "生成无序数组" 按钮
      isSorting = false; // 标记排序结束
      isPaused = true;   // 排序结束后，默认为暂停状态，等待下一次操作
      if(pauseBtn) pauseBtn.textContent = '继续'; // 更新 "暂停/继续" 按钮文本
  }
}


// --- 事件处理与页面初始化 ---

/**
 * 初始化数组和界面显示。
 * 由 "生成无序数组" 按钮点击触发，或在页面加载完成时自动调用。
 */
window.initArray = function () {
  // 确保在 DOMContentLoaded 之后，initArrayBtn 等元素才被使用
  // 或者将按钮获取移到此函数内部（如果它们只在此函数内使用）
  if (isSorting && initArrayBtn && initArrayBtn.disabled) return; // 防止在排序过程中意外调用
  if (isSorting) return; // 如果当前正在排序，则不允许重新初始化数组，防止冲突


  arr = getArr(); // 获取新的数组 (用户输入或随机生成)
  // 重置树和节点的拖拽偏移量
  treeOffset = { dx: 0, dy: 0 };
  nodeOffsets = Array(arr.length).fill(null).map(() => ({ dx: 0, dy: 0 })); // 为新数组长度初始化偏移

  // 重置状态标志和按钮
  isPaused = true; // 生成新数组后，默认为暂停状态
  if(pauseBtn) pauseBtn.textContent = '继续'; // 更新按钮文本
  isSorting = false; // 重置排序状态标志
  if(startSortBtn) startSortBtn.disabled = false; // 启用 "开始" 按钮
  if(initArrayBtn) initArrayBtn.disabled = false; // 确保 "生成数组" 按钮可用
  updateDescription("等待操作..."); // 重置步骤说明面板的文字

  // 更新页面顶部的提示文字
  const introAnimation = document.getElementById('intro-animation');
  if (introAnimation) {
    introAnimation.style.display = 'block';
    introAnimation.style.opacity = '1';
    introAnimation.textContent = '数组已生成。点击“开始”进行排序。';
  }

  // 根据新数组重新渲染树和柱状图
  renderTree();
  renderBars();
}

/**
 * 开始或继续执行堆排序算法。
 * 由 "开始" 按钮点击触发。
 */
window.startHeapSort = async function () {
  if (isSorting) return; // 如果当前已经在排序 (例如用户快速连续点击)，则不执行，防止重复启动

  isSorting = true;  // 设置排序状态标志为 true
  isPaused = false;  // 开始排序时，默认不暂停
  if(startSortBtn) startSortBtn.disabled = true; // 禁用 "开始" 按钮，防止重复点击
  if(initArrayBtn) initArrayBtn.disabled = true; // 在排序过程中禁用 "生成数组" 按钮
  if(pauseBtn) pauseBtn.textContent = '暂停';    // 设置 "暂停/继续" 按钮的文本为 "暂停"
  updateDescription("排序开始..."); // 更新步骤说明

  // 淡出页面顶部的提示文字
  const introAnimation = document.getElementById('intro-animation');
  if (introAnimation) {
    introAnimation.style.opacity = '0';
    await sleep(300); // 等待淡出动画完成
    introAnimation.style.display = 'none'; // 隐藏提示文字
  }


  await playStartSortTitleAnimation(); // 播放标题的开始动画

  await heapSort(); // 调用堆排序的核心算法函数
  // 排序完成后，按钮的重新启用等操作已在 heapSort 函数的末尾或 initArray 函数中处理
}

/**
 * 暂停或继续当前的排序过程。
 * 由 "暂停/继续" 按钮点击触发。
 */
window.pause = function () {
  if (!isSorting) return; // 只有在排序正在进行时，暂停/继续才有意义

  isPaused = !isPaused; // 切换暂停状态标志
  if(pauseBtn) pauseBtn.textContent = isPaused ? '继续' : '暂停'; // 更新按钮文本
  // 根据暂停状态更新步骤说明
  if (isPaused) {
      updateDescription("排序已暂停. 点击“继续”以恢复.");
  } else {
      updateDescription("排序已恢复. 继续执行...");
  }
}

/**
 * 当用户在倍速下拉选择框中选择新的速度时调用此函数。
 * 更新全局的 pace 变量。
 */
window.changePace = function () {
  const newPace = Number(paceSelect.value); // 获取选择框的数值
  // 基础验证：确保获取到的 pace 是一个有效的正数
  if (!isNaN(newPace) && newPace > 0) {
      pace = newPace; // 更新全局 pace 变量
  } else {
      // 如果选择的值无效 (例如不是数字或小于等于0)，则将选择框的值恢复为当前的 pace 值
      if(paceSelect) paceSelect.value = pace.toString();
  }
}

/**
 * 当整个 HTML 文档的 DOM 结构加载并解析完成后执行的初始化操作。
 */
document.addEventListener('DOMContentLoaded', () => {
    // 为页面顶部的 "堆", "排", "序" 字符添加鼠标悬停动画的事件监听
    const titleChars = document.querySelectorAll('.title-char');
    titleChars.forEach(char => {
        char.addEventListener('mouseenter', onElementMouseEnter);
        char.addEventListener('mouseleave', onElementMouseLeave);
    });

    // 为整个柱状图容器 (#bars) 添加鼠标悬停动画的事件监听
    const barsContainerElement = document.getElementById('bars');
    if (barsContainerElement) { // 确保元素存在
        barsContainerElement.addEventListener('mouseenter', onBarsContainerMouseEnter);
        barsContainerElement.addEventListener('mouseleave', onBarsContainerMouseLeave);
    }

    // 确保在initArray调用前，所有按钮元素已经被正确获取
    // （因为initArray内部可能会用到这些按钮，例如重置disabled状态）
    // 如果按钮获取仍在全局作用域，这里不需要额外操作。
    // 但更好的做法是将按钮获取也放在DOMContentLoaded内部，或在使用它们之前获取。
    // 此处假设全局获取的按钮变量已经有效。

    animateTitleCharsLoop(); // 启动标题字符的循环动画
    window.initArray();             // 页面加载时，自动初始化数组和相关的可视化显示
});