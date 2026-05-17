function getFolderEmoji(name) {
    for (const [key, emoji] of Object.entries({
        '常服': '👘', '和服': '👘', 'cosplay': '🎭', 'cos': '🎭',
        '绫波': '💙', '丽': '💜', '明日香': '❤️', '惣流': '💛',
        '孙尚香': '🏹', '尚香': '🏹',
        'lolita': '🎀', '洛丽塔': '🎀', 'jk': '🎓', '制服': '🎓',
        'swim': '🏊', '泳装': '🏊', 'bikini': '👙', '日常': '🌸',
        'casual': '🌸', '可爱': '💕', 'cute': '💕', '萌': '✨'
    })) {
        if (name.toLowerCase().includes(key.toLowerCase())) return emoji;
    }
    return '📁';
}

const PIC_BASE = CONFIG.picPath;
let folderTree = [];
let flatFolders = [];
let _readyCbs = [];

async function loadPicStructure() {
    const el = document.getElementById('galleryList');
    if (!el) return;
    el.innerHTML = '<div class="loading">正在扫描...</div>';

    let data = await loadFromIndexJSON();
    if (!data) data = await loadFromGitHubAPI();
    if (!data) data = getBuiltinData();

    buildTree(data);
    renderSidebarTree(el);
    notifyReady();
    console.log(`[pic] ✅ ${flatFolders.length} 个文件夹, ${flatFolders.reduce((s,f)=>s+f.count,0)} 张图片`);
}

async function loadFromIndexJSON() {
    try {
        const r = await fetch(`${PIC_BASE}index.json?t=${Date.now()}`);
        if (!r.ok) return null;
        return r.json();
    } catch { return null; }
}

async function loadFromGitHubAPI() {
    try {
        const owner = CONFIG.githubUser;
        const r = await fetch(`https://api.github.com/repos/${owner}/${owner}/contents/pic`);
        if (!r.ok) return null;
        const items = await r.json();
        if (!Array.isArray(items)) return null;

        const result = { folders: [] };
        for (const item of items) {
            if (item.type !== 'dir') continue;
            const subs = await fetchDir(owner, `pic/${item.name}`);
            const imgs = subs.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)).map(f => f.name);
            if (imgs.length) result.folders.push({ name: item.name, path: item.name, files: imgs, count: imgs.length });

            for (const dir of subs.filter(f => f.type === 'dir')) {
                const deep = await fetchDir(owner, `pic/${item.name}/${dir.name}`);
                const dimgs = deep.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name)).map(f => f.name);
                if (dimgs.length) result.folders.push({ name: `${item.name}/${dir.name}`, path: `${item.name}/${dir.name}`, files: dimgs, count: dimgs.length });
            }
        }
        return result;
    } catch { return null; }
}

async function fetchDir(owner, path) {
    try {
        const r = await fetch(`https://api.github.com/repos/${owner}/${CONFIG.githubUser}/contents/${path}`);
        return r.ok ? r.json() : [];
    } catch { return []; }
}

function getBuiltinData() {
    return { folders: [
        { name: '常服', path: '常服', files: ['1.jpg','2.jpg','3.jpg'] },
        { name: 'Cosplay / 绫波丽', path: 'cos/绫波丽', files: ['1.jpg','2.jpg','3.jpg','4.png','5.jpg','6.jpg'] },
        { name: 'Cosplay / 孙尚香', path: 'cos/孙尚香', files: ['ef67a31912e690eae07ece047802fc0a1.png'] }
    ]};
}

function buildTree(data) {
    folderTree = []; flatFolders = [];
    if (!data?.folders) return;

    const leaves = [];   // 叶子文件夹（如 常服）
    const parents = [];  // 父级文件夹（如 Cosplay）

    data.folders.forEach(f => {
        if (f.path.includes('/')) {
            // 有斜杠 → 一定是 cos 下的子文件夹
            flatFolders.push(f);
        } else {
            // 无斜坡 → 一级目录
            leaves.push(f);
        }
    });

    // 常服等叶子文件夹：直接作为侧栏项，排最前
    leaves.forEach(l => { folderTree.push(l); flatFolders.push(l); });

    // cos 下的子文件夹：归入 Cosplay 父级折叠
    const cosKids = flatFolders.filter(f => f.path.startsWith('cos/'));
    if (cosKids.length > 0) {
        parents.push({
            name: 'Cosplay', path: 'cos',
            children: cosKids, childCount: cosKids.length,
            files: [], count: 0
        });
    }

    // 其他可能的一级父级（预留扩展）
    const nonCosLeaves = leaves.filter(l => l.path !== '常服' && !cosKids.some(k => k.path.startsWith(l.path + '/')));
    // （目前不需要额外处理）

    parents.forEach(p => folderTree.push(p));
}

