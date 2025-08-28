const db = wx.cloud.database();

Page({
  data: {
    name: "",
    outfitImage: "",
    season: "",
    seasons: ["夏", "春秋", "冬"],

    // --- 已选中的衣物 ---
    selectedTops: [],
    selectedSkirts: [],
    selectedAccessories: [],

    // --- 动态标签数据 ---
    allTags: [],

    // --- 选择弹窗相关 ---
    isSelectorShow: false,
    currentCategory: "",
    selectableClothes: [],
    loadingClothes: false,
    tempSelectedIds: new Set(),
    filterOptions: [],
    currentFilter: '全部',

    // --- 弹窗分页 ---
    selectorPage: 0,
    selectorHasMore: true,
  },

  onLoad() {
    this.loadTags();
  },

  async loadTags() {
    try {
      const res = await db.collection('tags').get();
      this.setData({ allTags: res.data });
    } catch (e) {
      console.error('加载标签失败', e);
      wx.showToast({ title: '标签加载失败', icon: 'none' });
    }
  },

  // --- 主页面逻辑 ---
  onInput(e) { this.setData({ name: e.detail.value }); },
  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },
  clearPicker(e) { this.setData({ [e.currentTarget.dataset.key]: "" }); },

  chooseOutfitImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => { this.setData({ outfitImage: res.tempFilePaths[0] }); } });
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
    const { allTags } = this.data;
    
    // 定义每个分类在弹窗中主要使用哪个字段来筛选
    const filterFieldMap = {
      '上衣': 'sleeveType',
      '下裙': 'skirtType',
      '配饰': 'accessoryType'
    };

    const mainFilterField = filterFieldMap[category];
    const tagData = allTags.find(t => t.field === mainFilterField);
    
    const filterOptions = tagData ? ['全部', ...tagData.options] : ['全部'];

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
    this.setData({ currentFilter: filter }, () => { this.loadSelectableClothes(); });
  },

  loadSelectableClothes(loadMore = false) {
    if (this.data.loadingClothes && !loadMore) return; // 防止重复加载

    if (!loadMore) {
      this.setData({ 
        selectorPage: 0,
        selectorHasMore: true,
        selectableClothes: [] 
      });
    }

    this.setData({ loadingClothes: true });

    const { currentCategory, currentFilter, selectorPage } = this.data;
    const PAGE_SIZE = 20;
    
    let query = db.collection('clothes').where({ category: currentCategory });

    if (currentFilter !== '全部') {
      const filterFieldMap = {
        '上衣': 'sleeveType',
        '下裙': 'skirtType',
        '配饰': 'accessoryType'
      };
      const filterKey = filterFieldMap[currentCategory];
      if(filterKey) {
        query = query.where({ [filterKey]: currentFilter });
      }
    }

    query.skip(selectorPage * PAGE_SIZE).limit(PAGE_SIZE).get().then(res => {
      const currentSelectedIds = this.getCurrentSelectedIds(currentCategory);
      const newClothes = res.data.map(item => ({ ...item, selected: currentSelectedIds.has(item._id) }));
      
      this.setData({ 
        selectableClothes: loadMore ? [...this.data.selectableClothes, ...newClothes] : newClothes,
        loadingClothes: false,
        selectorHasMore: newClothes.length === PAGE_SIZE,
        // tempSelectedIds 每次都应从当前已选中的真实数据中同步，而不是依赖旧的temp
        tempSelectedIds: new Set(currentSelectedIds) 
      });
    }).catch(err => {
      this.setData({ loadingClothes: false });
      console.error("加载可选衣物失败", err);
    });
  },

  loadMoreSelectableClothes() {
    if (this.data.loadingClothes || !this.data.selectorHasMore) return;
    this.setData({ 
      selectorPage: this.data.selectorPage + 1 
    }, () => {
      this.loadSelectableClothes(true);
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
    const allAvailableClothes = this.data[keyMap[currentCategory]].filter(item => !selectableClothes.some(s => s._id === item._id));
    const newSelection = [...selectableClothes].filter(item => tempSelectedIds.has(item._id));
    this.setData({ [keyMap[currentCategory]]: [...allAvailableClothes, ...newSelection], isSelectorShow: false });
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
        const uploadResult = await wx.cloud.uploadFile({ cloudPath: `outfits/${Date.now()}.png`, filePath: this.data.outfitImage });
        outfitImageUrl = uploadResult.fileID;
      } else if (this.data.selectedTops.length > 0) { // 优先用上衣
        outfitImageUrl = this.data.selectedTops[0].imageUrl;
      } else if (this.data.selectedSkirts.length > 0) { // 其次用下裙
        outfitImageUrl = this.data.selectedSkirts[0].imageUrl;
      }

      const clothesIds = [
        ...this.data.selectedTops.map(i => i._id),
        ...this.data.selectedSkirts.map(i => i._id),
        ...this.data.selectedAccessories.map(i => i._id)
      ];

      await db.collection('outfits').add({ data: { name: this.data.name, outfitImageUrl: outfitImageUrl, clothes: clothesIds, season: this.data.season, createdAt: db.serverDate() } });

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