// pages/wardrobe/wardrobe.js
Page({
  data: {
    activeCategory: '上衣',
    showFilterModal: false,   // ✅ 控制筛选弹窗显示
    currentFilterType: '',    // ✅ 当前正在操作的筛选类型
    currentFilterName: '',    // ✅ 中文名
    availableFilters: ['season', 'sleeveType', 'collarType'], // 当前分类可用的筛选

    // ✅ 各筛选类型的选项
    filterOptions: {
      season: ['夏', '春秋', '冬'],
      sleeveType: ['弓袋袖', '飞机袖', '半袖', '比甲', '吊带'],
      collarType: ['方领', '圆领', '直领', '交领'],
      skirtType: ['马面', '百迭', '旋裙', '破裙', '其他'],
      accessoryType: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针']
    },

    // ✅ 用户已选择的筛选条件
    selectedFilters: {
      season: [],
      sleeveType: [],
      collarType: [],
      skirtType: [],
      accessoryType: []
    },

    clothesList: []
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.getFilterOptions();
    this.loadClothes();
  },

  // 根据分类更新可用筛选
  getFilterOptions() {
    const { activeCategory } = this.data
    let options = []
    
    if (activeCategory === '上衣') {
      options = ['season', 'sleeveType', 'collarType']
    } else if (activeCategory === '下裙') {
      options = ['season', 'skirtType'] 
    } else {
      options = ['season', 'accessoryType']
    }
    
    this.setData({ availableFilters: options })
  },

  // 切换分类
  changeCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      activeCategory: category,
      selectedFilters: { // ✅ 重置筛选
        season: [],
        sleeveType: [],
        collarType: [],
        skirtType: [],
        accessoryType: []
      }
    }, () => {
      this.loadClothes()
      this.getFilterOptions()
    })
  },

  // 打开筛选弹窗
  showFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      showFilterModal: true,
      currentFilterType: type,
      currentFilterName: this.getFilterName(type)
    })
  },

  // 关闭筛选弹窗
  closeFilter() {
    this.setData({
      showFilterModal: false,
      currentFilterType: '',
      currentFilterName: ''
    })
  },

  // 多选切换
  toggleFilterOption(e) {
    const value = e.currentTarget.dataset.value
    const type = this.data.currentFilterType
    let selected = [...this.data.selectedFilters[type]]

    if (selected.includes(value)) {
      selected = selected.filter(v => v !== value)
    } else {
      selected.push(value)
    }

    this.setData({
      [`selectedFilters.${type}`]: selected
    })
  },

  // 确认筛选
  confirmFilter() {
    this.setData({ showFilterModal: false })
    this.loadClothes()
  },

  // 重置当前筛选
  resetFilter() {
    const { currentFilterType } = this.data;
    if (!currentFilterType) return;

    this.setData({
      [`selectedFilters.${currentFilterType}`]: [],
    });
  },

  // 加载衣物数据
  loadClothes() {
    const db = wx.cloud.database()
    let query = db.collection('clothes').where({
      category: this.data.activeCategory
    })

    const filters = this.data.selectedFilters
    Object.keys(filters).forEach(key => {
      if (filters[key].length > 0) {
        query = query.where({
          [key]: db.command.in(filters[key])
        })
      }
    })

    query.get().then(res => {
      this.setData({ clothesList: res.data })
    })
  },

  // ✅ 获取筛选项中文名
  getFilterName(type) {
    const map = {
      season: '季节',
      sleeveType: '袖型',
      collarType: '领型',
      skirtType: '类型',
      accessoryType: '类型'
    }
    return map[type] || ''
  },

  // 跳转到添加衣物页面
  goToAddClothes() {
    wx.navigateTo({
      url: '/pages/add-clothes/add-clothes',
    })
  }
})
