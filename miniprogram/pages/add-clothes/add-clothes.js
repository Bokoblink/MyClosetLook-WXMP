// pages/add-clothes/add-clothes.js
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
    image: "", // 本地临时路径
    name: "",
    category: "",
    season: "",
    remark: "",

    // Category specific fields
    sleeveType: "",
    collarType: "",
    skirtType: "",
    accessoryType: "",
    sizes: {} // 存储所有尺寸信息
  },

  // --- Event Handlers ---

  // 上传图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        this.setData({ image: res.tempFilePaths[0] });
      }
    })
  },

  // --- Input & Picker Handlers ---
  onInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [key]: e.detail.value });
  },

  onCategoryChange(e) {
    this.setData({ 
      category: this.data.categories[e.detail.value],
      // 重置所有分类专属字段
      sleeveType: "",
      collarType: "",
      skirtType: "",
      accessoryType: "",
      sizes: {}
    });
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
    this.setData({
      [`sizes.${key}`]: e.detail.value
    });
  },

  // --- Core Logic ---

  // 保存
  async saveClothe() {
    // 1. Validate form
    if (!this.data.image || !this.data.name || !this.data.category) {
      wx.showToast({ title: "图片、名称和分类为必填项", icon: "none" });
      return;
    }

    wx.showLoading({ title: '正在保存...' });

    try {
      // 2. Upload image to cloud storage
      const cloudPath = `clothes/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath,
        filePath: this.data.image,
      });

      // 3. Prepare data for database
      const dataToSave = {
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: uploadResult.fileID, // 保存图片的 fileID
        createdAt: db.serverDate() // 保存创建时间
      };

      // Add category-specific fields
      switch (this.data.category) {
        case '上衣':
          dataToSave.sleeveType = this.data.sleeveType;
          dataToSave.collarType = this.data.collarType;
          dataToSave.sizes = this.data.sizes;
          break;
        case '下裙':
          dataToSave.skirtType = this.data.skirtType;
          dataToSave.sizes = this.data.sizes;
          break;
        case '配饰':
          dataToSave.accessoryType = this.data.accessoryType;
          break;
      }

      // 4. Add to database
      await db.collection('clothes').add({
        data: dataToSave
      });

      wx.hideLoading();
      wx.showToast({ title: "保存成功" });

      // 5. Navigate back after a short delay
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (err) {
      wx.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
      console.error('保存失败', err);
    }
  }
})
