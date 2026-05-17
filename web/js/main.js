const CONFIG = {
    githubUser: 'YUZU384',
    picPath: './pic/',
};

let allPicData = { folders: [] };

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlayBg').classList.toggle('active');
    document.querySelector('.menu-btn').classList.toggle('active');
}

function toggleSection(toggleId, listId) {
    document.getElementById(toggleId).classList.toggle('open');
    document.getElementById(listId).classList.toggle('open');
}

async function fetchRepos() {
    try {
        const resp = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?sort=updated&per_page=10`);
        const repos = await resp.json();
        const listEl = document.getElementById('projectList');
        if (!listEl) return;
        listEl.innerHTML = '';

        const filteredRepos = repos.filter(r => r.name !== CONFIG.githubUser);
        if (filteredRepos.length === 0) {
            listEl.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">暂无其他项目</p>';
            return;
        }

        filteredRepos.forEach(repo => {
            const item = document.createElement('div');
            item.className = 'project-item';
            item.onclick = () => window.open(repo.html_url, '_blank');

            const tagParts = [];
            if (repo.language) tagParts.push(`<span style="color:${getLangColor(repo.language)}">● ${repo.language}</span>`);
            if (repo.homepage && repo.has_pages) {
                tagParts.push(`<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="page-link">🌐 访问页面</a>`);
            } else if (repo.homepage) {
                tagParts.push(`<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="page-link">🔗 ${repo.homepage.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>`);
            }

            item.innerHTML = `
                <span class="icon">${getRepoIcon(repo.name)}</span>
                <div>
                    <div class="name">${repo.name}</div>
                    ${repo.description ? `<div class="desc">${repo.description}</div>` : ''}
                    ${tagParts.length > 0 ? `<div class="project-tags">${tagParts.join('<span class="tag-sep">·</span>')}</div>` : ''}
                </div>`;
            listEl.appendChild(item);
        });
    } catch (e) {
        console.error('[repos] 加载失败:', e);
        const listEl = document.getElementById('projectList');
        if (listEl) listEl.innerHTML = '<p style="padding:12px;color:#999;font-size:13px;">加载失败</p>';
    }
}

function getRepoIcon(name) {
    for (const [key, icon] of Object.entries({ 'NekoGirl': '🐱', 'Pointer': '🖱️', 'neko': '😺', 'winui': '🪟', 'craft': '🔨' })) {
        if (name.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return '📦';
}

function getLangColor(lang) {
    return ({ 'C#': '#178600', 'JavaScript': '#f1e05a', 'Python': '#3572A5', 'TypeScript': '#2b7489', 'HTML': '#e34c26', 'CSS': '#563d7c' })[lang] || '#666';
}

function openLightbox(el) {
    const img = el.querySelector('img');
    const overlay = el.querySelector('.overlay');
    openLightboxImg(img.src, overlay?.querySelector('p')?.textContent || '');
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

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });

fetchRepos();
