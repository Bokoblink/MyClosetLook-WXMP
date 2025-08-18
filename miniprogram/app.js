App({
  onLaunch() {
    wx.cloud.init({
      env: 'cloud1-8g6wp5bb59cb6c4c', // 确保这里填写正确
      traceUser: true,
    })
    // 🌟 临时添加的验证代码（测试完可删除）🌟
    const db = wx.cloud.database()
    const collections = ['clothes', 'outfit'] // 需要检查的集合
    
    collections.forEach(collection => {
      db.collection(collection).count()
        .then(res => {
          console.log(`${collection}集合存在，文档数:`, res.total)
        })
        .catch(err => {
          console.error(`${collection}集合不存在或查询失败:`, err)
          wx.showToast({
            title: `${collection}集合不存在`,
            icon: 'none'
          })
        })
    })

    //到这


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