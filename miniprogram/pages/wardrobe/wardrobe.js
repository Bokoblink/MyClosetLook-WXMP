// pages/wardrobe/wardrobe.js
Page({
  data: {
    activeCategory: '上衣',
    showFilterModal: false, // 控制筛选弹窗显示
    currentFilterType: '', // 当前正在操作的筛选类型
    filterOptions: {
      season: ['夏', '春秋', '冬'],
      sleeveType: ['弓袋袖', '飞机袖', '半袖', '比甲', '吊带'],
      collarType: ['方领', '圆领', '直领', '交领'],
      skirtType: ['马面', '百迭', '旋裙', '破裙', '其他'],
      accessoryType: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针']
    },
    selectedFilters: {
      season: [],
      sleeveType: [],
      collarType: [],
      skirtType: [],
      accessoryType: []
    },
    clothesList: []
  },
  stopPropagation() {
    // 这个空方法只是为了阻止事件冒泡
    // 不需要写任何内容
  },

  // 显示筛选弹窗
  showFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      showFilterModal: true,
      currentFilterType: type
    })
  },

  // 多选切换
  toggleFilterOption(e) {
    const { type, value } = e.currentTarget.dataset
    const selected = this.data.selectedFilters[type]
    const index = selected.indexOf(value)
    
    if (index === -1) {
      selected.push(value)
    } else {
      selected.splice(index, 1)
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

  // 重置筛选
  resetFilter() {
    const resetFilters = {
      season: [],
      sleeveType: [],
      collarType: [],
      skirtType: [],
      accessoryType: []
    }
    this.setData({
      selectedFilters: resetFilters,
      showFilterModal: false
    }, () => {
      this.loadClothes()
    })
  },

  // 加载衣物数据（改造后）
  loadClothes() {
    const db = wx.cloud.database()
    let query = db.collection('clothes').where({
      category: this.data.activeCategory
    })

    // 动态添加筛选条件
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
  }
})