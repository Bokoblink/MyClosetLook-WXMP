const localStorage = require('../../utils/localStorage.js');

Page({
  data: {
    clothesJsonInput: '',
    outfitsJsonInput: '',
    tagsJsonInput: '',
    statusMessage: '',
    statusIsError: false,
    _idToIdMap: {}, // 用于存储导入的衣物原始 _id 到新的本地 id 的映射
  },

  onClothesJsonInput(e) { this.setData({ clothesJsonInput: e.detail.value, statusMessage: '', statusIsError: false }); },
  onOutfitsJsonInput(e) { this.setData({ outfitsJsonInput: e.detail.value, statusMessage: '', statusIsError: false }); },
  onTagsJsonInput(e) { this.setData({ tagsJsonInput: e.detail.value, statusMessage: '', statusIsError: false }); },

  clearAllInputs() {
    this.setData({
      clothesJsonInput: '',
      outfitsJsonInput: '',
      tagsJsonInput: '',
      statusMessage: '输入已清空',
      statusIsError: false,
    });
  },

  async importClothes() {
    const jsonString = this.data.clothesJsonInput;
    if (!jsonString) {
      this.showStatus('请粘贴衣物 JSON 数据', true);
      return;
    }
    await this._importData('clothes', jsonString);
  },

  async importOutfits() {
    const jsonString = this.data.outfitsJsonInput;
    if (!jsonString) {
      this.showStatus('请粘贴穿搭 JSON 数据', true);
      return;
    }
    await this._importData('outfits', jsonString);
  },

  async importTags() {
    const jsonString = this.data.tagsJsonInput;
    if (!jsonString) {
      this.showStatus('请粘贴标签 JSON 数据', true);
      return;
    }
    await this._importData('tags', jsonString);
  },

  async _importData(type, jsonString) {
    this.showStatus('正在导入中...');
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data)) {
        this.showStatus('JSON 数据必须是数组', true);
        return;
      }

      let successCount = 0;
      let failedCount = 0;
      let totalToImport = data.length;

      // Temporary map to store original _id to new local id for clothes
      let current_idToIdMap = { ...this.data._idToIdMap }; // Copy existing map

      // If importing clothes, update the map
      if (type === 'clothes') {
        data.forEach(item => {
          // Assuming item.id is already set from item._id during initial processing in loop
          if (item._id && item.id) { 
            current_idToIdMap[item._id] = item.id;
          }
        });
        this.setData({ _idToIdMap: current_idToIdMap }); // Update map in page data
      }

      for (let i = 0; i < data.length; i++) {
        let item = data[i];
        try {
          // Cloud data might have _id, local storage uses id
          if (item._id) {
            item.id = item._id;
            delete item._id;
          }

          // Handle image migration for clothes and outfits
          if ((type === 'clothes' || type === 'outfits') && item.imageUrl && item.imageUrl.startsWith('cloud://')) {
            const newImageUrl = await this._downloadAndSaveImage(item.imageUrl);
            item.imageUrl = newImageUrl;
          } else if (type === 'outfits' && item.outfitImageUrl && item.outfitImageUrl.startsWith('cloud://')) {
            const newOutfitImageUrl = await this._downloadAndSaveImage(item.outfitImageUrl);
            item.outfitImageUrl = newOutfitImageUrl;
          } else if (type === 'outfits' && item.fallbackImageUrl && item.fallbackImageUrl.startsWith('cloud://')) {
            const newFallbackImageUrl = await this._downloadAndSaveImage(item.fallbackImageUrl);
            item.fallbackImageUrl = newFallbackImageUrl;
          }
          // Convert 'clothes' field to 'clothesIds' for outfits
          if (type === 'outfits' && item.clothes) {
            // Map original _id in item.clothes to new local id using _idToIdMap
            item.clothesIds = item.clothes.map(original_clothe_id => {
              return current_idToIdMap[original_clothe_id] || original_clothe_id; // Use mapped id, or original if not found (fallback)
            }).filter(Boolean); // Remove any null/undefined from mapping failures
            delete item.clothes;
          }


          // Add to local storage
          if (type === 'clothes') {
            localStorage.addClothes(item);
          } else if (type === 'outfits') {
            localStorage.addOutfit(item);
          } else if (type === 'tags') {
            localStorage.addTag(item);
          }
          successCount++;
        } catch (itemErr) {
          console.error(`导入 ${type} 失败:`, item, itemErr);
          failedCount++;
        }
      }
      this.showStatus(`导入完成：成功 ${successCount} 条，失败 ${failedCount} 条。`);
    } catch (err) {
      console.error('导入数据失败:', err);
      this.showStatus(`导入数据失败: ${err.message}`, true);
    }
  },

  async _downloadAndSaveImage(cloudFilePath) {
    try {
      const res = await wx.cloud.downloadFile({
        fileID: cloudFilePath,
      });
      const savedFilePath = await new Promise((resolve, reject) => {
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: saveRes => resolve(saveRes.savedFilePath),
          fail: saveErr => reject(saveErr)
        });
      });
      return savedFilePath;
    } catch (err) {
      console.error('图片下载或保存失败:', cloudFilePath, err);
      return ''; // 返回空字符串或默认图片路径
    }
  },

  showStatus(message, isError = false) {
    this.setData({ statusMessage: message, statusIsError: isError });
  },

  async testDownloadSpecificImage() {
    wx.showLoading({ title: '测试下载中...' });
    // 请将此处替换为您实际出错的 cloud:// 格式文件ID
    const specificCloudFileID = 'cloud://cloud1-8g6wp5bb59cb6c4c.636c-cloud1-8g6wp5bb59cb6c4c-1373973237/clothes/1755935594524-794.png'; 
    try {
      const res = await wx.cloud.downloadFile({
        fileID: specificCloudFileID,
      });
      console.log('测试下载成功:', res);
      const savedFilePath = await new Promise((resolve, reject) => {
        wx.saveFile({
          tempFilePath: res.tempFilePath,
          success: saveRes => resolve(saveRes.savedFilePath),
          fail: saveErr => reject(saveErr)
        });
      });
      console.log('测试保存成功:', savedFilePath);
      this.showStatus(`测试下载与保存成功：${savedFilePath}`);
    } catch (err) {
      console.error('测试下载或保存失败:', err);
      this.showStatus(`测试下载或保存失败：${err.errMsg || err.message}`, true);
    } finally {
      wx.hideLoading();
    }
  },
});
