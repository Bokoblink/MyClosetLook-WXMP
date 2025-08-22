const db = wx.cloud.database();

Page({
  data: {
    outfit: null,
    tops: [],
    skirts: [],
    accessories: []
  },

  onLoad(options) {
    if (options.id) {
      this.loadOutfitDetails(options.id);
    } else {
      wx.showToast({ title: '缺少穿搭ID', icon: 'none' });
    }
  },

  async loadOutfitDetails(id) {
    wx.showLoading({ title: '加载中...' });

    try {
      // 1. 获取穿搭文档
      const outfitRes = await db.collection('outfits').doc(id).get();
      const outfit = outfitRes.data;

      if (!outfit || !outfit.clothes || outfit.clothes.length === 0) {
        this.setData({ outfit });
        wx.hideLoading();
        return;
      }

      // 2. 根据衣物ID列表，获取所有衣物的详情
      const clothesRes = await db.collection('clothes').where({
        _id: db.command.in(outfit.clothes)
      }).get();
      
      const clothesMap = new Map(clothesRes.data.map(item => [item._id, item]));

      // 3. 按原始ID顺序，将衣物分组
      const tops = [];
      const skirts = [];
      const accessories = [];

      outfit.clothes.forEach(clotheId => {
        const clothe = clothesMap.get(clotheId);
        if (clothe) {
          if (clothe.category === '上衣') tops.push(clothe);
          if (clothe.category === '下裙') skirts.push(clothe);
          if (clothe.category === '配饰') accessories.push(clothe);
        }
      });

      // 4. 更新页面数据
      this.setData({
        outfit,
        tops,
        skirts,
        accessories
      });

      wx.hideLoading();

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error("加载穿搭详情失败", err);
    }
  }
});
