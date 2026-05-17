// ========== 随机图片画廊（主页）==========
// 从 pic/ 真实图片中随机选 6 张展示

function initRandomGallery() {
    const grid = document.getElementById('randomGallery');
    if (!grid) return;

    function render() {
        const allImages = [];

        allPicData.folders.forEach(folder => {
            if (!folder.files) return;
            folder.files.forEach(fileName => {
                allImages.push({
                    src: `${CONFIG.picPath}${folder.path}/${fileName}`,
                    folder: folder.name,
                    fileName: fileName
                });
            });
        });

        if (allImages.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无图片，请在 pic/ 文件夹中添加照片</p>';
            return;
        }

        const selected = shuffleArray([...allImages]).slice(0, 6);

        selected.forEach(img => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.onclick = () => openLightboxImg(img.src, `${img.folder} / ${img.fileName}`);
            item.innerHTML = `
                <img src="${img.src}" alt="${img.folder}" loading="lazy">
                <div class="overlay">
                    <p>${img.folder}</p>
                    <small>点击查看大图</small>
                </div>
            `;
            grid.appendChild(item);
        });
    }

    if (allPicData.folders.length > 0) {
        render();
    } else {
        onGalleryReady(render);
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

initRandomGallery();
