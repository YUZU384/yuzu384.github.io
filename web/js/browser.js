// ========== 文件夹 emoji 映射 ==========
function getFolderEmoji(name) {
    const map = {
        '常服': '👘', '和服': '👘', 'kimono': '👘',
        'cosplay': '🎭', 'cos': '🎭', '绫波': '💙', '丽': '💜',
        '明日香': '❤️', '惣流': '💛', '明日': '🧡',
        '孙尚香': '🏹', '尚香': '🏹', '弓箭': '🏹',
        'lolita': '🎀', '洛丽塔': '🎀', 'jk': '🎓', '制服': '🎓',
        'swim': '🏊', '泳装': '🏊', 'bikini': '👙', '日常': '🌸',
        'casual': '🌸', '可爱': '💕', 'cute': '💕', '萌': '✨'
    };
    for (const [key, emoji] of Object.entries(map)) {
        if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return '📁';
}

// ========== 配置 ==========
const PIC_BASE = CONFIG.picPath;

let folderTree = [];
let flatFolders = [];

// ========== 加载图片目录结构（三种模式自动切换）==========
async function loadPicStructure() {
    const galleryListEl = document.getElementById('galleryList');
    if (!galleryListEl) return;

    galleryListEl.innerHTML = '<div class="loading">正在加载目录...</div>';

    try {
        let data = null;

        // 模式1: 从 pic/index.json 清单加载（最可靠，推荐）
        data = await loadFromIndexJSON();

        // 模式2: 如果 JSON 失败，尝试 GitHub Contents API
        if (!data) {
            console.log('[pic] index.json 未找到，尝试 GitHub API...');
            data = await loadFromGitHubAPI();
        }

        // 模式3: 都失败，用硬编码兜底
        if (!data) {
            console.log('[pic] GitHub API 也失败，使用内置数据');
            data = getBuiltinData();
        }

        // 构建树形结构 + 扁平列表
        buildTree(data);

        // 渲染侧栏
        renderSidebarTree(galleryListEl);

        // 通知主页画廊
        notifyGalleryReady();

        console.log('[pic] ✅ 加载完成:', flatFolders.length, '个文件夹,', flatFolders.reduce((s, f) => s + f.count, 0), '张图片');

    } catch (error) {
        console.error('[pic] ❌ 加载失败:', error);
        galleryListEl.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">加载失败</p>';
        notifyGalleryReady();
    }
}

// --- 模式1: 从 index.json 加载 ---
async function loadFromIndexJSON() {
    try {
        const resp = await fetch(`${PIC_BASE}index.json?t=${Date.now()}`);
        if (!resp.ok) return null;
        const json = await resp.json();
        console.log('[pic] ✅ 从 index.json 加载成功');
        return json;
    } catch (e) {
        return null;
    }
}

// --- 模式2: 从 GitHub Contents API 加载 ---
async function loadFromGitHubAPI() {
    try {
        const owner = CONFIG.githubUser;
        const repo = owner; // 假设仓库名和用户名相同

        const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/pic`);
        if (!resp.ok) return null;

        const items = await resp.json();
        if (!Array.isArray(items)) return null;

        const result = { folders: [] };

        for (const item of items) {
            if (item.type === 'dir') {
                const subItems = await fetchDirContents(owner, repo, `pic/${item.name}`);
                const images = subItems
                    .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
                    .map(f => f.name);

                if (images.length > 0) {
                    result.folders.push({
                        name: item.name,
                        path: item.name,
                        files: images,
                        count: images.length
                    });
                }

                // 如果子目录里还有文件夹（如 cos/绫波丽），递归处理
                const subDirs = subItems.filter(f => f.type === 'dir');
                for (const dir of subDirs) {
                    const deepImages = await fetchDirContents(owner, repo, `pic/${item.name}/${dir.name}`);
                    const imgFiles = deepImages
                        .filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name))
                        .map(f => f.name);

                    if (imgFiles.length > 0) {
                        result.folders.push({
                            name: `${item.name} / ${dir.name}`,
                            path: `${item.name}/${dir.name}`,
                            files: imgFiles,
                            count: imgFiles.length
                        });
                    }
                }
            }
        }

        console.log('[pic] ✅ 从 GitHub API 加载成功');
        return result;
    } catch (e) {
        return null;
    }
}

async function fetchDirContents(owner, repo, path) {
    try {
        const resp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
        if (!resp.ok) return [];
        return await resp.json();
    } catch (e) {
        return [];
    }
}

// --- 模式3: 内置兜底数据 ---
function getBuiltinData() {
    return {
        folders: [
            { name: '常服', path: '常服', files: ['1.jpg', '2.jpg', '3.jpg'] },
            { name: 'Cosplay / 绫波丽', path: 'cos/绫波丽', files: ['1.jpg', '2.jpg', '3.jpg', '4.png', '5.jpg', '6.jpg'] },
            { name: 'Cosplay / 孙尚香', path: 'cos/孙尚香', files: ['ef67a31912e690eae07ece047802fc0a1.png'] }
        ]
    };
}

// ========== 构建树形结构 ==========
function buildTree(data) {
    folderTree = [];
    flatFolders = [];

    if (!data || !data.folders) return;

    // 按 path 的第一段分组（常服 vs cos/xxx）
    const groups = {};

    data.folders.forEach(folder => {
        const topDir = folder.path.split('/')[0];

        if (!groups[topDir]) {
            groups[topDir] = { name: topDir, path: topDir, children: [] };
        }

        if (folder.path.includes('/')) {
            groups[topDir].children.push(folder);
        } else {
            groups[topDir].children.unshift(folder); // 叶子放前面
        }
    });

    Object.values(groups).forEach(group => {
        if (group.children.length === 1 && !group.children[0].path.includes('/')) {
            // 只有一个叶子节点 → 直接作为叶子
            const leaf = group.children[0];
            folderTree.push(leaf);
            flatFolders.push(leaf);
        } else {
            // 有多个子节点 → 作为父级折叠
            const children = group.children.filter(c => c.path.includes('/'));
            const leaves = group.children.filter(c => !c.path.includes('/'));

            const parentNode = {
                name: group.name === 'cos' ? 'Cosplay' : group.name,
                path: group.path,
                children: children,
                childCount: children.length,
                files: leaves.length > 0 ? leaves[0].files : [],
                count: leaves.length > 0 ? leaves[0].count : 0
            };

            folderTree.push(parentNode);
            children.forEach(c => flatFolders.push(c));
            leaves.forEach(l => flatFolders.push(l));
        }
    });
}

// ========== 渲染侧栏 ==========
function renderSidebarTree(container) {
    container.innerHTML = '';

    if (folderTree.length === 0) {
        container.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">未找到图片</p>';
        return;
    }

    folderTree.forEach(node => {
        if (node.children && node.children.length > 0) {
            renderParentItem(container, node);
        } else {
            renderLeafItem(container, node);
        }
    });
}

function renderParentItem(container, node) {
    const wrapper = document.createElement('div');
    wrapper.className = 'sidebar-group';

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'section-toggle open';
    toggleBtn.innerHTML = `
        <span class="group-name">
            <span class="file-icon">${getFolderEmoji(node.name)}</span>
            ${node.name}
        </span>
        <span class="arrow">▶</span>
        <span class="child-badge">${node.childCount} 个角色</span>
    `;

    const childList = document.createElement('div');
    childList.className = 'project-list open';

    node.children.forEach(child => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.onclick = () => navigateTo(child.path, child.name);
        item.innerHTML = `
            <span class="file-icon">${getFolderEmoji(child.name)}</span>
            <span class="file-name">${child.name}</span>
            <span class="file-count">${child.count} 张</span>
        `;
        childList.appendChild(item);
    });

    toggleBtn.onclick = () => {
        toggleBtn.classList.toggle('open');
        childList.classList.toggle('open');
    };

    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(childList);
    container.appendChild(wrapper);
}

function renderLeafItem(container, node) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.onclick = () => navigateTo(node.path, node.name);
    item.innerHTML = `
        <span class="file-icon">${getFolderEmoji(node.name)}</span>
        <span class="file-name">${node.name}</span>
        <span class="file-count">${node.count} 张</span>
    `;
    container.appendChild(item);
}

// ========== 通知画廊数据就绪 ==========
let _galleryReadyCallbacks = [];

function onGalleryReady(cb) {
    if (flatFolders.length > 0) {
        cb();
    } else {
        _galleryReadyCallbacks.push(cb);
    }
}

function notifyGalleryReady() {
    allPicData.folders = flatFolders;
    _galleryReadyCallbacks.forEach(cb => { try { cb(); } catch(e) {} });
    _galleryReadyCallbacks = [];
}

// ========== 文件浏览器导航 ==========
let browserCurrentPath = '';
let browserCurrentName = '';

function navigateTo(targetPath, targetName) {
    browserCurrentPath = targetPath === 'root' ? '' : targetPath;
    browserCurrentName = targetPath === 'root' ? '' : targetName;
    showPage('browser');
    renderFileBrowser();
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    let html = '<a href="#" onclick="navigateTo(\'root\',\'\');return false;">📁 pic</a>';
    if (browserCurrentPath) {
        html += '<span class="sep">›</span><span class="current">' + (browserCurrentName || browserCurrentPath.split('/').pop()) + '</span>';
    }
    bc.innerHTML = html;
}

function renderFileBrowser() {
    updateBreadcrumb();

    const grid = document.getElementById('fileGrid');
    if (!grid) return;
    grid.innerHTML = '';

    if (!browserCurrentPath) {
        flatFolders.forEach(folder => {
            const card = document.createElement('div');
            card.className = 'folder-card';
            card.onclick = () => navigateTo(folder.path, folder.name);
            card.innerHTML = `
                <span class="folder-emoji">${getFolderEmoji(folder.name)}</span>
                <div class="folder-name">${folder.name}</div>
                <div class="folder-count">${folder.count} 张图片</div>
            `;
            grid.appendChild(card);
        });
    } else {
        const folder = flatFolders.find(f => f.path === browserCurrentPath);

        if (folder && folder.files && folder.files.length > 0) {
            folder.files.forEach(fileName => {
                const card = document.createElement('div');
                card.className = 'img-card';
                card.onclick = e => {
                    e.stopPropagation();
                    openLightboxImg(`${PIC_BASE}${browserCurrentPath}/${fileName}`, `${browserCurrentName} / ${fileName}`);
                };
                card.innerHTML = `
                    <img src="${PIC_BASE}${browserCurrentPath}/${fileName}" alt="${fileName}" loading="lazy"
                         onerror="this.outerHTML='<div style=\\'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:16px;color:#bbb;font-size:13px;\\'>图片缺失</div>'">
                    <div class="img-name">${fileName}</div>
                `;
                grid.appendChild(card);
            });
        } else {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">该文件夹暂无内容</p>';
        }
    }
}

loadPicStructure();
