const db = wx.cloud.database();

Page({
  data: {
    // --- Static Data ---
    categories: ["上衣", "下裙", "配饰"],
    seasons: ["夏", "春秋", "冬"],
    sleeveTypes: ["弓袋袖", "飞机袖", "半袖", "比甲", "吊带"],
    collarTypes: ['方领', '圆领', '直领', '交领'],
    skirtTypes: ['马面', '百迭', '旋裙', '破裙', '其他'],
    accessoryTypes: ['发簪', '禁步', '璎珞', '手链', '耳饰', '胸针'],

    // --- Form Data ---
    _id: null, // 文档ID
    image: "", // 图片路径，可以是云端fileID或本地临时路径
    originalImageUrl: "", // 原始图片路径，用于判断是否更换了图片
    name: "",
    category: "",
    season: "",
    remark: "",
    sleeveType: "",
    collarType: "",
    skirtType: "",
    accessoryType: "",
    sizes: {}
  },

  onLoad(options) {
    if (options.id) {
      this.loadClotheData(options.id);
    } else {
      wx.showToast({ title: '缺少衣物ID', icon: 'none' });
      wx.navigateBack();
    }
  },

  // 加载衣物数据并填充表单
  loadClotheData(id) {
    wx.showLoading({ title: '加载中...' });
    db.collection('clothes').doc(id).get().then(res => {
      const clothe = res.data;
      this.setData({
        _id: clothe._id,
        name: clothe.name,
        image: clothe.imageUrl, // 预览图设置为云存储地址
        originalImageUrl: clothe.imageUrl, // 保存原始图片地址
        category: clothe.category,
        season: clothe.season,
        remark: clothe.remark,
        sleeveType: clothe.sleeveType || "",
        collarType: clothe.collarType || "",
        skirtType: clothe.skirtType || "",
        accessoryType: clothe.accessoryType || "",
        sizes: clothe.sizes || {}
      });
      wx.hideLoading();
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '加载失败', icon: 'none' });
      console.error(err);
    });
  },

  // --- Event Handlers (与add页面相同) ---
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ image: res.tempFilePaths[0] });
      }
    });
  },

  onInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [key]: e.detail.value });
  },

  onCategoryChange(e) {
    this.setData({ category: this.data.categories[e.detail.value] });
  },

  onSeasonChange(e) {
    this.setData({ season: this.data.seasons[e.detail.value] });
  },

  onSleeveChange(e) {
    this.setData({ sleeveType: this.data.sleeveTypes[e.detail.value] });
  },

  onCollarChange(e) {
    this.setData({ collarType: this.data.collarTypes[e.detail.value] });
  },

  onSkirtTypeChange(e) {
    this.setData({ skirtType: this.data.skirtTypes[e.detail.value] });
  },

  onAccessoryTypeChange(e) {
    this.setData({ accessoryType: this.data.accessoryTypes[e.detail.value] });
  },

  onSizeInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`sizes.${key}`]: e.detail.value });
  },

  // --- Core Logic ---

  // 保存更新
  async saveClothe() {
    if (!this.data.name || !this.data.category) {
      wx.showToast({ title: "名称和分类为必填项", icon: "none" });
      return;
    }

    wx.showLoading({ title: '正在保存...' });

    let newImageUrl = this.data.originalImageUrl;

    try {
      // 1. 检查图片是否被修改
      if (this.data.image !== this.data.originalImageUrl) {
        // 上传新图片
        const cloudPath = `clothes/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
        const uploadResult = await wx.cloud.uploadFile({
          cloudPath,
          filePath: this.data.image,
        });
        newImageUrl = uploadResult.fileID;

        // 删除旧图片
        if (this.data.originalImageUrl) {
          wx.cloud.deleteFile({ fileList: [this.data.originalImageUrl] });
        }
      }

      // 2. 准备更新数据
      const dataToUpdate = {
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: newImageUrl,
        sleeveType: this.data.sleeveType,
        collarType: this.data.collarType,
        skirtType: this.data.skirtType,
        accessoryType: this.data.accessoryType,
        sizes: this.data.sizes
      };

      // 3. 更新数据库
      await db.collection('clothes').doc(this.data._id).update({
        data: dataToUpdate
      });

      wx.hideLoading();
      wx.showToast({ title: "更新成功" });

      // 4. 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '更新失败', icon: 'none' });
      console.error('更新失败', err);
    }
  }
});
