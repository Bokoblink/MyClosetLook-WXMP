const config = require('./config.js');

App({
  onLaunch() {
    wx.cloud.init({
      env: config.env, // 从配置文件读取
      traceUser: true,
    });
  },
  globalData: {
    categories: ['上衣', '下裙', '配饰'],
    seasons: ['夏', '春秋', '冬'],
    sleeveTypes: ['弓袋袖', '飞机袖', '半袖', '比甲', '吊带'],
    collarTypes: ['方领', '圆领', '直领', '交领'],
    skirtTypes: ['马面', '百迭', '旋裙', '破裙', '其他'],
    accessoryTypes: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针']
  }
})