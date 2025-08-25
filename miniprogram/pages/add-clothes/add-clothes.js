const db = wx.cloud.database();

Page({
  data: {
    // --- Static Data ---
    categories: ["上衣", "下裙", "配饰"],
    seasons: ["夏", "春秋", "冬"],
    
    // --- Dynamic Data from DB ---
    allTags: [],

    // --- Form Data ---
    imageUrl: "",
    name: "",
    category: "",
    season: "",
    remark: "",
    attributes: {}, // 用于存储所有动态属性的键值对，如 { sleeveType: '飞机袖' }
    sizes: {}, // 存储所有尺寸信息 { '衣长': '70' }

    // --- Dynamic Picker & Input Options ---
    currentAttributePickers: [], 
    currentSizeFields: []      
  },

  onLoad() {
    this.loadTags();
  },

  async loadTags() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await db.collection('tags').get();
      this.setData({ allTags: res.data });
      wx.hideLoading();
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '标签加载失败', icon: 'none' });
    }
  },

  updateDynamicFields() {
    const { category, allTags } = this.data;
    if (!category) {
      this.setData({ currentAttributePickers: [], currentSizeFields: [] });
      return;
    }
    const attributePickers = allTags.filter(tag => tag.type === 'attribute' && tag.category.includes(category) && tag.field !== 'season');
    const sizeTag = allTags.find(tag => tag.type === 'size' && tag.category.includes(category));
    const sizeFields = sizeTag ? sizeTag.fields : [];
    this.setData({ currentAttributePickers: attributePickers, currentSizeFields: sizeFields });
  },

  // --- Event Handlers ---
  onInput(e) { this.setData({ [e.currentTarget.dataset.key]: e.detail.value }); },

  onCategoryChange(e) {
    const newCategory = this.data.categories[e.detail.value];
    this.setData({
      category: newCategory,
      attributes: {}, // 重置所有分类专属属性
      sizes: {}
    }, () => {
      this.updateDynamicFields();
    });
  },

  onSeasonChange(e) { this.setData({ season: this.data.seasons[e.detail.value] }); },

  onAttributeChange(e) {
    const { field, options } = e.currentTarget.dataset;
    const selectedOption = options[e.detail.value];
    this.setData({ [`attributes.${field}`]: selectedOption });
  },

  onSizeInput(e) {
    const { key } = e.currentTarget.dataset;
    this.setData({ [`sizes.${key}`]: e.detail.value });
  },

  clearPicker(e) { 
    const { key, field } = e.currentTarget.dataset;
    if (key === 'category') {
        this.setData({ category: "", currentAttributePickers: [], currentSizeFields: [] });
    } else if (key === 'season') {
        this.setData({ season: "" });
    } else {
        this.setData({ [`attributes.${field}`]: "" });
    }
  },

  chooseImage() {
    wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (res) => { this.setData({ imageUrl: res.tempFilePaths[0] }); } });
  },

  // --- Core Logic ---
  async saveClothe() {
    if (!this.data.imageUrl || !this.data.name || !this.data.category) {
      wx.showToast({ title: "图片、名称和分类为必填项", icon: "none" });
      return;
    }
    wx.showLoading({ title: '正在保存...' });
    try {
      const cloudPath = `clothes/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
      const uploadResult = await wx.cloud.uploadFile({ cloudPath, filePath: this.data.imageUrl });

      const dataToSave = {
        name: this.data.name,
        category: this.data.category,
        season: this.data.season,
        remark: this.data.remark,
        imageUrl: uploadResult.fileID,
        createdAt: db.serverDate(),
        sizes: this.data.sizes,
        ...this.data.attributes // 将所有动态属性展开存入
      };

      await db.collection('clothes').add({ data: dataToSave });
      wx.hideLoading();
      wx.showToast({ title: "保存成功" });
      setTimeout(() => wx.navigateBack(), 1500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      console.error('保存失败', err);
    }
  }
});