function renderSidebarTree(container) {
    container.innerHTML = '';
    if (!folderTree.length) { container.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">未找到图片</p>'; return; }

    folderTree.forEach(n => (n.children?.length ? renderParentItem : renderLeafItem)(container, n));
}

function renderParentItem(container, node) {
    const wrap = document.createElement('div'); wrap.className = 'sidebar-group';

    const btn = document.createElement('button');
    btn.className = 'section-toggle open';
    btn.innerHTML = `<span class="group-name"><span class="file-icon">${getFolderEmoji(node.name)}</span>${node.name}</span><span class="arrow">▶</span><span class="child-badge">${node.childCount}个角色</span>`;

    const list = document.createElement('div'); list.className = 'project-list open';
    node.children.forEach(child => {
        const it = document.createElement('div');
        it.className = 'file-item'; it.onclick = () => navigateTo(child.path, child.name);
        it.innerHTML = `<span class="file-icon">${getFolderEmoji(child.name)}</span><span class="file-name">${child.name}</span><span class="file-count">${child.count}张</span>`;
        list.appendChild(it);
    });

    btn.onclick = () => { btn.classList.toggle('open'); list.classList.toggle('open'); };
    wrap.appendChild(btn); wrap.appendChild(list); container.appendChild(wrap);
}

function renderLeafItem(container, node) {
    const it = document.createElement('div');
    it.className = 'file-item'; it.onclick = () => navigateTo(node.path, node.name);
    it.innerHTML = `<span class="file-icon">${getFolderEmoji(node.name)}</span><span class="file-name">${node.name}</span><span class="file-count">${node.count}张</span>`;
    container.appendChild(it);
}

function onGalleryReady(cb) { flatFolders.length > 0 ? cb() : _readyCbs.push(cb); }
function notifyReady() { allPicData.folders = flatFolders; _readyCbs.forEach(cb=>{try{cb()}catch(e){}}); _readyCbs=[]; }

let browserCurrentPath='', browserCurrentName='';
function navigateTo(path, name) { browserCurrentPath=path==='root'?'':path; browserCurrentName=name==='root'?'':name; showPage('browser'); renderFileBrowser(); }

function updateBreadcrumb() {
    const bc=document.getElementById('breadcrumb'); if(!bc)return;
    bc.innerHTML='<a href="#" onclick="navigateTo(\'root\',\'\');return false;">📁 pic</a>'
        +(browserCurrentPath?'<span class="sep">›</span><span class="current">'+(browserCurrentName||browserCurrentPath.split('/').pop())+'</span>':'');
}

function renderFileBrowser() {
    updateBreadcrumb();
    const grid=document.getElementById('fileGrid'); if(!grid)return; grid.innerHTML='';

    if(!browserCurrentPath){
        flatFolders.forEach(f=>{
            const c=document.createElement('div'); c.className='folder-card'; c.onclick=()=>navigateTo(f.path,f.name);
            c.innerHTML=`<span class="folder-emoji">${getFolderEmoji(f.name)}</span><div class="folder-name">${f.name}</div><div class="folder-count">${f.count}张图片</div>`;
            grid.appendChild(c);
        });
    }else{
        const f=flatFolders.find(x=>x.path===browserCurrentPath);
        if(f?.files?.length){
            f.files.forEach(fn=>{
                const c=document.createElement('div'); c.className='img-card';
                c.onclick=e=>{e.stopPropagation();openLightboxImg(`${PIC_BASE}${browserCurrentPath}/${fn}`,`${browserCurrentName}/${fn}`);};
                c.innerHTML=`<img src="${PIC_BASE}${browserCurrentPath}/${fn}" alt="${fn}" loading="lazy" onerror="this.outerHTML='<div style=\'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f5f5f5;border-radius:16px;color:#bbb;\'>缺失</div>'"><div class="img-name">${fn}</div>`;
                grid.appendChild(c);
            });
        }else{grid.innerHTML='<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无内容</p>';}
    }
}

loadPicStructure();
