const localStorage = require('../../utils/localStorage.js');

Page({
  data: {
    id: null,
    outfit: null,
    tops: [],
    skirts: [],
    accessories: []
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: options.id });
    } else {
      wx.showToast({ title: '缺少穿搭ID', icon: 'none' });
    }
  },

  onShow() {
    this.loadOutfitDetails();
  },

  async loadOutfitDetails() {
    if (!this.data.id) return;

    wx.showLoading({ title: '加载中...' });
    try {
      const allOutfits = localStorage.getOutfits();
      const outfit = allOutfits.find(o => o.id === this.data.id); // Find outfit by id

      if (!outfit) { // 如果穿搭未找到
        wx.hideLoading();
        wx.showToast({ title: '穿搭未找到', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 1500); // 提示后返回
        return;
      }
      if (!outfit.clothesIds || outfit.clothesIds.length === 0) { // 如果找到穿搭但没有衣物
        this.setData({ outfit, tops: [], skirts: [], accessories: [] });
        wx.hideLoading();
        return;
      }

      const allClothes = localStorage.getClothes();
      const clothesMap = new Map(allClothes.map(item => [item.id, item])); // Use item.id

      const tops = [], skirts = [], accessories = [];
      outfit.clothesIds.forEach(clotheId => { // Use outfit.clothesIds
        const clothe = clothesMap.get(clotheId);
        if (clothe) {
          if (clothe.category === '上衣') tops.push(clothe);
          if (clothe.category === '下裙') skirts.push(clothe);
          if (clothe.category === '配饰') accessories.push(clothe);
        }
      });

      this.setData({ outfit, tops, skirts, accessories });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error("加载穿搭详情失败", err);
    }
  },

  // 编辑穿搭
  editOutfit() {
    wx.navigateTo({ url: `../edit-outfit/edit-outfit?id=${this.data.id}` });
  },

  // 删除穿搭
  deleteOutfit() {
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，确定吗？',
      success: (res) => {
        if (res.confirm) this.performDelete();
      }
    });
  },

  async performDelete() {
    wx.showLoading({ title: '删除中...' });
    try {
      // 1. 从本地存储删除记录
      const deleteSuccess = localStorage.deleteOutfit(this.data.id);
      if (!deleteSuccess) {
        throw new Error('本地存储删除记录失败');
      }

      // 2. 从本地文件系统删除图片文件 (如果outfitImageUrl是本地文件路径)
      const imageUrl = this.data.outfit.outfitImageUrl;
      if (imageUrl && (imageUrl.startsWith('wxfile://') || imageUrl.startsWith('http://usr/'))) {
        try { // Add try-catch block for wx.removeSavedFile
          await new Promise((resolve, reject) => {
            wx.removeSavedFile({
              filePath: imageUrl,
              success: res => resolve(res),
              fail: err => reject(err)
            });
          });
        } catch (removeErr) {
          console.warn('删除旧本地文件失败 (不影响数据记录删除):', removeErr); // 警告但不中断
        }
      }
      wx.hideLoading();
      wx.showToast({ title: '删除成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
      console.error('删除失败', err);
    }
  }
});
