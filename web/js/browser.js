/**
 * 文件浏览器模块（图片库浏览）
 * 
 * 功能说明：
 * - 加载 pic/index.json 获取目录结构
 * - 在侧边栏渲染可折叠的文件夹树形导航
 * - 提供文件浏览器页面（面包屑导航 + 网格视图）
 * - 支持点击查看大图（Lightbox）
 * 
 * 核心机制：
 * - 使用 _galleryReady 标志位解决异步时序竞态问题
 * - 双保险机制：即使 notifyReady 在 onGalleryReady 之前执行也能正常工作
 * 
 * 依赖：
 * - CONFIG.picPath (来自 main.js)
 * - allPicData (全局变量，用于传递数据给 home.js)
 * - showPage(), openLightboxImg() (来自 main.js)
 */

/**
 * 根据文件夹名称返回对应的 emoji 图标
 * @param {string} name - 文件夹名称
 * @returns {string} 对应的 emoji 图标
 */
function getFolderEmoji(name) {
    var emojiMap = {
        '常服': '👘', '和服': '👘', 'cosplay': '🎭', 'cos': '🎭',
        '绫波': '💙', '丽': '💜', '明日香': '❤️', '惣流': '💛',
        '孙尚香': '🏹', '尚香': '🏹',
        'lolita': '🎀', '洛丽塔': '🎀', 'jk': '🎓', '制服': '🎓',
        'swim': '🏊', '泳装': '🏊', 'bikini': '👙', '日常': '🌸',
        'casual': '🌸', '可爱': '💕', 'cute': '💕', '萌': '✨'
    };
    
    for (var key in emojiMap) {
        if (name.toLowerCase().includes(key.toLowerCase())) {
            return emojiMap[key];
        }
    }
    return '📁';
}

// 模块级变量
var PIC_BASE = CONFIG.picPath;
var folderTree = [];           // 树形结构（含父节点）
var flatFolders = [];          // 扁平化数组（所有叶子节点）
var _readyCbs = [];            // 待执行的回调队列
var _galleryReady = false;     // 数据就绪标志位（解决时序竞态）

/**
 * 加载图片目录结构
 * 从 pic/index.json 获取数据，构建树形结构并渲染侧边栏
 */
function loadPicStructure() {
    var el = document.getElementById('galleryList');
    if (!el) return;

    // 请求 index.json（添加时间戳防止缓存）
    fetch(PIC_BASE + 'index.json?t=' + Date.now())
        .then(function(r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            return r.json();
        })
        .then(function(data) {
            buildTree(data);
            renderSidebarTree(el);
            notifyReady();
        })
        .catch(function(err) {
            // 加载失败时使用内置默认数据
            var fallbackData = getBuiltinData();
            buildTree(fallbackData);
            renderSidebarTree(el);
            notifyReady();
        });
}

/**
 * 获取内置的默认数据（当 index.json 加载失败时的降级方案）
 * @returns {Object} 默认的目录结构数据
 */
function getBuiltinData() {
    return { 
        folders: [
            { name: '常服', path: '常服', files: ['1.jpg','2.jpg','3.jpg'] },
            { name: 'Cosplay / 绫波丽', path: 'cos/绫波丽', files: ['1.jpg','2.jpg','3.jpg','4.png','5.jpg','6.jpg'] }
        ] 
    };
}

/**
 * 构建树形数据结构
 * 将扁平的 folders 数组转换为树形结构，区分父节点和叶子节点
 * @param {Object} data - 包含 folders 数组的原始数据
 */
function buildTree(data) {
    folderTree = [];
    flatFolders = [];
    
    if (!data || !data.folders) return;

    var leaves = [];   // 叶子节点（顶层文件夹）
    var parents = [];  // 父节点（如 Cosplay 分组）

    data.folders.forEach(function(f) {
        f.count = f.files ? f.files.length : 0;
        
        if (f.path.includes('/')) {
            // 嵌套路径（如 cos/绫波丽）→ 归入 flatFolders
            flatFolders.push(f);
        } else {
            // 顶层路径 → 归入 leaves
            leaves.push(f);
        }
    });

    // 将顶层文件夹同时加入 tree 和 flatFolders
    leaves.forEach(function(l) { 
        folderTree.push(l); 
        flatFolders.push(l); 
    });

    // 将 cos/ 开头的文件夹归入 Cosplay 父分组
    var cosKids = flatFolders.filter(function(f) { 
        return f.path.startsWith('cos/'); 
    });
    
    if (cosKids.length > 0) {
        parents.push({
            name: 'Cosplay', 
            path: 'cos',
            children: cosKids, 
            childCount: cosKids.length,
            files: [], 
            count: cosKids.reduce(function(sum, c) { 
                return sum + (c.count || 0); 
            }, 0)
        });
    }

    // 将父节点加入树
    parents.forEach(function(p) { 
        folderTree.push(p); 
    });
}

/**
 * 渲染侧边栏的文件夹树形列表
 * @param {HTMLElement} container - 容器元素
 */
function renderSidebarTree(container) {
    container.innerHTML = '';
    
    if (!folderTree.length) {
        container.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">未找到图片</p>';
        return;
    }

    folderTree.forEach(function(n) {
        if (n.children && n.children.length) {
            renderParentItem(container, n);   // 渲染父节点（可折叠）
        } else {
            renderLeafItem(container, n);      // 渲染叶子节点
        }
    });
}

/**
 * 渲染父级折叠项（如 Cosplay 分组）
 * @param {HTMLElement} container - 容器元素
 * @param {Object} node - 节点数据（包含 children 数组）
 */
