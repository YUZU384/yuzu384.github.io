/**
 * 随机图片画廊模块（主页）
 * 
 * 功能说明：
 * - 从 pic/ 目录的真实图片中随机选取 6 张展示
 * - 支持异步数据加载（等待 index.json 加载完成）
 * - 点击图片可打开 Lightbox 大图预览
 * 
 * 依赖：
 * - CONFIG.picPath (来自 main.js)
 * - allPicData (来自 browser.js，通过 onGalleryReady 回调填充)
 * - openLightboxImg() (来自 main.js)
 * - onGalleryReady() (来自 browser.js)
 */

function initRandomGallery() {
    var grid = document.getElementById('randomGallery');
    if (!grid) return;

    /**
     * 渲染图片画廊
     * 从 allPicData.folders 中收集所有图片，随机选取 6 张展示
     */
    function render() {
        var allImages = [];

        // 遍历所有文件夹，收集图片信息
        allPicData.folders.forEach(function(folder) {
            if (!folder.files) return;
            folder.files.forEach(function(fileName) {
                allImages.push({
                    src: CONFIG.picPath + folder.path + '/' + fileName,
                    folder: folder.name,
                    fileName: fileName
                });
            });
        });

        // 空状态处理
        if (allImages.length === 0) {
            grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">暂无图片</p>';
            return;
        }

        // Fisher-Yates 洗牌算法随机选取 6 张
        var selected = shuffleArray(allImages).slice(0, 6);

        // 清空容器并渲染图片卡片
        grid.innerHTML = '';
        selected.forEach(function(img) {
            var item = document.createElement('div');
            item.className = 'gallery-item';
            item.onclick = function() {
                openLightboxImg(img.src, img.folder + ' / ' + img.fileName);
            };
            item.innerHTML = '<img src="' + img.src + '" alt="' + img.folder + '" loading="lazy">' +
                '<div class="overlay"><p>' + img.folder + '</p><small>点击查看大图</small></div>';
            grid.appendChild(item);
        });
    }

    // 数据就绪检测：如果已有数据立即渲染，否则注册回调等待
    if (allPicData.folders && allPicData.folders.length > 0) {
        render();
    } else {
        onGalleryReady(render);
    }
}

/**
 * Fisher-Yates 洗牌算法
 * 时间复杂度 O(n)，原地打乱数组顺序
 * @param {Array} array - 待打乱的数组
 * @returns {Array} 打乱后的数组（原数组的引用）
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
    return array;
}

// 页面加载时初始化画廊
initRandomGallery();
