const db = wx.cloud.database();

Page({
  data: {
    clotheDetail: null,
    relatedOutfits: [],
    id: '',
    hasSizes: false, // ★ 新增一个标志位，判断有无尺寸信息
    sortedSizes: [] // ★ 新增一个数组，用来存放排序后的尺寸
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      this.setData({ id });
      this.loadClotheDetail(id);
      this.loadRelatedOutfits(id);
    } else {
      wx.showToast({ title: '缺少衣物ID', icon: 'none' });
    }
  },

  // 加载衣物详情
  loadClotheDetail(id) {
    db.collection('clothes').doc(id).get()
      .then(res => {
        const clothe = res.data;
        
        // --- 尺寸排序逻辑 ---
        const SIZE_ORDER = ['衣长', '胸围', '通袖', '领围', '袖口', '袖根', '裙长', '腰围', '裙门', '裙腰长', '摆围'];
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
      })
      .catch(err => {
        wx.showToast({ title: '加载失败', icon: 'none' });
        console.error('加载衣物详情失败', err);
      });
  },

  // 加载相关穿搭
  loadRelatedOutfits(clotheId) {
    // 假设穿搭(outfits)表中有一个叫 clothes 的数组字段，存储了衣物的ID
    db.collection('outfits').where({
      clothes: clotheId
    }).get()
      .then(res => {
        this.setData({ relatedOutfits: res.data });
      })
      .catch(err => {
        // 这里不提示失败，因为没有相关穿搭是正常情况
        console.error('加载相关穿搭失败', err);
      });
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
      // 1. 从数据库删除记录
      await db.collection('clothes').doc(id).remove();

      // 2. 从云存储删除图片文件
      if (clotheDetail.imageUrl) {
        await wx.cloud.deleteFile({
          fileList: [clotheDetail.imageUrl]
        });
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