function renderParentItem(container, node) {
    var wrap = document.createElement('div');
    wrap.className = 'sidebar-group';

    // 折叠按钮
    var btn = document.createElement('button');
    btn.className = 'section-toggle open';
    btn.innerHTML = '<span class="group-name"><span class="file-icon">' + getFolderEmoji(node.name) + '</span>' + node.name + '</span><span class="arrow">▶</span><span class="child-badge">' + node.childCount + '个角色</span>';

    // 子项列表容器
    var list = document.createElement('div');
    list.className = 'project-list open';
    
    node.children.forEach(function(child) {
        var it = document.createElement('div');
        it.className = 'file-item';
        it.onclick = function() { navigateTo(child.path, child.name); };
        it.innerHTML = '<span class="file-icon">' + getFolderEmoji(child.name) + '</span><span class="file-name">' + child.name + '</span><span class="file-count">' + child.count + '张</span>';
        list.appendChild(it);
    });

    // 折叠/展开交互
    btn.onclick = function() { 
        btn.classList.toggle('open'); 
        list.classList.toggle('open'); 
    };
    
    wrap.appendChild(btn);
    wrap.appendChild(list);
    container.appendChild(wrap);
}

/**
 * 渲染叶子项（单个文件夹）
 * @param {HTMLElement} container - 容器元素
 * @param {Object} node - 文件夹节点数据
 */
function renderLeafItem(container, node) {
    var it = document.createElement('div');
    it.className = 'file-item';
    it.onclick = function() { navigateTo(node.path, node.name); };
    it.innerHTML = '<span class="file-icon">' + getFolderEmoji(node.name) + '</span><span class="file-name">' + node.name + '</span><span class="file-count">' + node.count + '张</span>';
    container.appendChild(it);
}

/**
 * 注册数据就绪回调（双保险机制）
 * 解决异步加载时序问题：即使 notifyReady 先于本函数执行也能正常工作
 * 
 * 工作原理：
 * - 如果数据已就绪（flatFolders 有内容 或 _galleryReady=true）→ 立即执行回调
 * - 否则 → 加入等待队列，待 notifyReady 时统一触发
 * 
 * @param {Function} cb - 数据就绪后要执行的回调函数
 * @returns {boolean} 是否立即执行了回调
 */
function onGalleryReady(cb) {
    // 双保险条件：数据已加载 OR 已经通知过就绪
    if (flatFolders.length > 0 || _galleryReady) {
        cb();
        return true;
    } else {
        _readyCbs.push(cb);
        return false;
    }
}

/**
 * 通知数据已就绪
 * 将 flatFolders 赋值给全局 allPicData，并触发所有等待的回调
 * 设置 _galleryReady 标志位以确保后续注册的回调能立即执行
 */
function notifyReady() {
    // 赋值全局变量供 home.js 使用
    allPicData.folders = flatFolders;
    
    // 设置标志位（关键！解决时序竞态）
    _galleryReady = true;

    // 执行所有已注册的回调
    _readyCbs.forEach(function(cb) {
        try {
            cb();
        } catch (e) {
            console.error('[Browser] 回调执行失败:', e);
        }
    });

    // 清空队列
    _readyCbs = [];
}

// ====== 文件浏览器页面相关 ======

var browserCurrentPath = '';   // 当前浏览的路径
var browserCurrentName = '';   // 当前显示的名称

/**
 * 导航到指定路径
 * @param {string} path - 目标路径（空字符串表示根目录）
 * @param {string} name - 显示名称
 */
function navigateTo(path, name) {
    browserCurrentPath = path === 'root' ? '' : path;
    browserCurrentName = name === 'root' ? '' : name;
    showPage('browser');
    renderFileBrowser();
}

/**
 * 更新面包屑导航
 */
function updateBreadcrumb() {
    var bc = document.getElementById('breadcrumb');
    if (!bc) return;
    
    var html = '<a href="#" onclick="navigateTo(\'root\',\'\');return false;">📁 pic</a>';
    
    if (browserCurrentPath) {
        var displayName = browserCurrentName || browserCurrentPath.split('/').pop();
        html += '<span class="sep">›</span><span class="current">' + displayName + '</span>';
    }
    
    bc.innerHTML = html;
}

/**
 * 渲染文件浏览器页面
 * 根据当前路径显示文件夹网格或图片网格
 */
function renderFileBrowser() {
    updateBreadcrumb();
    
    var grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!browserCurrentPath) {
        // 根目录：显示所有文件夹
        flatFolders.forEach(function(f) {
            var c = document.createElement('div');
            c.className = 'folder-card';
            c.onclick = function() { navigateTo(f.path, f.name); };
            c.innerHTML = '<span class="folder-emoji">' + getFolderEmoji(f.name) + '</span><div class="folder-name">' + f.name + '</div><div class="folder-count">' + f.count + '张图片</div>';
            grid.appendChild(c);
        });
    } else {
        // 子目录：显示该文件夹下的所有图片
        var folder = flatFolders.find(function(x) { return x.path === browserCurrentPath; });
        
        if (folder && folder.files && folder.files.length) {
            folder.files.forEach(function(fn) {
                var c = document.createElement('div');
                c.className = 'img-card';
                c.onclick = function(e) { 
                    e.stopPropagation(); 
                    openLightboxImg(PIC_BASE + browserCurrentPath + '/' + fn, browserCurrentName + '/' + fn);
                };
                c.innerHTML = '<img src="' + PIC_BASE + browserCurrentPath + '/' + fn + '" alt="' + fn + '" loading="lazy"><div class="img-name">' + fn + '</div>';
                grid.appendChild(c);
            });
        } else {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无内容</p>';
        }
    }
}

// 页面加载时初始化图片库结构
loadPicStructure();
