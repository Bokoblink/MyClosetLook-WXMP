// pages/index/index.js
Page({
  data: {
    seasons: ['全部', '夏', '春秋', '冬'],
    activeSeason: '全部',
    outfits: [] // 穿搭列表数据
  },

  onLoad() {
    this.loadOutfits()
  },

  // 加载穿搭数据
  loadOutfits() {
    wx.showLoading({ title: '加载中...' })
    
    const db = wx.cloud.database()
    let query = db.collection('outfit')
    
    // 季节筛选
    if (this.data.activeSeason !== '全部') {
      query = query.where({ season: this.data.activeSeason })
    }

    query.get()
      .then(res => {
        this.setData({ outfits: res.data })
        wx.hideLoading()
      })
      .catch(err => {
        console.error('加载失败:', err)
        wx.hideLoading()
      })
  },

  // 切换季节
  changeSeason(e) {
    this.setData({
      activeSeason: e.currentTarget.dataset.season
    }, () => {
      this.loadOutfits()
    })
  },

  // 跳转添加穿搭页
  goToAddOutfit() {
    wx.navigateTo({ url: '/pages/add-outfit/add-outfit' })
  },

  // 查看穿搭详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/outfit-detail/outfit-detail?id=${id}`
    })
  }
})