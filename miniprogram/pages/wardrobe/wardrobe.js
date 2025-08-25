// pages/wardrobe/wardrobe.js
const db = wx.cloud.database();

Page({
  data: {
    activeCategory: '上衣',
    showFilterModal: false,
    currentFilterType: '',
    currentFilterName: '',
    availableFilters: ['season', 'sleeveType', 'collarType'],

    // --- Dynamic Data ---
    allTags: [], // 存储从数据库加载的所有标签定义
    filterOptions: {}, // 动态生成的筛选选项
    filterNames: {}, // 动态生成的筛选中文名

    // 用户已选择的筛选条件
    selectedFilters: {
      season: [],
      sleeveType: [],
      collarType: [],
      skirtType: [],
      accessoryType: []
    },

    clothesList: []
  },

  onShow() {
    this.loadTagsAndClothes();
  },

  // 1. 加载标签数据，然后加载衣物
  async loadTagsAndClothes() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await db.collection('tags').get();
      const allTags = res.data;
      
      // 2. 根据标签数据，动态构建筛选器选项和名称
      const filterOptions = {};
      const filterNames = {};
      allTags.forEach(tag => {
        if (tag.type === 'attribute') {
          filterOptions[tag.field] = tag.options;
          filterNames[tag.field] = tag.name;
        }
      });

      this.setData({
        allTags,
        filterOptions,
        filterNames
      }, () => {
        // 3. 确保标签加载和处理完毕后，再执行后续操作
        this.updateAvailableFilters();
        this.loadClothes();
      });

      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      console.error('加载标签数据失败', err);
    }
  },

  // 4. 根据当前分类，更新可用的筛选器类型
  updateAvailableFilters() {
    const { activeCategory, allTags } = this.data;
    const available = allTags
      .filter(tag => tag.category.includes(activeCategory))
      .map(tag => tag.field);
    
    this.setData({ availableFilters: available });
  },

  // 切换分类
  changeCategory(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      activeCategory: category,
      selectedFilters: { // 重置筛选
        season: [],
        sleeveType: [],
        collarType: [],
        skirtType: [],
        accessoryType: []
      }
    }, () => {
      this.updateAvailableFilters();
      this.loadClothes();
    });
  },

  // 打开筛选弹窗
  showFilter(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      showFilterModal: true,
      currentFilterType: type,
      currentFilterName: this.data.filterNames[type] || '' // 5. 从动态数据中获取中文名
    });
  },

  // 关闭筛选弹窗
  closeFilter() {
    this.setData({ showFilterModal: false, currentFilterType: '', currentFilterName: '' });
  },

  // 多选切换
  toggleFilterOption(e) {
    const value = e.currentTarget.dataset.value;
    const type = this.data.currentFilterType;
    let selected = [...this.data.selectedFilters[type]];

    if (selected.includes(value)) {
      selected = selected.filter(v => v !== value);
    } else {
      selected.push(value);
    }

    this.setData({ [`selectedFilters.${type}`]: selected });
  },

  // 确认筛选
  confirmFilter() {
    this.setData({ showFilterModal: false });
    this.loadClothes();
  },

  // 重置当前筛选
  resetFilter() {
    const { currentFilterType } = this.data;
    if (!currentFilterType) return;
    this.setData({ [`selectedFilters.${currentFilterType}`]: [] });
  },

  // 加载衣物数据
  loadClothes() {
    let query = db.collection('clothes').where({
      category: this.data.activeCategory
    });

    const filters = this.data.selectedFilters;
    Object.keys(filters).forEach(key => {
      if (filters[key] && filters[key].length > 0) {
        query = query.where({
          [key]: db.command.in(filters[key])
        });
      }
    });

    query.get().then(res => {
      this.setData({ clothesList: res.data });
    }).catch(err => {
      console.error('加载衣物列表失败', err);
    });
  },

  // 跳转到添加衣物页面
  goToAddClothes() {
    wx.navigateTo({ url: '/pages/add-clothes/add-clothes' });
  }
});