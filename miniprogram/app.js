const config = require('./config.js');

App({
  onLaunch() {
    wx.cloud.init({
      env: config.env, // 从配置文件读取
      traceUser: true,
    });
  },
  globalData: {}
})