const localStorage = require('../../utils/localStorage.js');

Page({
  data: {
    clotheDetail: null,
    relatedOutfits: [],
    id: '',
    hasSizes: false, // 标志位，判断有无尺寸信息
    sortedSizes: [] // 存放排序后的尺寸
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ id }, () => {
        this.refreshData(); // 使用回调确保id设置后再刷新
      });
    } else {
      wx.showToast({ title: '缺少衣物ID', icon: 'none' });
    }
  },

  onShow() {
    this.refreshData();
  },

  // 统一的数据刷新方法
  refreshData() {
    if (this.data.id) {
      this.loadClotheDetail(this.data.id);
      this.loadRelatedOutfits(this.data.id);
    }
  },

  // 加载衣物详情
  loadClotheDetail(id) {
    try {
      const allClothes = localStorage.getClothes();
      const clothe = allClothes.find(item => item.id === id);

      if (!clothe) {
        wx.showToast({ title: '衣物未找到', icon: 'none' });
        // Optionally navigate back or handle "not found" state
        return;
      }
        // --- 尺寸排序逻辑 ---
        const SIZE_ORDER = ['尺码', '衣长', '胸围', '通袖', '领围', '袖口', '袖根', '裙长', '腰围', '裙门', '裙腰长', '摆围'];
        const sizes = clothe.sizes || {};
        const sortedSizes = [];
        SIZE_ORDER.forEach(key => {
          if (sizes[key]) {
            sortedSizes.push({ key: key, value: sizes[key] });
          }
        });
        // --- 排序逻辑结束 ---

        this.setData({ 
          clotheDetail: clothe,
          hasSizes: sortedSizes.length > 0, // 更新hasSizes的判断逻辑
          sortedSizes: sortedSizes
        });
    } catch (err) { // 添加这个 catch 块
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error('加载衣物详情失败', err);
    }
  },

  // 加载相关穿搭
  loadRelatedOutfits(clotheId) {
    try {
      // 假设穿搭(outfits)表中有一个叫 clothesIds 的数组字段，存储了衣物的ID
      const allOutfits = localStorage.getOutfits();
      const relatedOutfits = allOutfits.filter(outfit => 
        outfit.clothesIds && outfit.clothesIds.includes(clotheId)
      );
      this.setData({ relatedOutfits: relatedOutfits });
    } catch (err) {
      console.error('加载相关穿搭失败', err);
    }
  },

  // 编辑衣物
  editClothe() {
    wx.navigateTo({
      url: `../edit-clothes/edit-clothes?id=${this.data.id}`,
    });
  },

  // 删除衣物
  deleteClothe() {
    wx.showModal({
      title: '确认删除',
      content: '删除后将无法恢复，包含此衣物的穿搭也会受影响，确定吗？',
      success: (res) => {
        if (res.confirm) {
          this.performDelete();
        }
      }
    });
  },

  async performDelete() {
    wx.showLoading({ title: '删除中...' });
    const { id, clotheDetail } = this.data;

    try {
      // 1. 从本地存储删除记录
      const deleteSuccess = localStorage.deleteClothes(id);
      if (!deleteSuccess) {
        throw new Error('本地存储删除记录失败');
      }

      // 2. 从本地文件系统删除图片文件 (如果imageUrl是本地文件路径)
      if (clotheDetail.imageUrl && (clotheDetail.imageUrl.startsWith('wxfile://') || clotheDetail.imageUrl.startsWith('http://usr/'))) {
        try { // Add try-catch block for wx.removeSavedFile
          await new Promise((resolve, reject) => {
            wx.removeSavedFile({
              filePath: clotheDetail.imageUrl,
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

      // 3. 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '删除失败', icon: 'none' });
      console.error('删除失败', err);
    }
  }
});
