const db = wx.cloud.database();
const PAGE_SIZE = 15; // 衣橱页每页加载数量

Page({
  data: {
    activeCategory: '上衣',
    showFilterModal: false,
    currentFilterType: '',
    currentFilterName: '',
    availableFilters: [],

    allTags: [],
    filterOptions: {},
    filterNames: {},

    selectedFilters: {
      season: [],
      sleeveType: [],
      collarType: [],
      skirtType: [],
      accessoryType: []
    },

    clothesList: [],

    // --- 分页加载所需数据 ---
    page: 0,
    hasMore: true,
    isLoading: false,
  },

  onShow() {
    // 每次进入页面时，检查标签是否有更新，并重新加载衣物
    this.loadTagsAndInitClothes();
  },

  onPullDownRefresh() {
    this.initLoad();
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadClothes(true);
    }
  },

  async loadTagsAndInitClothes() {
    if (this.data.allTags.length > 1) { // >1 because season is now hardcoded
      this.initLoad();
      return;
    }
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await db.collection('tags').get();
      let allTags = res.data;

      // 手动注入 season 标签，确保它始终可用
      const seasonTag = {
        _id: 'season-hardcoded',
        name: '季节',
        field: 'season',
        type: 'attribute',
        options: ['夏', '春秋', '冬'],
        category: ['上衣', '下裙', '配饰']
      };
      allTags.push(seasonTag);

      const filterOptions = {};
      const filterNames = {};
      allTags.forEach(tag => {
        if (tag.type === 'attribute') {
          filterOptions[tag.field] = tag.options;
          filterNames[tag.field] = tag.name;
        }
      });

      // 直接修改数据源，确保显示正确
      if (filterNames.skirtType) filterNames.skirtType = '类型';
      if (filterNames.accessoryType) filterNames.accessoryType = '类型';

      this.setData({ allTags, filterOptions, filterNames }, () => {
        this.initLoad();
      });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载标签数据失败', err);
    }
  },

  initLoad() {
    this.setData({ page: 0, hasMore: true, clothesList: [] }, () => {
      this.updateAvailableFilters();
      this.loadClothes();
    });
  },

  updateAvailableFilters() {
    const { activeCategory, allTags } = this.data;
    // 筛选出当前分类下的专属tag，并确保tag.field有效
    const categorySpecificFields = allTags
      .filter(tag => tag && tag.field && tag.category && tag.category.includes(activeCategory))
      .map(tag => tag.field);

    // 确保 season 始终存在，并合并去重
    const available = [...new Set(['season', ...categorySpecificFields])];
    this.setData({ availableFilters: available });
  },

  changeCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({ activeCategory: category, selectedFilters: { season: [], sleeveType: [], collarType: [], skirtType: [], accessoryType: [] } }, () => {
      this.initLoad();
    });
  },

  showFilter(e) {
    const type = e.currentTarget.dataset.type;
    let filterName = this.data.filterNames[type] || '';
    // 如果是下裙或配饰类型，统一显示为“类型”
    if (type === 'skirtType' || type === 'accessoryType') {
      filterName = '类型';
    }
    this.setData({ showFilterModal: true, currentFilterType: type, currentFilterName: filterName });
  },

  closeFilter() {
    this.setData({ showFilterModal: false, currentFilterType: '', currentFilterName: '' });
  },

  toggleFilterOption(e) {
    const value = e.currentTarget.dataset.value;
    const type = this.data.currentFilterType;
    let selected = this.data.selectedFilters[type] ? [...this.data.selectedFilters[type]] : [];
    if (selected.includes(value)) {
      selected = selected.filter(v => v !== value);
    } else {
      selected.push(value);
    }
    this.setData({ [`selectedFilters.${type}`]: selected });
  },

  confirmFilter() {
    this.setData({ showFilterModal: false });
    this.initLoad(); // 确认筛选后，重新加载
  },

  resetFilter() {
    const { currentFilterType } = this.data;
    if (!currentFilterType) return;
    this.setData({ [`selectedFilters.${currentFilterType}`]: [] });
  },

  async loadClothes(isLoadMore = false) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    try {
      let query = db.collection('clothes').where({ category: this.data.activeCategory });
      const filters = this.data.selectedFilters;
      Object.keys(filters).forEach(key => {
        if (filters[key] && filters[key].length > 0) {
          query = query.where({ [key]: db.command.in(filters[key]) });
        }
      });

      const currentPage = isLoadMore ? this.data.page + 1 : 0;
      const res = await query.orderBy('createdAt', 'desc').skip(currentPage * PAGE_SIZE).limit(PAGE_SIZE).get();
      const newClothes = res.data;

      this.setData({
        clothesList: isLoadMore ? [...this.data.clothesList, ...newClothes] : newClothes,
        page: currentPage,
        hasMore: newClothes.length === PAGE_SIZE,
        isLoading: false
      });
    } catch (err) {
      this.setData({ isLoading: false });
      console.error('加载衣物列表失败', err);
    } finally {
      wx.stopPullDownRefresh();
    }
  },

  goToAddClothes() {
    wx.navigateTo({ url: '/pages/add-clothes/add-clothes' });
  }
});
