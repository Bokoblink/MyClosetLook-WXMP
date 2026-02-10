const localStorage = require('../../utils/localStorage.js');
const PAGE_SIZE = 10; // 定义每页加载的数量

Page({
  data: {
    seasons: ['全部', '夏', '春秋', '冬'],
    activeSeason: '全部',
    outfits: [], // 穿搭列表数据

    // --- 分页加载所需数据 ---
    page: 0,
    hasMore: true,
    isLoading: false,
  },

  onShow() {
    // onShow时，重新从第一页开始加载，以保证数据最新
    this.initLoad();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.initLoad();
  },

  // 触底加载更多
  onReachBottom() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.loadOutfits(true); // true表示加载更多
    }
  },

  // 初始化加载，用于首次加载或筛选条件变化
  initLoad() {
    this.setData({
      page: 0,
      hasMore: true,
      outfits: []
    }, () => {
      this.loadOutfits();
    });
  },

  // 加载穿搭数据（支持分页）
  async loadOutfits(isLoadMore = false) {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true });

    wx.showLoading({ title: '加载中...', mask: true });

    try {
      let allOutfits = localStorage.getOutfits();
      let filteredOutfits = allOutfits;

      if (this.data.activeSeason !== '全部') {
        filteredOutfits = allOutfits.filter(outfit => outfit.season === this.data.activeSeason);
      }

      // Sort by createdAt in descending order
      filteredOutfits.sort((a, b) => b.createdAt - a.createdAt);

      const currentPage = isLoadMore ? this.data.page + 1 : 0;
      const startIndex = currentPage * PAGE_SIZE;
      const endIndex = startIndex + PAGE_SIZE;
      const newOutfits = filteredOutfits.slice(startIndex, endIndex);

      this.setData({
        outfits: isLoadMore ? [...this.data.outfits, ...newOutfits] : newOutfits,
        page: currentPage,
        hasMore: newOutfits.length === PAGE_SIZE,
        isLoading: false
      });

    } catch (err) {
      console.error('加载失败:', err);
      this.setData({ isLoading: false });
    } finally {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    }
  },

  // 切换季节
  changeSeason(e) {
    this.setData({
      activeSeason: e.currentTarget.dataset.season
    }, () => {
      this.initLoad(); // 改变筛选条件后，重新加载
    });
  },

  // 跳转添加穿搭页
  goToAddOutfit() {
    wx.navigateTo({ url: '/pages/add-outfit/add-outfit' });
  },

  // 查看穿搭详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/outfit-detail/outfit-detail?id=${id}` });
  }
});
