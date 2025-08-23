const db = wx.cloud.database();

Page({
  data: {
    _id: null,
    name: "",
    outfitImage: "",
    originalOutfitImageUrl: "",
    season: "",
    seasons: ["夏", "春秋", "冬"],
    sleeveTypes: ["弓袋袖", "飞机袖", "半袖", "比甲", "吊带"],
    skirtTypes: ['马面', '百迭', '旋裙', '破裙', '其他'],
    accessoryTypes: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针'],
    selectedTops: [],
    selectedSkirts: [],
    selectedAccessories: [],
    isSelectorShow: false,
    currentCategory: "",
    selectableClothes: [],
    loadingClothes: false,
    tempSelectedIds: new Set(),
    filterOptions: [],
    currentFilter: '全部'
  },

  onLoad(options) {
    if (options.id) {
      this.loadOutfitData(options.id);
    } else {
      wx.showToast({ title: '缺少穿搭ID', icon: 'none' });
      wx.navigateBack();
    }
  },

  async loadOutfitData(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      const outfitRes = await db.collection('outfits').doc(id).get();
      const outfit = outfitRes.data;

      if (!outfit || !outfit.clothes) {
        wx.hideLoading();
        wx.showToast({ title: '加载穿搭失败', icon: 'none' });
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

      this.setData({
        _id: outfit._id,
        name: outfit.name,
        season: outfit.season,
        outfitImage: outfit.outfitImageUrl,
        originalOutfitImageUrl: outfit.outfitImageUrl,
        selectedTops: tops,
        selectedSkirts: skirts,
        selectedAccessories: accessories
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '加载数据失败', icon: 'none' });
      console.error(err);
    }
  },

  // --- Event Handlers (与add页面相同) ---
  onInput(e) { this.setData({ name: e.detail.value }); },
  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },
  chooseOutfitImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => { this.setData({ outfitImage: res.tempFilePaths[0] }); } });
  },
  removeSelectedItem(e) {
    const { id, category } = e.currentTarget.dataset;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const newSelection = this.data[keyMap[category]].filter(item => item._id !== id);
    this.setData({ [keyMap[category]]: newSelection });
  },
  openSelector(e) {
    const { category } = e.currentTarget.dataset;
    let filterOptions = ['全部'];
    if (category === '上衣') filterOptions.push(...this.data.sleeveTypes);
    if (category === '下裙') filterOptions.push(...this.data.skirtTypes);
    if (category === '配饰') filterOptions.push(...this.data.accessoryTypes);
    this.setData({ currentCategory: category, isSelectorShow: true, currentFilter: '全部', filterOptions });
    this.loadSelectableClothes();
  },
  onFilterTap(e) {
    this.setData({ currentFilter: e.currentTarget.dataset.filter }, () => { this.loadSelectableClothes(); });
  },
  loadSelectableClothes() {
    this.setData({ loadingClothes: true, selectableClothes: [] });
    const { currentCategory, currentFilter } = this.data;
    let query = db.collection('clothes').where({ category: currentCategory });
    if (currentFilter !== '全部') {
      const filterKeyMap = { '上衣': 'sleeveType', '下裙': 'skirtType', '配饰': 'accessoryType' };
      query = query.where({ [filterKeyMap[currentCategory]]: currentFilter });
    }
    query.get().then(res => {
      const currentSelectedIds = this.getCurrentSelectedIds(currentCategory);
      const clothes = res.data.map(item => ({ ...item, selected: currentSelectedIds.has(item._id) }));
      this.setData({ selectableClothes: clothes, loadingClothes: false, tempSelectedIds: new Set(currentSelectedIds) });
    });
  },
  getCurrentSelectedIds(category) {
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    return new Set(this.data[keyMap[category]].map(item => item._id));
  },
  toggleClothSelection(e) {
    const { id } = e.currentTarget.dataset;
    const { selectableClothes, tempSelectedIds } = this.data;
    if (tempSelectedIds.has(id)) tempSelectedIds.delete(id); else tempSelectedIds.add(id);
    const newSelectableClothes = selectableClothes.map(item => ({ ...item, selected: tempSelectedIds.has(item._id) }));
    this.setData({ selectableClothes: newSelectableClothes, tempSelectedIds });
  },
  closeSelector() {
    const { currentCategory, tempSelectedIds, selectableClothes } = this.data;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const finalSelection = [...selectableClothes].filter(item => tempSelectedIds.has(item._id));
    this.setData({ [keyMap[currentCategory]]: finalSelection, isSelectorShow: false });
  },

  // --- 保存逻辑 ---
  async updateOutfit() {
    if (!this.data.name) {
      wx.showToast({ title: '请给穿搭起个名字', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '更新中...' });
    try {
      let newImageUrl = this.data.originalOutfitImageUrl;
      if (this.data.outfitImage !== this.data.originalOutfitImageUrl) {
        if (this.data.outfitImage) { // 如果有新图片
          const uploadResult = await wx.cloud.uploadFile({ cloudPath: `outfits/${Date.now()}.png`, filePath: this.data.outfitImage });
          newImageUrl = uploadResult.fileID;
        } else { // 如果新图片为空
          newImageUrl = this.data.selectedSkirts.length > 0 ? this.data.selectedSkirts[0].imageUrl : "";
        }
        if (this.data.originalOutfitImageUrl && this.data.originalOutfitImageUrl.startsWith('cloud://')) {
          wx.cloud.deleteFile({ fileList: [this.data.originalOutfitImageUrl] });
        }
      }

      const clothesIds = [
        ...this.data.selectedTops.map(i => i._id),
        ...this.data.selectedSkirts.map(i => i._id),
        ...this.data.selectedAccessories.map(i => i._id)
      ];

      await db.collection('outfits').doc(this.data._id).update({
        data: {
          name: this.data.name,
          outfitImageUrl: newImageUrl,
          clothes: clothesIds,
          season: this.data.season
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '更新成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error(err);
    }
  }
});
