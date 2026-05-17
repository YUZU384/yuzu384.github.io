// ========== 配置 ==========
const CONFIG = {
    githubUser: 'YUZU384',
    picPath: '../pic/',
};

// ========== 全局状态 ==========
let currentPath = ['root'];
let allPicData = { folders: [], files: [] };

// ========== 页面切换系统 ==========
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ========== 侧边栏控制 ==========
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlayBg').classList.toggle('active');
    document.querySelector('.menu-btn').classList.toggle('active');
}

function toggleSection(toggleId, listId) {
    document.getElementById(toggleId).classList.toggle('open');
    document.getElementById(listId).classList.toggle('open');
}

// ========== GitHub API 获取仓库列表 ==========
async function fetchRepos() {
    try {
        const response = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?sort=updated&per_page=10`);
        const repos = await response.json();

        const filteredRepos = repos.filter(r => r.name !== CONFIG.githubUser);
        const listEl = document.getElementById('projectList');
        if (!listEl) return;
        listEl.innerHTML = '';

        if (filteredRepos.length === 0) {
            listEl.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">暂无其他项目</p>';
            return;
        }

        filteredRepos.forEach(repo => {
            const icon = getRepoIcon(repo.name);
            const item = document.createElement('div');
            item.className = 'project-item';
            item.onclick = () => window.open(repo.html_url, '_blank');

            let html = `
                <span class="icon">${icon}</span>
                <div>
                    <div class="name">${repo.name}</div>
                    ${repo.description ? `<div class="desc">${repo.description}</div>` : ''}
            `;

            let tagsHtml = '';

            // 语言标签 + GitHub Pages 链接 横向同级摆放
            const tagParts = [];
            if (repo.language) {
                tagParts.push(`<span style="color:${getLangColor(repo.language)}">● ${repo.language}</span>`);
            }
            if (repo.homepage && repo.has_pages) {
                tagParts.push(`<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="page-link">🌐 访问页面</a>`);
            } else if (repo.homepage) {
                tagParts.push(`<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="page-link">🔗 ${repo.homepage.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>`);
            }

            if (tagParts.length > 0) {
                tagsHtml = `<div class="project-tags">${tagParts.join('<span class="tag-sep">·</span>')}</div>`;
            }

            html += `${tagsHtml}</div>`;
            item.innerHTML = html;
            listEl.appendChild(item);
        });
    } catch (error) {
        console.error('获取仓库失败:', error);
        const listEl = document.getElementById('projectList');
        if (listEl) listEl.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">加载失败，请刷新重试</p>';
    }
}

function getRepoIcon(name) {
    const icons = { 'NekoGirl': '🐱', 'Pointer': '🖱️', 'neko': '😺', 'winui': '🪟', 'craft': '🔨' };
    for (const [key, icon] of Object.entries(icons)) {
        if (name.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return '📦';
}

function getLangColor(lang) {
    const colors = { 'C#': '#178600', 'JavaScript': '#f1e05a', 'Python': '#3572A5', 'TypeScript': '#2b7489', 'HTML': '#e34c26', 'CSS': '#563d7c' };
    return colors[lang] || '#666';
}

// ========== Lightbox 图片预览 ==========
function openLightbox(el) {
    const img = el.querySelector('img');
    const overlay = el.querySelector('.overlay');
    openLightboxImg(img.src, overlay ? overlay.querySelector('p')?.textContent : '');
}

function openLightboxImg(src, info) {
    document.getElementById('lightboxImg').src = src;
    document.getElementById('lightboxInfo').textContent = info || '';
    document.getElementById('lightbox').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    document.getElementById('lightbox').classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
});

// ========== 初始化公共功能 ==========
fetchRepos();
