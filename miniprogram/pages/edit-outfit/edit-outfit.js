const db = wx.cloud.database();

Page({
  data: {
    _id: null,
    name: "",
    outfitImage: "",
    originalOutfitImageUrl: "",
    season: "",
    seasons: ["夏", "春秋", "冬"],

    // --- 动态标签数据 ---
    allTags: [],

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

  onLoad(options) {
    if (options.id) {
      this.loadTagsAndOutfit(options.id);
    } else {
      wx.showToast({ title: '缺少穿搭ID', icon: 'none' });
      wx.navigateBack();
    }
  },

  async loadTagsAndOutfit(id) {
    wx.showLoading({ title: '加载中...' });
    try {
      // 并行加载标签和穿搭数据
      const [tagsRes, outfitRes] = await Promise.all([
        db.collection('tags').get(),
        db.collection('outfits').doc(id).get()
      ]);

      const allTags = tagsRes.data;
      const outfit = outfitRes.data;

      if (!outfit || !outfit.clothes) {
        throw new Error('加载穿搭信息失败');
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
        allTags: allTags,
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

  // --- Event Handlers ---
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

  // --- 弹窗相关逻辑 (与add页面一致) ---
  openSelector(e) {
    const { category } = e.currentTarget.dataset;
    const { allTags } = this.data;
    const filterFieldMap = { '上衣': 'sleeveType', '下裙': 'skirtType', '配饰': 'accessoryType' };
    const mainFilterField = filterFieldMap[category];
    const tagData = allTags.find(t => t.field === mainFilterField);
    const filterOptions = tagData ? ['全部', ...tagData.options] : ['全部'];
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
        if (this.data.outfitImage) {
          const uploadResult = await wx.cloud.uploadFile({ cloudPath: `outfits/${Date.now()}.png`, filePath: this.data.outfitImage });
          newImageUrl = uploadResult.fileID;
        } else {
          newImageUrl = this.data.selectedTops.length > 0 ? this.data.selectedTops[0].imageUrl : (this.data.selectedSkirts.length > 0 ? this.data.selectedSkirts[0].imageUrl : "");
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
        data: { name: this.data.name, outfitImageUrl: newImageUrl, clothes: clothesIds, season: this.data.season }
      });

      wx.hideLoading();
      wx.showToast({ title: '更新成功' });
      setTimeout(() => { wx.navigateBack(); }, 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error(err);
    }
  }
});