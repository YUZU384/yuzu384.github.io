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
    const listEl = document.getElementById('projectList');
    if (!listEl) return;

    try {
        const resp = await fetch(`https://api.github.com/users/${CONFIG.githubUser}/repos?sort=updated&per_page=10`);

        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}`);
        }

        const repos = await resp.json();

        if (!Array.isArray(repos)) {
            throw new Error('Invalid response format');
        }

        listEl.innerHTML = '';

        const filteredRepos = repos.filter(r => r.name !== CONFIG.githubUser);
        if (filteredRepos.length === 0) {
            renderFallbackProjects(listEl);
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
        renderFallbackProjects(listEl);
    }
}

function getFallbackProjects() {
    return [
        {
            name: 'YUZU384',
            html_url: `https://github.com/${CONFIG.githubUser}`,
            description: '个人主页项目',
            language: 'JavaScript',
            homepage: '',
            has_pages: true
        }
    ];
}

function renderFallbackProjects(listEl) {
    listEl.innerHTML = '';
    const fallbackRepos = getFallbackProjects();

    fallbackRepos.forEach(repo => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.onclick = () => window.open(repo.html_url, '_blank');

        const tagParts = [];
        if (repo.language) tagParts.push(`<span style="color:${getLangColor(repo.language)}">● ${repo.language}</span>`);
        if (repo.homepage && repo.has_pages) {
            tagParts.push(`<a href="${repo.homepage}" target="_blank" onclick="event.stopPropagation();" class="page-link">🌐 访问页面</a>`);
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
