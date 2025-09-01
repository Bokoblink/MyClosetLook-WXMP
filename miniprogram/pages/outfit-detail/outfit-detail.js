const db = wx.cloud.database();

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
      const outfitRes = await db.collection('outfits').doc(this.data.id).get();
      const outfit = outfitRes.data;

      if (!outfit || !outfit.clothes || outfit.clothes.length === 0) {
        this.setData({ outfit, tops: [], skirts: [], accessories: [] });
        wx.hideLoading();
        return;
      }

      const clothesRes = await db.collection('clothes').where({ _id: db.command.in(outfit.clothes) }).get();
      const clothesMap = new Map(clothesRes.data.map(item => [item._id, item]));

      const tops = [], skirts = [], accessories = [];
      outfit.clothes.forEach(clotheId => {
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
      // 如果穿搭有主图，且是上传的图片（cloud://开头），并且路径确实是outfits/文件夹下的，才删除
      const imageUrl = this.data.outfit.outfitImageUrl;
      if (imageUrl && imageUrl.startsWith('cloud://') && imageUrl.includes('/outfits/')) {
        wx.cloud.deleteFile({ fileList: [imageUrl] });
      }
      // 从数据库删除记录
      await db.collection('outfits').doc(this.data.id).remove();
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
