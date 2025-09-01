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
    tempSelectedIds: [],
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
    const filterFieldMap = { '上衣': 'sleeveType', '下裙': 'skirtType', '配饰': 'accessoryType' };
    const mainFilterField = filterFieldMap[category];
    const tagData = allTags.find(t => t.field === mainFilterField);
    const filterOptions = tagData ? ['全部', ...tagData.options] : ['全部'];

    // 从当前已选中的衣物ID初始化数组，以保留顺序
    const currentSelectedIds = this.getCurrentSelectedIds(category);

    this.setData({ 
      currentCategory: category,
      isSelectorShow: true,
      currentFilter: '全部',
      filterOptions: filterOptions,
      tempSelectedIds: [...currentSelectedIds] // 初始化为数组
    }, () => {
      this.loadSelectableClothes();
    });
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

    const { currentCategory, currentFilter, selectorPage, tempSelectedIds } = this.data;
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
      const newClothes = res.data.map(item => ({ ...item, selected: tempSelectedIds.includes(item._id) }));
      
      this.setData({ 
        selectableClothes: loadMore ? [...this.data.selectableClothes, ...newClothes] : newClothes,
        loadingClothes: false,
        selectorHasMore: newClothes.length === PAGE_SIZE,
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
    return this.data[keyMap[category]].map(item => item._id);
  },

  toggleClothSelection(e) {
    const { id } = e.currentTarget.dataset;
    const { selectableClothes } = this.data;
    let tempSelectedIds = [...this.data.tempSelectedIds]; // 复制数组
    const index = tempSelectedIds.indexOf(id);

    if (index > -1) {
      tempSelectedIds.splice(index, 1); // 存在则移除
    } else {
      tempSelectedIds.push(id); // 不存在则添加
    }

    // 更新列表中的选中状态
    const newSelectableClothes = selectableClothes.map(item => ({
      ...item,
      selected: tempSelectedIds.includes(item._id)
    }));

    this.setData({ 
      selectableClothes: newSelectableClothes, 
      tempSelectedIds: tempSelectedIds 
    });
  },

  closeSelector() {
    const { currentCategory, tempSelectedIds } = this.data;
    const keyMap = { '上衣': 'selectedTops', '下裙': 'selectedSkirts', '配饰': 'selectedAccessories' };
    const categoryKey = keyMap[currentCategory];

    // 1. 获取当前分类下所有已选中的衣物对象
    const allSelectedForCategory = this.data[categoryKey];
    
    // 2. 找出所有衣物对象，以便按ID查找
    const allClothesMap = new Map();
    this.data.selectableClothes.forEach(c => allClothesMap.set(c._id, c));
    allSelectedForCategory.forEach(c => allClothesMap.set(c._id, c));

    // 3. 根据tempSelectedIds的顺序，生成最终的对象数组
    const finalItems = tempSelectedIds.map(id => allClothesMap.get(id)).filter(Boolean);

    this.setData({ 
      [categoryKey]: finalItems, 
      isSelectorShow: false 
    });
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
      }

      // 决定备用图
      let fallbackImageUrl = "";
      if (this.data.selectedSkirts.length > 0) {
        fallbackImageUrl = this.data.selectedSkirts[0].imageUrl;
      } else if (this.data.selectedTops.length > 0) {
        fallbackImageUrl = this.data.selectedTops[0].imageUrl;
      }

      const clothesIds = [
        ...this.data.selectedTops.map(i => i._id),
        ...this.data.selectedSkirts.map(i => i._id),
        ...this.data.selectedAccessories.map(i => i._id)
      ];

      await db.collection('outfits').add({ data: { name: this.data.name, outfitImageUrl: outfitImageUrl, fallbackImageUrl: fallbackImageUrl, clothes: clothesIds, season: this.data.season, createdAt: db.serverDate() } });

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