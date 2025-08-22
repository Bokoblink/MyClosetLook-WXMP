const db = wx.cloud.database();

Page({
  data: {
    name: "",
    outfitImage: "",
    season: "",
    seasons: ["夏", "春秋", "冬"],

    // --- 静态类型数据 ---
    sleeveTypes: ["弓袋袖", "飞机袖", "半袖", "比甲", "吊带"],
    skirtTypes: ['马面', '百迭', '旋裙', '破裙', '其他'],
    accessoryTypes: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针'],

    // --- 已选中的衣物 ---
    selectedTops: [],
    selectedSkirts: [],
    selectedAccessories: [],

    // --- 选择弹窗相关 ---
    isSelectorShow: false,
    currentCategory: "",
    selectableClothes: [],
    loadingClothes: false,
    tempSelectedIds: new Set(),
    filterOptions: [],
    currentFilter: '全部'
  },

  // --- 主页面逻辑 ---
  onInput(e) { this.setData({ name: e.detail.value }); },
  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },
  chooseOutfitImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      success: (res) => { this.setData({ outfitImage: res.tempFilePaths[0] }); }
    });
  },
  removeSelectedItem(e) {
    const { id, category } = e.currentTarget.dataset;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const newSelection = this.data[keyMap[category]].filter(item => item._id !== id);
    this.setData({ [keyMap[category]]: newSelection });
  },

  // --- 弹窗相关逻辑 ---
  openSelector(e) {
    const { category } = e.currentTarget.dataset;
    let filterOptions = ['全部'];
    if (category === '上衣') filterOptions.push(...this.data.sleeveTypes);
    if (category === '下裙') filterOptions.push(...this.data.skirtTypes);
    if (category === '配饰') filterOptions.push(...this.data.accessoryTypes);

    this.setData({ 
      currentCategory: category,
      isSelectorShow: true,
      currentFilter: '全部',
      filterOptions: filterOptions
    });
    this.loadSelectableClothes();
  },

  onFilterTap(e) {
    const { filter } = e.currentTarget.dataset;
    this.setData({ currentFilter: filter }, () => {
      this.loadSelectableClothes();
    });
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
      this.setData({ 
        selectableClothes: clothes,
        loadingClothes: false,
        tempSelectedIds: new Set(currentSelectedIds)
      });
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
  async saveOutfit() {
    if (!this.data.name) {
      wx.showToast({ title: '请给穿搭起个名字', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '保存中...' });
    try {
      let outfitImageUrl = "";
      if (this.data.outfitImage) {
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath: `outfits/${Date.now()}.png`,
          filePath: this.data.outfitImage
        });
        outfitImageUrl = uploadResult.fileID;
      } else if (this.data.selectedSkirts.length > 0) {
        outfitImageUrl = this.data.selectedSkirts[0].imageUrl;
      }

      const clothesIds = [
        ...this.data.selectedTops.map(i => i._id),
        ...this.data.selectedSkirts.map(i => i._id),
        ...this.data.selectedAccessories.map(i => i._id)
      ];

      await db.collection('outfits').add({
        data: {
          name: this.data.name,
          outfitImageUrl: outfitImageUrl,
          clothes: clothesIds,
          season: this.data.season,
          createdAt: db.serverDate()
        }
      });

      wx.hideLoading();
      wx.showToast({ title: '保存成功' });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
      console.error(err);
    }
  }
});
