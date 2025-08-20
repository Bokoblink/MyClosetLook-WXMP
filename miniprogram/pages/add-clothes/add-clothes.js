// pages/add-clothes/add-clothes.js
Page({
  data: {
    image: "",
    name: "",
    categories: ["上衣", "下裙", "配饰"],
    category: "",
    seasons: ["夏", "春秋", "冬"],
    season: "",
    sleeve: "",
    collar: "",
    size: "",
    type: "",
    length: "",
    remark: "",
    sleeveTypes: ["弓袋袖", "飞机袖", "半袖", "比甲", "吊带"],
    collarTypes: ['方领', '圆领', '直领', '交领'],
    skirtTypes: ['马面', '百迭', '旋裙', '破裙', '其他'],
    accessoryTypes: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针']
  },

  // 上传图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      success: (res) => {
        this.setData({ image: res.tempFilePaths[0] });
      }
    })
  },

  // 输入绑定
  onInputName(e) { this.setData({ name: e.detail.value }) },
  onCategoryChange(e) { this.setData({ category: this.data.categories[e.detail.value] }) },
  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }) },
  onInputSleeve(e) { this.setData({ sleeve: e.detail.value }) },
  onInputCollar(e) { this.setData({ collar: e.detail.value }) },
  onInputSize(e) { this.setData({ size: e.detail.value }) },
  onInputType(e) { this.setData({ type: e.detail.value }) },
  onInputLength(e) { this.setData({ length: e.detail.value }) },
  onInputRemark(e) { this.setData({ remark: e.detail.value }) },

  // 保存
  saveClothe() {
    if (!this.data.image) {
      wx.showToast({ title: "请上传图片", icon: "none" });
      return;
    }
    if (!this.data.name) {
      wx.showToast({ title: "请输入衣物名称", icon: "none" });
      return;
    }
    if (!this.data.category) {
      wx.showToast({ title: "请选择分类", icon: "none" });
      return;
    }

    const clothes = wx.getStorageSync("clothes") || [];
    clothes.push(this.data);
    wx.setStorageSync("clothes", clothes);

    wx.showToast({ title: "保存成功" });
    wx.navigateBack();
  }
})
